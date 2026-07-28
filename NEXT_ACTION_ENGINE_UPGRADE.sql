-- Groenics Phase 2: Next-Action Engine
-- Requires TODAY_COMMAND_CENTRE_UPGRADE.sql (activity_logs).

ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS no_contact_warning_days INTEGER NOT NULL DEFAULT 7 CHECK (no_contact_warning_days BETWEEN 1 AND 365),
  ADD COLUMN IF NOT EXISTS lead_stuck_warning_days INTEGER NOT NULL DEFAULT 14 CHECK (lead_stuck_warning_days BETWEEN 1 AND 365),
  ADD COLUMN IF NOT EXISTS client_update_warning_days INTEGER NOT NULL DEFAULT 14 CHECK (client_update_warning_days BETWEEN 1 AND 365);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS next_action_type TEXT,
  ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS communication_channel TEXT,
  ADD COLUMN IF NOT EXISTS responsible_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expected_outcome TEXT,
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_priority TEXT NOT NULL DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS follow_up_notes TEXT,
  ADD COLUMN IF NOT EXISTS next_action_reschedule_count INTEGER NOT NULL DEFAULT 0 CHECK (next_action_reschedule_count >= 0),
  ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS next_action_updated_at TIMESTAMPTZ;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS next_action_type TEXT,
  ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS communication_channel TEXT,
  ADD COLUMN IF NOT EXISTS responsible_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expected_outcome TEXT,
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_priority TEXT NOT NULL DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS follow_up_notes TEXT,
  ADD COLUMN IF NOT EXISTS next_action_reschedule_count INTEGER NOT NULL DEFAULT 0 CHECK (next_action_reschedule_count >= 0),
  ADD COLUMN IF NOT EXISTS client_update_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_action_updated_at TIMESTAMPTZ;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_next_action_type_check;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_next_action_type_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_communication_channel_check;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_communication_channel_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_follow_up_priority_check;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_follow_up_priority_check;

ALTER TABLE leads ADD CONSTRAINT leads_next_action_type_check CHECK (next_action_type IS NULL OR next_action_type IN ('Call','WhatsApp','Email','Meeting','Demonstration','Proposal','Payment reminder','Project update','Renewal','Upsell','Referral request','Other'));
ALTER TABLE clients ADD CONSTRAINT clients_next_action_type_check CHECK (next_action_type IS NULL OR next_action_type IN ('Call','WhatsApp','Email','Meeting','Demonstration','Proposal','Payment reminder','Project update','Renewal','Upsell','Referral request','Other'));
ALTER TABLE leads ADD CONSTRAINT leads_communication_channel_check CHECK (communication_channel IS NULL OR communication_channel IN ('Phone','WhatsApp','Email','In person','Video call','Other'));
ALTER TABLE clients ADD CONSTRAINT clients_communication_channel_check CHECK (communication_channel IS NULL OR communication_channel IN ('Phone','WhatsApp','Email','In person','Video call','Other'));
ALTER TABLE leads ADD CONSTRAINT leads_follow_up_priority_check CHECK (follow_up_priority IN ('Low','Medium','High','Urgent'));
ALTER TABLE clients ADD CONSTRAINT clients_follow_up_priority_check CHECK (follow_up_priority IN ('Low','Medium','High','Urgent'));

CREATE INDEX IF NOT EXISTS idx_leads_next_action_at ON leads(venture_id, next_action_at) WHERE stage NOT IN ('Closed Won', 'Closed Lost');
CREATE INDEX IF NOT EXISTS idx_leads_responsible_employee ON leads(responsible_employee_id);
CREATE INDEX IF NOT EXISTS idx_leads_last_contact ON leads(venture_id, last_contact_at);
CREATE INDEX IF NOT EXISTS idx_clients_next_action_at ON clients(venture_id, next_action_at) WHERE status IN ('Lead', 'Active');
CREATE INDEX IF NOT EXISTS idx_clients_responsible_employee ON clients(responsible_employee_id);
CREATE INDEX IF NOT EXISTS idx_clients_last_contact ON clients(venture_id, last_contact_at);

-- Preserve existing lead follow-up dates as noon IST next actions.
UPDATE leads
SET next_action_type = COALESCE(next_action_type, 'Call'),
    communication_channel = COALESCE(communication_channel, 'Phone'),
    next_action_at = COALESCE(next_action_at, (next_follow_up::timestamp + TIME '12:00') AT TIME ZONE 'Asia/Kolkata'),
    next_action_updated_at = COALESCE(next_action_updated_at, NOW())
WHERE next_follow_up IS NOT NULL AND next_action_at IS NULL;

CREATE OR REPLACE FUNCTION track_next_action_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF OLD.next_action_at IS DISTINCT FROM NEW.next_action_at THEN
    IF OLD.next_action_at IS NOT NULL THEN
      NEW.next_action_reschedule_count := COALESCE(OLD.next_action_reschedule_count, 0) + 1;
    END IF;
    NEW.next_action_updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_track_next_action ON leads;
CREATE TRIGGER leads_track_next_action BEFORE UPDATE OF next_action_at ON leads
FOR EACH ROW EXECUTE FUNCTION track_next_action_changes();

DROP TRIGGER IF EXISTS clients_track_next_action ON clients;
CREATE TRIGGER clients_track_next_action BEFORE UPDATE OF next_action_at ON clients
FOR EACH ROW EXECUTE FUNCTION track_next_action_changes();

CREATE OR REPLACE FUNCTION track_lead_stage_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN NEW.stage_entered_at := NOW(); END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_track_stage ON leads;
CREATE TRIGGER leads_track_stage BEFORE UPDATE OF stage ON leads
FOR EACH ROW EXECUTE FUNCTION track_lead_stage_change();

