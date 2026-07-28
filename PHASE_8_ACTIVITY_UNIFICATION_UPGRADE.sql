-- Groenics Phase 8: Activities, Next Actions, Tasks, Follow-ups and Events
-- Run after SECURITY_AND_DATA_PROTECTION_UPGRADE.sql,
-- NEXT_ACTION_ENGINE_UPGRADE.sql and CALENDAR_APPOINTMENTS_UPGRADE.sql.
-- Safe to run repeatedly. Back up the database before every production migration.

ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id UUID;

CREATE INDEX IF NOT EXISTS idx_activity_logs_lead
  ON activity_logs(venture_id, related_lead_id, created_at DESC)
  WHERE related_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_client
  ON activity_logs(venture_id, related_client_id, created_at DESC)
  WHERE related_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_project
  ON activity_logs(venture_id, related_project_id, created_at DESC)
  WHERE related_project_id IS NOT NULL;
DROP INDEX IF EXISTS idx_activity_logs_source_action;

-- Make existing direct record activities visible in unified timelines.
UPDATE activity_logs SET related_lead_id = record_id
WHERE record_type = 'Lead' AND related_lead_id IS NULL
  AND EXISTS (SELECT 1 FROM leads WHERE leads.id = activity_logs.record_id);
UPDATE activity_logs SET related_client_id = record_id
WHERE record_type = 'Client' AND related_client_id IS NULL
  AND EXISTS (SELECT 1 FROM clients WHERE clients.id = activity_logs.record_id);
UPDATE activity_logs SET related_project_id = record_id
WHERE record_type = 'Project' AND related_project_id IS NULL
  AND EXISTS (SELECT 1 FROM projects WHERE projects.id = activity_logs.record_id);

CREATE OR REPLACE FUNCTION log_primary_next_action_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  entity_type TEXT := CASE WHEN TG_TABLE_NAME = 'leads' THEN 'Lead' ELSE 'Client' END;
  entity_name TEXT;
BEGIN
  IF OLD.next_action_at IS NOT DISTINCT FROM NEW.next_action_at
     AND OLD.next_action_type IS NOT DISTINCT FROM NEW.next_action_type THEN
    RETURN NEW;
  END IF;

  entity_name := CASE WHEN TG_TABLE_NAME = 'leads' THEN NEW.client_name ELSE NEW.client_name END;

  -- Clearing the action is logged by the explicit completion workflow, not as a
  -- reschedule. This avoids treating ordinary edits as completed interactions.
  IF NEW.next_action_at IS NOT NULL THEN
    INSERT INTO activity_logs (
      venture_id, record_type, record_id, action, details,
      related_lead_id, related_client_id, source_type, source_id
    ) VALUES (
      NEW.venture_id, entity_type, NEW.id,
      CASE WHEN OLD.next_action_at IS NULL THEN 'next_action_scheduled' ELSE 'next_action_rescheduled' END,
      jsonb_build_object(
        'record_name', entity_name,
        'action_type', NEW.next_action_type,
        'previous_due_at', OLD.next_action_at,
        'due_at', NEW.next_action_at
      ),
      CASE WHEN TG_TABLE_NAME = 'leads' THEN NEW.id ELSE NULL END,
      CASE WHEN TG_TABLE_NAME = 'clients' THEN NEW.id ELSE NULL END,
      TG_TABLE_NAME || '_next_action',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_log_primary_next_action ON leads;
CREATE TRIGGER leads_log_primary_next_action
AFTER UPDATE OF next_action_at, next_action_type ON leads
FOR EACH ROW EXECUTE FUNCTION log_primary_next_action_change();

DROP TRIGGER IF EXISTS clients_log_primary_next_action ON clients;
CREATE TRIGGER clients_log_primary_next_action
AFTER UPDATE OF next_action_at, next_action_type ON clients
FOR EACH ROW EXECUTE FUNCTION log_primary_next_action_change();

CREATE OR REPLACE FUNCTION log_calendar_event_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  activity_action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    activity_action := 'calendar_event_scheduled';
  ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Completed' THEN
    activity_action := 'calendar_event_completed';
  ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Cancelled' THEN
    activity_action := 'calendar_event_cancelled';
  ELSIF OLD.start_at IS DISTINCT FROM NEW.start_at OR OLD.end_at IS DISTINCT FROM NEW.end_at THEN
    activity_action := 'calendar_event_rescheduled';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO activity_logs (
    venture_id, record_type, record_id, action, details,
    related_lead_id, related_client_id, related_project_id, source_type, source_id
  ) VALUES (
    NEW.venture_id, 'Calendar Event', NEW.id, activity_action,
    jsonb_build_object(
      'title', NEW.title, 'event_type', NEW.event_type, 'status', NEW.status,
      'starts_at', NEW.start_at, 'outcome', NEW.outcome
    ),
    NEW.related_lead_id, NEW.related_client_id, NEW.related_project_id,
    'calendar_event', NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calendar_events_log_activity ON calendar_events;
CREATE TRIGGER calendar_events_log_activity
AFTER INSERT OR UPDATE ON calendar_events
FOR EACH ROW EXECUTE FUNCTION log_calendar_event_activity();

-- Atomic completion: record what happened, clear the completed primary action,
-- and optionally schedule exactly one replacement action on the same record.
CREATE OR REPLACE FUNCTION complete_primary_next_action(
  target_type TEXT,
  target_id UUID,
  outcome_note TEXT DEFAULT NULL,
  replacement_type TEXT DEFAULT NULL,
  replacement_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_row RECORD;
BEGIN
  IF target_type = 'Lead' THEN
    SELECT id, venture_id, next_action_type, next_action_at
      INTO current_row FROM leads
      WHERE id = target_id AND public.has_venture_access(venture_id)
      FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found or access denied'; END IF;

    INSERT INTO activity_logs (
      venture_id, record_type, record_id, action, details,
      related_lead_id, source_type, source_id
    ) VALUES (
      current_row.venture_id, 'Lead', target_id, 'next_action_completed',
      jsonb_build_object('action_type', current_row.next_action_type, 'due_at', current_row.next_action_at, 'outcome', outcome_note),
      target_id, 'lead_next_action_completion', target_id
    );

    UPDATE leads SET
      last_contact_at = NOW(),
      next_action_type = replacement_type,
      next_action_at = replacement_at,
      next_follow_up = replacement_at::date,
      follow_up_notes = COALESCE(outcome_note, follow_up_notes)
    WHERE id = target_id;
  ELSIF target_type = 'Client' THEN
    SELECT id, venture_id, next_action_type, next_action_at
      INTO current_row FROM clients
      WHERE id = target_id AND public.has_venture_access(venture_id)
      FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Client not found or access denied'; END IF;

    INSERT INTO activity_logs (
      venture_id, record_type, record_id, action, details,
      related_client_id, source_type, source_id
    ) VALUES (
      current_row.venture_id, 'Client', target_id, 'next_action_completed',
      jsonb_build_object('action_type', current_row.next_action_type, 'due_at', current_row.next_action_at, 'outcome', outcome_note),
      target_id, 'client_next_action_completion', target_id
    );

    UPDATE clients SET
      last_contact_at = NOW(),
      next_action_type = replacement_type,
      next_action_at = replacement_at,
      follow_up_notes = COALESCE(outcome_note, follow_up_notes)
    WHERE id = target_id;
  ELSE
    RAISE EXCEPTION 'target_type must be Lead or Client';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION complete_primary_next_action(TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION complete_primary_next_action(TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
