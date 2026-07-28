-- Groenics Calendar and Appointments
-- Run after SECURITY_AND_DATA_PROTECTION_UPGRADE.sql.
-- Run after LEAD_QUALIFICATION_SCORING_UPGRADE.sql.

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  location TEXT,
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  priority TEXT NOT NULL DEFAULT 'Medium',
  assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  related_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  related_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  meeting_notes TEXT,
  outcome TEXT,
  cancellation_reason TEXT,
  recurrence_frequency TEXT,
  recurrence_interval INTEGER NOT NULL DEFAULT 1 CHECK (recurrence_interval > 0),
  recurrence_until DATE,
  parent_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  reschedule_count INTEGER NOT NULL DEFAULT 0 CHECK (reschedule_count >= 0),
  google_sync_status TEXT NOT NULL DEFAULT 'Not connected',
  google_event_id TEXT,
  google_last_synced_at TIMESTAMPTZ,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_at > start_at)
);

CREATE TABLE IF NOT EXISTS calendar_event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  response_status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  minutes_before INTEGER NOT NULL CHECK (minutes_before >= 0),
  channel TEXT NOT NULL DEFAULT 'Internal',
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stores connection metadata only. OAuth tokens must remain in an encrypted server-side secret store.
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'Google',
  external_calendar_id TEXT,
  status TEXT NOT NULL DEFAULT 'Not connected',
  sync_direction TEXT NOT NULL DEFAULT 'Two way',
  last_synced_at TIMESTAMPTZ,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (venture_id, provider)
);

ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_type_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_type_check CHECK (event_type IN ('Discovery call','Demonstration','Follow-up','Client meeting','Project meeting','Payment reminder','Field visit','Employee task','Content recording','Proposal expiry','Contract renewal','Subscription renewal','Other'));
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_status_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_status_check CHECK (status IN ('Scheduled','Confirmed','Completed','Cancelled','No show'));
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_priority_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_priority_check CHECK (priority IN ('Low','Medium','High','Urgent'));
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_recurrence_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_recurrence_check CHECK (recurrence_frequency IS NULL OR recurrence_frequency IN ('Daily','Weekly','Monthly','Yearly'));
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_google_status_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_google_status_check CHECK (google_sync_status IN ('Not connected','Draft','Approved','Synced','Sync failed'));
ALTER TABLE calendar_event_attendees DROP CONSTRAINT IF EXISTS calendar_attendee_response_check;
ALTER TABLE calendar_event_attendees ADD CONSTRAINT calendar_attendee_response_check CHECK (response_status IN ('Pending','Accepted','Declined','Tentative'));
ALTER TABLE calendar_event_reminders DROP CONSTRAINT IF EXISTS calendar_reminder_channel_check;
ALTER TABLE calendar_event_reminders ADD CONSTRAINT calendar_reminder_channel_check CHECK (channel IN ('Internal','Email draft','WhatsApp draft'));

CREATE INDEX IF NOT EXISTS idx_calendar_events_venture_start ON calendar_events(venture_id, start_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_employee_start ON calendar_events(assigned_employee_id, start_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(venture_id, status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_lead ON calendar_events(related_lead_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_client ON calendar_events(related_client_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_project ON calendar_events(related_project_id);
CREATE INDEX IF NOT EXISTS idx_calendar_attendees_event ON calendar_event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_reminders_event ON calendar_event_reminders(event_id);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated calendar event access" ON calendar_events;
DROP POLICY IF EXISTS "Allow authenticated calendar attendee access" ON calendar_event_attendees;
DROP POLICY IF EXISTS "Allow authenticated calendar reminder access" ON calendar_event_reminders;
DROP POLICY IF EXISTS "Allow authenticated calendar integration access" ON calendar_integrations;
DROP POLICY IF EXISTS "Venture members can access calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Venture members can access calendar attendees" ON calendar_event_attendees;
DROP POLICY IF EXISTS "Venture members can access calendar reminders" ON calendar_event_reminders;
DROP POLICY IF EXISTS "Venture members can access calendar integrations" ON calendar_integrations;
CREATE POLICY "Venture members can access calendar events"
ON calendar_events FOR ALL TO authenticated
USING (public.has_venture_access(venture_id))
WITH CHECK (public.has_venture_access(venture_id));

CREATE POLICY "Venture members can access calendar attendees"
ON calendar_event_attendees FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM calendar_events event
    WHERE event.id = event_id
      AND public.has_venture_access(event.venture_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM calendar_events event
    WHERE event.id = event_id
      AND public.has_venture_access(event.venture_id)
  )
);

CREATE POLICY "Venture members can access calendar reminders"
ON calendar_event_reminders FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM calendar_events event
    WHERE event.id = event_id
      AND public.has_venture_access(event.venture_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM calendar_events event
    WHERE event.id = event_id
      AND public.has_venture_access(event.venture_id)
  )
);

CREATE POLICY "Venture members can access calendar integrations"
ON calendar_integrations FOR ALL TO authenticated
USING (public.has_venture_access(venture_id))
WITH CHECK (public.has_venture_access(venture_id));

CREATE OR REPLACE FUNCTION track_calendar_event_reschedule()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF OLD.start_at IS DISTINCT FROM NEW.start_at OR OLD.end_at IS DISTINCT FROM NEW.end_at THEN
    NEW.reschedule_count := OLD.reschedule_count + 1;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS calendar_event_track_reschedule ON calendar_events;
CREATE TRIGGER calendar_event_track_reschedule BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION track_calendar_event_reschedule();
