-- Groenics Phase 10: Agreement, Deposit and Project-Start Gates
-- Run after PHASE_9_LEAD_CONVERSION_UPGRADE.sql.
-- Safe to run repeatedly. Back up production before applying migrations.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS agreement_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agreement_status TEXT NOT NULL DEFAULT 'Not required',
  ADD COLUMN IF NOT EXISTS agreement_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  ADD COLUMN IF NOT EXISTS deposit_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deposit_received BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requirements_received BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ready_to_start_status TEXT NOT NULL DEFAULT 'Blocked',
  ADD COLUMN IF NOT EXISTS start_override_reason TEXT,
  ADD COLUMN IF NOT EXISTS start_override_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_override_at TIMESTAMPTZ;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_agreement_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_agreement_status_check
  CHECK (agreement_status IN ('Not required','Pending','Accepted'));
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_ready_to_start_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_ready_to_start_status_check
  CHECK (ready_to_start_status IN ('Blocked','Ready','Overridden'));
-- Preserve legitimate active/completed work during migration.
UPDATE projects SET
  requirements_received = TRUE,
  onboarding_completed = TRUE,
  ready_to_start_status = 'Ready'
WHERE status IN ('Active','Completed');
UPDATE projects SET status = 'Awaiting Requirements'
WHERE status = 'Planning';

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (status IN (
  'Awaiting Agreement','Awaiting Deposit','Awaiting Requirements','Ready to Start',
  'Active','Client Review','On Hold','Completed','Cancelled'
));

CREATE OR REPLACE FUNCTION enforce_project_start_gates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  agreement_ok BOOLEAN;
  deposit_ok BOOLEAN;
  all_ready BOOLEAN;
  override_ok BOOLEAN;
BEGIN
  IF NEW.agreement_required AND NEW.agreement_status = 'Accepted' AND NEW.agreement_accepted_at IS NULL THEN
    NEW.agreement_accepted_at := NOW();
  ELSIF NEW.agreement_status <> 'Accepted' THEN
    NEW.agreement_accepted_at := NULL;
  END IF;

  agreement_ok := NOT NEW.agreement_required OR NEW.agreement_status = 'Accepted';
  deposit_ok := NOT NEW.deposit_required OR NEW.deposit_received;
  all_ready := agreement_ok AND deposit_ok AND NEW.requirements_received AND NEW.onboarding_completed;
  override_ok := NULLIF(trim(NEW.start_override_reason), '') IS NOT NULL
    AND NEW.start_override_by IS NOT NULL
    AND NEW.start_override_at IS NOT NULL;

  IF NEW.status = 'Active' AND NOT all_ready AND NOT override_ok THEN
    RAISE EXCEPTION 'Project cannot become Active: complete all start gates or use an audited override';
  END IF;

  IF all_ready THEN
    NEW.ready_to_start_status := 'Ready';
  ELSIF override_ok AND NEW.status = 'Active' THEN
    NEW.ready_to_start_status := 'Overridden';
  ELSE
    NEW.ready_to_start_status := 'Blocked';
  END IF;

  IF NEW.status NOT IN ('Active','Client Review','On Hold','Completed','Cancelled') THEN
    NEW.status := CASE
      WHEN NOT agreement_ok THEN 'Awaiting Agreement'
      WHEN NOT deposit_ok THEN 'Awaiting Deposit'
      WHEN NOT NEW.requirements_received OR NOT NEW.onboarding_completed THEN 'Awaiting Requirements'
      ELSE 'Ready to Start'
    END;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_enforce_start_gates ON projects;
CREATE TRIGGER projects_enforce_start_gates
BEFORE INSERT OR UPDATE OF status, agreement_required, agreement_status, deposit_required,
  deposit_amount, deposit_received, requirements_received, onboarding_completed,
  start_override_reason, start_override_by, start_override_at
ON projects
FOR EACH ROW EXECUTE FUNCTION enforce_project_start_gates();

CREATE OR REPLACE FUNCTION sync_conversion_project_gates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id IS NULL THEN RETURN NEW; END IF;
  UPDATE projects SET
    agreement_required = NEW.agreement_status <> 'Not required',
    agreement_status = NEW.agreement_status,
    agreement_accepted_at = CASE WHEN NEW.agreement_status = 'Accepted' THEN NEW.converted_at ELSE NULL END,
    deposit_required = NEW.deposit_required,
    deposit_amount = NEW.deposit_amount,
    deposit_invoice_id = CASE WHEN NEW.deposit_required THEN NEW.invoice_id ELSE NULL END,
    deposit_received = FALSE,
    requirements_received = FALSE,
    onboarding_completed = FALSE
  WHERE id = NEW.project_id AND venture_id = NEW.venture_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lead_conversions_sync_project_gates ON lead_conversions;
CREATE TRIGGER lead_conversions_sync_project_gates
AFTER INSERT OR UPDATE OF agreement_status, deposit_required, deposit_amount, invoice_id
ON lead_conversions
FOR EACH ROW EXECUTE FUNCTION sync_conversion_project_gates();

CREATE OR REPLACE FUNCTION activate_project_with_override(target_project UUID, override_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  project_row projects%ROWTYPE;
BEGIN
  IF NULLIF(trim(override_reason), '') IS NULL THEN
    RAISE EXCEPTION 'An override reason is required';
  END IF;
  SELECT * INTO project_row FROM projects
  WHERE id = target_project AND archived_at IS NULL AND public.has_venture_access(venture_id)
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found or access denied'; END IF;

  UPDATE projects SET
    status = 'Active',
    start_override_reason = trim(override_reason),
    start_override_by = auth.uid(),
    start_override_at = NOW()
  WHERE id = target_project;

  INSERT INTO activity_logs (
    venture_id, record_type, record_id, action, details,
    related_client_id, related_lead_id, related_project_id, source_type, source_id
  ) VALUES (
    project_row.venture_id, 'Project', project_row.id, 'project_start_overridden',
    jsonb_build_object(
      'reason', trim(override_reason),
      'agreement_status', project_row.agreement_status,
      'deposit_received', project_row.deposit_received,
      'requirements_received', project_row.requirements_received,
      'onboarding_completed', project_row.onboarding_completed
    ),
    project_row.client_id, project_row.lead_id, project_row.id,
    'project_start_override', gen_random_uuid()
  );
END;
$$;

REVOKE ALL ON FUNCTION activate_project_with_override(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activate_project_with_override(UUID, TEXT) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_projects_start_readiness
  ON projects(venture_id, ready_to_start_status, status)
  WHERE archived_at IS NULL;
