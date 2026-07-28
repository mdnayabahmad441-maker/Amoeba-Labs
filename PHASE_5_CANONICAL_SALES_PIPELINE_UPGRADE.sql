-- Groenics Phase 5: One canonical sales pipeline
-- Run after LEAD_QUALIFICATION_SCORING_UPGRADE.sql and
-- SECURITY_AND_DATA_PROTECTION_UPGRADE.sql.
-- This migration preserves legacy columns temporarily for rollback compatibility,
-- but pipeline_stage is the only authoritative sales-stage field.

BEGIN;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT,
  ADD COLUMN IF NOT EXISTS lead_temperature TEXT,
  ADD COLUMN IF NOT EXISTS pipeline_stage_updated_at TIMESTAMPTZ;

-- Prefer the detailed qualification status, then fall back to the legacy stage.
UPDATE leads
SET pipeline_stage = CASE
  WHEN qualification_status = 'Won' OR stage = 'Closed Won' THEN 'Won'
  WHEN qualification_status = 'Lost' OR stage = 'Closed Lost' THEN 'Lost'
  WHEN qualification_status = 'Negotiation' OR stage = 'Negotiation' THEN 'Negotiation'
  WHEN qualification_status IN ('Proposal requested', 'Proposal sent') OR stage = 'Proposal Sent' THEN 'Proposal'
  WHEN qualification_status IN (
    'Discovery scheduled', 'Discovery completed',
    'Demonstration scheduled', 'Demonstration completed'
  ) OR stage = 'Demo Scheduled' THEN 'Meeting/Demo'
  WHEN qualification_status = 'Qualified' THEN 'Qualified'
  WHEN qualification_status IN ('Attempting contact', 'Researching') OR stage = 'Contacted' THEN 'Contacted'
  ELSE 'New'
END
WHERE pipeline_stage IS NULL
   OR pipeline_stage NOT IN ('New','Contacted','Qualified','Meeting/Demo','Proposal','Negotiation','Won','Lost');

UPDATE leads
SET lead_temperature = CASE
  WHEN qualification_status = 'Unqualified' THEN 'Unqualified'
  WHEN qualification_status = 'Not ready' THEN 'Not ready'
  WHEN lead_score >= 75 THEN 'Hot'
  WHEN lead_score >= 50 THEN 'Warm'
  ELSE 'Cold'
END
WHERE lead_temperature IS NULL
   OR lead_temperature NOT IN ('Hot','Warm','Cold','Not ready','Unqualified');

-- Preserve legacy records while satisfying the new reason requirements.
UPDATE leads
SET lost_reason = 'Legacy record — loss reason was not recorded before pipeline migration.'
WHERE pipeline_stage = 'Lost'
  AND NULLIF(BTRIM(lost_reason), '') IS NULL;

UPDATE leads
SET disqualification_reason = 'Legacy record — disqualification reason was not recorded before pipeline migration.'
WHERE lead_temperature = 'Unqualified'
  AND NULLIF(BTRIM(disqualification_reason), '') IS NULL;

UPDATE leads
SET pipeline_stage_updated_at = COALESCE(pipeline_stage_updated_at, updated_at, created_at, NOW());

