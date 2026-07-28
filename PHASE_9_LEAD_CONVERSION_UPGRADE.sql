-- Groenics Phase 9: Guided Lead-to-Client Conversion
-- Run after PHASE_8_ACTIVITY_UNIFICATION_UPGRADE.sql and CALENDAR_APPOINTMENTS_UPGRADE.sql.
-- Safe to run repeatedly. Back up production before applying migrations.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_one_per_proposal
  ON projects(proposal_id) WHERE proposal_id IS NOT NULL AND archived_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_one_initial_per_proposal
  ON invoices(proposal_id) WHERE proposal_id IS NOT NULL AND archived_at IS NULL;

CREATE TABLE IF NOT EXISTS lead_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE RESTRICT,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  onboarding_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  agreement_status TEXT NOT NULL DEFAULT 'Not required',
  deposit_required BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  conversion_notes TEXT,
  converted_by UUID DEFAULT auth.uid(),
  converted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lead_id)
);

ALTER TABLE lead_conversions DROP CONSTRAINT IF EXISTS lead_conversions_agreement_status_check;
ALTER TABLE lead_conversions ADD CONSTRAINT lead_conversions_agreement_status_check
  CHECK (agreement_status IN ('Not required','Pending','Accepted'));
CREATE INDEX IF NOT EXISTS idx_lead_conversions_venture ON lead_conversions(venture_id, converted_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_conversions_client ON lead_conversions(client_id);

ALTER TABLE lead_conversions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Venture members can read lead conversions" ON lead_conversions;
DROP POLICY IF EXISTS "Venture members can create lead conversions" ON lead_conversions;
CREATE POLICY "Venture members can read lead conversions"
ON lead_conversions FOR SELECT TO authenticated
USING (public.has_venture_access(venture_id));
CREATE POLICY "Venture members can create lead conversions"
ON lead_conversions FOR INSERT TO authenticated
WITH CHECK (public.has_venture_access(venture_id) AND converted_by = auth.uid());

CREATE OR REPLACE FUNCTION normalize_conversion_phone(value TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT NULLIF(regexp_replace(COALESCE(value, ''), '[^0-9]', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION find_lead_conversion_duplicates(target_lead UUID)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  phone TEXT,
  email TEXT,
  match_reasons TEXT[]
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT c.id, c.client_name, c.phone, c.email,
    array_remove(ARRAY[
      CASE WHEN normalize_conversion_phone(c.phone) IS NOT NULL
             AND normalize_conversion_phone(c.phone) = normalize_conversion_phone(l.phone) THEN 'phone' END,
      CASE WHEN NULLIF(lower(trim(c.email)), '') = NULLIF(lower(trim(l.email)), '') THEN 'email' END,
      CASE WHEN lower(trim(c.client_name)) = lower(trim(l.client_name)) THEN 'organization' END
    ], NULL)
  FROM leads l
  JOIN clients c ON c.venture_id = l.venture_id AND c.archived_at IS NULL
  WHERE l.id = target_lead
    AND public.has_venture_access(l.venture_id)
    AND (
      (normalize_conversion_phone(c.phone) IS NOT NULL AND normalize_conversion_phone(c.phone) = normalize_conversion_phone(l.phone))
      OR NULLIF(lower(trim(c.email)), '') = NULLIF(lower(trim(l.email)), '')
      OR lower(trim(c.client_name)) = lower(trim(l.client_name))
    )
  ORDER BY c.updated_at DESC;
$$;

CREATE OR REPLACE FUNCTION convert_won_lead(
  target_lead UUID,
  accepted_proposal UUID,
  existing_client UUID DEFAULT NULL,
  agreement_state TEXT DEFAULT 'Not required',
  requires_deposit BOOLEAN DEFAULT FALSE,
  required_deposit_amount NUMERIC DEFAULT 0,
  should_create_project BOOLEAN DEFAULT TRUE,
  should_create_invoice BOOLEAN DEFAULT TRUE,
  invoice_number_value TEXT DEFAULT NULL,
  invoice_due_date DATE DEFAULT NULL,
  should_schedule_onboarding BOOLEAN DEFAULT TRUE,
  onboarding_at TIMESTAMPTZ DEFAULT NULL,
  should_create_initial_task BOOLEAN DEFAULT TRUE,
  conversion_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  conversion_id UUID,
  client_id UUID,
  project_id UUID,
  invoice_id UUID,
  onboarding_event_id UUID
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  lead_row leads%ROWTYPE;
  proposal_row proposals%ROWTYPE;
  new_client_id UUID;
  new_project_id UUID;
  new_invoice_id UUID;
  new_event_id UUID;
  new_conversion_id UUID;
  client_type_value TEXT;
BEGIN
  SELECT * INTO lead_row FROM leads
  WHERE id = target_lead AND archived_at IS NULL AND public.has_venture_access(venture_id)
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found or access denied'; END IF;

  IF EXISTS (SELECT 1 FROM lead_conversions WHERE lead_id = target_lead) THEN
    RAISE EXCEPTION 'This lead has already been converted';
  END IF;

  SELECT * INTO proposal_row FROM proposals
  WHERE id = accepted_proposal
    AND lead_id = target_lead
    AND venture_id = lead_row.venture_id
    AND archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Select a proposal linked to this lead'; END IF;

  IF agreement_state NOT IN ('Not required','Pending','Accepted') THEN
    RAISE EXCEPTION 'Invalid agreement status';
  END IF;
  IF requires_deposit AND COALESCE(required_deposit_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Deposit amount must be greater than zero';
  END IF;

  IF existing_client IS NOT NULL THEN
    SELECT id INTO new_client_id FROM clients
    WHERE id = existing_client
      AND venture_id = lead_row.venture_id
      AND archived_at IS NULL
      AND public.has_venture_access(venture_id);
    IF new_client_id IS NULL THEN RAISE EXCEPTION 'Selected client not found or access denied'; END IF;
  ELSE
    client_type_value := CASE
      WHEN lead_row.business_type IN ('School','Hospital','Business','Restaurant','Clinic','NGO','Government','Other')
        THEN lead_row.business_type
      ELSE 'Business'
    END;
    INSERT INTO clients (
      venture_id, client_name, client_type, owner_name, phone, email, city,
      status, notes, responsible_employee_id, follow_up_priority
    ) VALUES (
      lead_row.venture_id, lead_row.client_name, client_type_value,
      lead_row.contact_person, lead_row.phone, lower(trim(lead_row.email)),
      lead_row.location, 'Active', lead_row.notes,
      lead_row.responsible_employee_id, lead_row.follow_up_priority
    ) RETURNING id INTO new_client_id;
  END IF;

  UPDATE proposals SET status = 'Accepted', client_id = new_client_id, updated_at = NOW()
  WHERE id = proposal_row.id;

  IF should_create_project THEN
    INSERT INTO projects (
      venture_id, client_id, lead_id, proposal_id, project_name, status, budget, notes
    ) VALUES (
      lead_row.venture_id, new_client_id, lead_row.id, proposal_row.id,
      proposal_row.title, 'Planning', proposal_row.subtotal,
      'Created by the won-lead conversion wizard.'
    ) RETURNING id INTO new_project_id;
  END IF;

  IF should_create_invoice THEN
    IF NULLIF(trim(invoice_number_value), '') IS NULL THEN
      RAISE EXCEPTION 'Invoice number is required';
    END IF;
    INSERT INTO invoices (
      venture_id, client_id, proposal_id, project_id, amount,
      invoice_number, due_date, status, notes
    ) VALUES (
      lead_row.venture_id, new_client_id, proposal_row.id, new_project_id,
      CASE WHEN requires_deposit THEN required_deposit_amount ELSE proposal_row.subtotal END,
      trim(invoice_number_value), COALESCE(invoice_due_date, CURRENT_DATE + 15),
      'Draft',
      CASE WHEN requires_deposit
        THEN 'Deposit invoice draft from proposal ' || proposal_row.proposal_number
        ELSE 'Initial invoice draft from proposal ' || proposal_row.proposal_number END
    ) RETURNING id INTO new_invoice_id;

    INSERT INTO invoice_items (invoice_id, service_name, description, quantity, rate, amount)
    SELECT new_invoice_id,
      CASE WHEN requires_deposit THEN 'Project deposit' ELSE item.service_name END,
      CASE WHEN requires_deposit THEN 'Deposit for ' || proposal_row.title ELSE item.description END,
      CASE WHEN requires_deposit THEN 1 ELSE item.quantity END,
      CASE WHEN requires_deposit THEN required_deposit_amount ELSE item.rate END,
      CASE WHEN requires_deposit THEN required_deposit_amount ELSE item.amount END
    FROM proposal_items item
    WHERE item.proposal_id = proposal_row.id
      AND (NOT requires_deposit OR item.id = (
        SELECT id FROM proposal_items WHERE proposal_id = proposal_row.id ORDER BY created_at LIMIT 1
      ));
  END IF;

  IF should_schedule_onboarding THEN
    IF onboarding_at IS NULL THEN RAISE EXCEPTION 'Onboarding date and time are required'; END IF;
    INSERT INTO calendar_events (
      venture_id, title, event_type, start_at, end_at, timezone, status,
      priority, assigned_employee_id, related_lead_id, related_client_id,
      related_project_id, description
    ) VALUES (
      lead_row.venture_id, 'Onboarding · ' || lead_row.client_name,
      'Client meeting', onboarding_at, onboarding_at + INTERVAL '1 hour',
      'Asia/Kolkata', 'Scheduled', 'High', lead_row.responsible_employee_id,
      lead_row.id, new_client_id, new_project_id,
      'Initial onboarding created by the won-lead conversion wizard.'
    ) RETURNING id INTO new_event_id;
  END IF;

  IF should_create_initial_task THEN
    INSERT INTO tasks (
      venture_id, title, description, due_date, priority, status,
      assigned_employee_id, related_client_id, related_lead_id
    ) VALUES (
      lead_row.venture_id, 'Prepare onboarding for ' || lead_row.client_name,
      'Review the accepted proposal, requirements, agreement and deposit conditions.',
      COALESCE(onboarding_at::date, CURRENT_DATE + 1), 'High', 'To Do',
      lead_row.responsible_employee_id, new_client_id, lead_row.id
    );
  END IF;

  UPDATE leads SET
    pipeline_stage = 'Won',
    qualification_status = 'Won',
    next_action_type = NULL,
    next_action_at = NULL,
    next_follow_up = NULL,
    updated_at = NOW()
  WHERE id = lead_row.id;

  INSERT INTO lead_conversions (
    venture_id, lead_id, proposal_id, client_id, project_id, invoice_id,
    onboarding_event_id, agreement_status, deposit_required, deposit_amount,
    conversion_notes
  ) VALUES (
    lead_row.venture_id, lead_row.id, proposal_row.id, new_client_id,
    new_project_id, new_invoice_id, new_event_id, agreement_state,
    requires_deposit, COALESCE(required_deposit_amount, 0), conversion_note
  ) RETURNING id INTO new_conversion_id;

  INSERT INTO activity_logs (
    venture_id, record_type, record_id, action, details,
    related_lead_id, related_client_id, related_project_id,
    source_type, source_id
  ) VALUES (
    lead_row.venture_id, 'Lead', lead_row.id, 'lead_converted',
    jsonb_build_object(
      'proposal_id', proposal_row.id, 'client_id', new_client_id,
      'project_id', new_project_id, 'invoice_id', new_invoice_id,
      'onboarding_event_id', new_event_id, 'agreement_status', agreement_state,
      'deposit_required', requires_deposit, 'deposit_amount', required_deposit_amount
    ),
    lead_row.id, new_client_id, new_project_id, 'lead_conversion', new_conversion_id
  );

  RETURN QUERY SELECT new_conversion_id, new_client_id, new_project_id, new_invoice_id, new_event_id;
END;
$$;

REVOKE ALL ON FUNCTION find_lead_conversion_duplicates(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_lead_conversion_duplicates(UUID) TO authenticated;
REVOKE ALL ON FUNCTION convert_won_lead(UUID, UUID, UUID, TEXT, BOOLEAN, NUMERIC, BOOLEAN, BOOLEAN, TEXT, DATE, BOOLEAN, TIMESTAMPTZ, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION convert_won_lead(UUID, UUID, UUID, TEXT, BOOLEAN, NUMERIC, BOOLEAN, BOOLEAN, TEXT, DATE, BOOLEAN, TIMESTAMPTZ, BOOLEAN, TEXT) TO authenticated;
