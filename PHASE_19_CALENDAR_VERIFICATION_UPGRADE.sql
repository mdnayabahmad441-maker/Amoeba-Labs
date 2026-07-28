-- Groenics Phase 19: Calendar verification and lifecycle hardening
-- Run after CALENDAR_APPOINTMENTS_UPGRADE.sql and PHASE_18_BUSINESS_SETTINGS_CLEANUP_UPGRADE.sql.

BEGIN;

-- Keep recurrence intentionally simple. Existing yearly metadata is retained as
-- a one-time event rather than silently generating unexpected appointments.
UPDATE calendar_events
SET recurrence_frequency = NULL, recurrence_until = NULL
WHERE recurrence_frequency = 'Yearly';

ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_recurrence_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_recurrence_check
  CHECK (recurrence_frequency IS NULL OR recurrence_frequency IN ('Daily','Weekly','Monthly'));

UPDATE calendar_events
SET cancellation_reason = 'Cancelled before cancellation reasons were required.'
WHERE status = 'Cancelled' AND NULLIF(trim(cancellation_reason), '') IS NULL;

ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_cancel_reason_required;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_cancel_reason_required
  CHECK (status <> 'Cancelled' OR NULLIF(trim(cancellation_reason), '') IS NOT NULL);

CREATE OR REPLACE FUNCTION public.refresh_calendar_event_series(target_event UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  parent calendar_events%ROWTYPE;
  next_start TIMESTAMPTZ;
  next_end TIMESTAMPTZ;
  duration INTERVAL;
  generated INTEGER := 0;
  examined INTEGER := 0;
  child_id UUID;
BEGIN
  SELECT * INTO parent
  FROM calendar_events
  WHERE id = target_event AND public.has_venture_access(venture_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Calendar event was not found or access was denied.';
  END IF;

  -- Preserve completed history, but rebuild future scheduled occurrences.
  DELETE FROM calendar_events
  WHERE parent_event_id = target_event
    AND status IN ('Scheduled', 'Confirmed')
    AND start_at >= NOW();

  IF parent.recurrence_frequency IS NULL OR parent.recurrence_until IS NULL THEN
    RETURN 0;
  END IF;

  duration := parent.end_at - parent.start_at;
  next_start := parent.start_at;

  LOOP
    next_start := CASE parent.recurrence_frequency
      WHEN 'Daily' THEN next_start + make_interval(days => parent.recurrence_interval)
      WHEN 'Weekly' THEN next_start + make_interval(days => 7 * parent.recurrence_interval)
      WHEN 'Monthly' THEN next_start + make_interval(months => parent.recurrence_interval)
    END;
    examined := examined + 1;
    EXIT WHEN next_start::DATE > parent.recurrence_until OR generated >= 120 OR examined >= 240;
    next_end := next_start + duration;

    IF next_start < NOW() THEN
      CONTINUE;
    END IF;

    INSERT INTO calendar_events (
      venture_id, title, event_type, description, start_at, end_at, timezone,
      all_day, location, meeting_link, status, priority, assigned_employee_id,
      related_lead_id, related_client_id, related_project_id, recurrence_interval,
      parent_event_id, google_sync_status
    ) VALUES (
      parent.venture_id, parent.title, parent.event_type, parent.description,
      next_start, next_end, parent.timezone, parent.all_day, parent.location,
      parent.meeting_link, 'Scheduled', parent.priority, parent.assigned_employee_id,
      parent.related_lead_id, parent.related_client_id, parent.related_project_id,
      1, parent.id, 'Not connected'
    ) RETURNING id INTO child_id;

    INSERT INTO calendar_event_attendees (
      event_id, name, email, employee_id, response_status
    )
    SELECT child_id, name, email, employee_id, 'Pending'
    FROM calendar_event_attendees WHERE event_id = parent.id;

    INSERT INTO calendar_event_reminders (event_id, minutes_before, channel, status)
    SELECT child_id, minutes_before, channel, 'Pending'
    FROM calendar_event_reminders WHERE event_id = parent.id;

    generated := generated + 1;
  END LOOP;

  RETURN generated;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_calendar_event_series(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_calendar_event_series(UUID) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_calendar_events_parent_start
  ON calendar_events(parent_event_id, start_at)
  WHERE parent_event_id IS NOT NULL;

COMMIT;