ALTER TABLE leads ALTER COLUMN pipeline_stage SET DEFAULT 'New';
ALTER TABLE leads ALTER COLUMN pipeline_stage SET NOT NULL;
ALTER TABLE leads ALTER COLUMN lead_temperature SET DEFAULT 'Cold';
ALTER TABLE leads ALTER COLUMN lead_temperature SET NOT NULL;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_pipeline_stage_check;
ALTER TABLE leads ADD CONSTRAINT leads_pipeline_stage_check
CHECK (pipeline_stage IN ('New','Contacted','Qualified','Meeting/Demo','Proposal','Negotiation','Won','Lost'));

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_temperature_check;
ALTER TABLE leads ADD CONSTRAINT leads_temperature_check
CHECK (lead_temperature IN ('Hot','Warm','Cold','Not ready','Unqualified'));

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lost_reason_required;
ALTER TABLE leads ADD CONSTRAINT leads_lost_reason_required
CHECK (pipeline_stage <> 'Lost' OR NULLIF(BTRIM(lost_reason), '') IS NOT NULL);

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_disqualification_reason_required;
ALTER TABLE leads ADD CONSTRAINT leads_disqualification_reason_required
CHECK (lead_temperature <> 'Unqualified' OR NULLIF(BTRIM(disqualification_reason), '') IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage
ON leads(venture_id, pipeline_stage, archived_at);
CREATE INDEX IF NOT EXISTS idx_leads_temperature
ON leads(venture_id, lead_temperature, archived_at);

-- Compatibility bridge: canonical values deterministically update the deprecated
-- columns so older SQL functions and rollback application versions cannot diverge.
CREATE OR REPLACE FUNCTION public.sync_canonical_lead_pipeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN
    NEW.pipeline_stage_updated_at := NOW();
  END IF;

  NEW.stage := CASE NEW.pipeline_stage
    WHEN 'New' THEN 'New Lead'
    WHEN 'Contacted' THEN 'Contacted'
    WHEN 'Qualified' THEN 'Contacted'
    WHEN 'Meeting/Demo' THEN 'Demo Scheduled'
    WHEN 'Proposal' THEN 'Proposal Sent'
    WHEN 'Negotiation' THEN 'Negotiation'
    WHEN 'Won' THEN 'Closed Won'
    WHEN 'Lost' THEN 'Closed Lost'
  END;

  NEW.qualification_status := CASE
    WHEN NEW.lead_temperature = 'Unqualified' THEN 'Unqualified'
    WHEN NEW.lead_temperature = 'Not ready' THEN 'Not ready'
    ELSE CASE NEW.pipeline_stage
      WHEN 'New' THEN 'New'
      WHEN 'Contacted' THEN 'Attempting contact'
      WHEN 'Qualified' THEN 'Qualified'
      WHEN 'Meeting/Demo' THEN 'Demonstration scheduled'
      WHEN 'Proposal' THEN 'Proposal sent'
      WHEN 'Negotiation' THEN 'Negotiation'
      WHEN 'Won' THEN 'Won'
      WHEN 'Lost' THEN 'Lost'
    END
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_sync_canonical_pipeline ON leads;
DROP TRIGGER IF EXISTS aa_leads_sync_canonical_pipeline ON leads;
CREATE TRIGGER aa_leads_sync_canonical_pipeline
BEFORE INSERT OR UPDATE OF pipeline_stage, lead_temperature
ON leads
FOR EACH ROW EXECUTE FUNCTION public.sync_canonical_lead_pipeline();

-- Re-run the existing scoring trigger when the canonical classification changes.
-- The aa_ prefix guarantees the compatibility values are synchronized first.
DROP TRIGGER IF EXISTS leads_refresh_score ON leads;
CREATE TRIGGER leads_refresh_score
BEFORE INSERT OR UPDATE OF
  problem_severity, urgency, ability_to_pay, authority_level,
  decision_maker_identified, expected_project_value, engagement_score,
  timeline_score, founder_company_fit, qualification_status,
  pipeline_stage, lead_temperature
ON leads
FOR EACH ROW EXECUTE FUNCTION refresh_lead_score();

CREATE OR REPLACE FUNCTION public.audit_lead_pipeline_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.activity_logs (
    venture_id, record_type, record_id, action, details, performed_by
  ) VALUES (
    NEW.venture_id,
    'Lead',
    NEW.id,
    CASE
      WHEN NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN 'pipeline_stage_changed'
      ELSE 'lead_temperature_changed'
    END,
    jsonb_build_object(
      'previous_pipeline_stage', OLD.pipeline_stage,
      'pipeline_stage', NEW.pipeline_stage,
      'previous_temperature', OLD.lead_temperature,
      'lead_temperature', NEW.lead_temperature
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_lead_pipeline_change ON leads;
CREATE TRIGGER audit_lead_pipeline_change
AFTER UPDATE OF pipeline_stage, lead_temperature
ON leads
FOR EACH ROW
WHEN (
  OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage
  OR OLD.lead_temperature IS DISTINCT FROM NEW.lead_temperature
)
EXECUTE FUNCTION public.audit_lead_pipeline_change();

-- Ensure all existing records finish with synchronized compatibility values.
UPDATE leads
SET pipeline_stage = pipeline_stage,
    lead_temperature = lead_temperature;

COMMENT ON COLUMN leads.pipeline_stage IS
  'Canonical sales pipeline. Legacy stage and qualification_status are deprecated compatibility fields.';
COMMENT ON COLUMN leads.lead_temperature IS
  'Lead priority/disposition label separate from pipeline progression.';

COMMIT;
