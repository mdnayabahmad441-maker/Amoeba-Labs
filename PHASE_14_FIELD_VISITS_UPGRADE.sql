-- Groenics Phase 14: Mobile Field-Visit Management
-- Run after PHASE_8_ACTIVITY_UNIFICATION_UPGRADE.sql.

CREATE TABLE IF NOT EXISTS field_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE RESTRICT,
  related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  related_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL, business_type TEXT, contact_person TEXT, phone TEXT,
  town TEXT NOT NULL, full_address TEXT, pin_code TEXT, map_link TEXT,
  distance_km NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (distance_km >= 0),
  travel_expense NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (travel_expense >= 0),
  visit_mode TEXT NOT NULL DEFAULT 'Confirmed',
  appointment_at TIMESTAMPTZ NOT NULL,
  visit_purpose TEXT NOT NULL,
  decision_maker_expected BOOLEAN NOT NULL DEFAULT FALSE,
  demonstration_required BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'Planned',
  visit_outcome TEXT, main_problem_discovered TEXT, current_workaround TEXT,
  objections TEXT, estimated_opportunity_value NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (estimated_opportunity_value >= 0),
  next_action_type TEXT, next_action_at TIMESTAMPTZ,
  proposal_required BOOLEAN NOT NULL DEFAULT FALSE,
  decision_maker_met BOOLEAN NOT NULL DEFAULT FALSE,
  demonstration_delivered BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT, completed_at TIMESTAMPTZ, archived_at TIMESTAMPTZ,
  created_by UUID DEFAULT auth.uid(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (related_lead_id IS NOT NULL OR related_client_id IS NOT NULL)
);
ALTER TABLE field_visits DROP CONSTRAINT IF EXISTS field_visits_status_check;
ALTER TABLE field_visits ADD CONSTRAINT field_visits_status_check CHECK (status IN ('Planned','Confirmed','Completed','Cancelled','No show','Reschedule required'));
ALTER TABLE field_visits DROP CONSTRAINT IF EXISTS field_visits_mode_check;
ALTER TABLE field_visits ADD CONSTRAINT field_visits_mode_check CHECK (visit_mode IN ('Confirmed','Walk-in'));
CREATE INDEX IF NOT EXISTS idx_field_visits_day ON field_visits(venture_id, appointment_at);
CREATE INDEX IF NOT EXISTS idx_field_visits_town ON field_visits(venture_id, town);
ALTER TABLE field_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Venture members manage field visits" ON field_visits;
CREATE POLICY "Venture members manage field visits" ON field_visits FOR ALL TO authenticated
USING (public.has_venture_access(venture_id)) WITH CHECK (public.has_venture_access(venture_id));

CREATE OR REPLACE FUNCTION log_completed_field_visit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  NEW.updated_at := NOW();
  IF NEW.status = 'Completed' AND OLD.status IS DISTINCT FROM 'Completed' THEN
    NEW.completed_at := NOW();
    INSERT INTO activity_logs (venture_id, record_type, record_id, action, details, related_lead_id, related_client_id, source_type, source_id)
    VALUES (NEW.venture_id, 'Field Visit', NEW.id, 'field_visit_completed',
      jsonb_build_object('business',NEW.business_name,'town',NEW.town,'outcome',NEW.visit_outcome,'opportunity_value',NEW.estimated_opportunity_value,'proposal_required',NEW.proposal_required),
      NEW.related_lead_id, NEW.related_client_id, 'field_visit', NEW.id);
    IF NEW.related_lead_id IS NOT NULL AND NEW.next_action_at IS NOT NULL THEN
      UPDATE leads SET next_action_type = COALESCE(NEW.next_action_type,'Call'), next_action_at = NEW.next_action_at WHERE id = NEW.related_lead_id;
    ELSIF NEW.related_client_id IS NOT NULL AND NEW.next_action_at IS NOT NULL THEN
      UPDATE clients SET next_action_type = COALESCE(NEW.next_action_type,'Call'), next_action_at = NEW.next_action_at WHERE id = NEW.related_client_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS field_visits_log_completion ON field_visits;
CREATE TRIGGER field_visits_log_completion BEFORE UPDATE ON field_visits FOR EACH ROW EXECUTE FUNCTION log_completed_field_visit();

CREATE OR REPLACE VIEW field_day_report WITH (security_invoker = true) AS
SELECT venture_id, appointment_at::date AS visit_date, town,
  SUM(distance_km) AS distance_travelled, SUM(travel_expense) AS travel_expense,
  COUNT(*) AS visits_planned, COUNT(*) FILTER (WHERE status='Completed') AS visits_completed,
  COUNT(*) FILTER (WHERE decision_maker_met) AS decision_makers_met,
  COUNT(*) FILTER (WHERE demonstration_delivered) AS demonstrations_delivered,
  COUNT(*) FILTER (WHERE next_action_at IS NOT NULL) AS followups_created,
  COUNT(*) FILTER (WHERE proposal_required) AS proposals_required,
  SUM(estimated_opportunity_value) AS pipeline_value_generated,
  COUNT(*) FILTER (WHERE related_lead_id IN (SELECT id FROM leads WHERE pipeline_stage='Won')) AS deals_won_later
FROM field_visits WHERE archived_at IS NULL GROUP BY venture_id, appointment_at::date, town;
GRANT SELECT ON field_day_report TO authenticated;
