-- Groenics Phase 13: Review-First Recurring Billing
-- Run after PHASE_12_FINANCIAL_TERMINOLOGY_UPGRADE.sql and BILLING_UPGRADE.sql.

CREATE TABLE IF NOT EXISTS recurring_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  product_service TEXT NOT NULL,
  plan_name TEXT,
  billing_frequency TEXT NOT NULL DEFAULT 'Monthly',
  custom_interval_days INTEGER CHECK (custom_interval_days IS NULL OR custom_interval_days > 0),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate BETWEEN 0 AND 100),
  start_date DATE NOT NULL,
  next_billing_date DATE NOT NULL,
  renewal_date DATE,
  status TEXT NOT NULL DEFAULT 'Draft',
  auto_create_invoice_draft BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recurring_billing_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_service_id UUID NOT NULL REFERENCES recurring_services(id) ON DELETE RESTRICT,
  billing_date DATE NOT NULL,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recurring_service_id, billing_date)
);

ALTER TABLE recurring_services DROP CONSTRAINT IF EXISTS recurring_services_frequency_check;
ALTER TABLE recurring_services ADD CONSTRAINT recurring_services_frequency_check
  CHECK (billing_frequency IN ('Monthly','Quarterly','Half-yearly','Annually','Custom'));
ALTER TABLE recurring_services DROP CONSTRAINT IF EXISTS recurring_services_status_check;
ALTER TABLE recurring_services ADD CONSTRAINT recurring_services_status_check
  CHECK (status IN ('Draft','Active','Paused','Cancelled','Expired'));

CREATE INDEX IF NOT EXISTS idx_recurring_services_due ON recurring_services(venture_id, next_billing_date)
  WHERE status = 'Active' AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recurring_services_renewal ON recurring_services(venture_id, renewal_date)
  WHERE status = 'Active' AND archived_at IS NULL;

ALTER TABLE recurring_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_billing_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Venture members manage recurring services" ON recurring_services;
CREATE POLICY "Venture members manage recurring services" ON recurring_services FOR ALL TO authenticated
USING (public.has_venture_access(venture_id)) WITH CHECK (public.has_venture_access(venture_id));
DROP POLICY IF EXISTS "Venture members read recurring billing runs" ON recurring_billing_runs;
CREATE POLICY "Venture members read recurring billing runs" ON recurring_billing_runs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM recurring_services service WHERE service.id = recurring_service_id AND public.has_venture_access(service.venture_id)));
DROP POLICY IF EXISTS "Venture members create recurring billing runs" ON recurring_billing_runs;
CREATE POLICY "Venture members create recurring billing runs" ON recurring_billing_runs FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM recurring_services service WHERE service.id = recurring_service_id AND public.has_venture_access(service.venture_id)));

CREATE OR REPLACE FUNCTION advance_recurring_date(service recurring_services)
RETURNS DATE LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE service.billing_frequency
    WHEN 'Monthly' THEN (service.next_billing_date + INTERVAL '1 month')::date
    WHEN 'Quarterly' THEN (service.next_billing_date + INTERVAL '3 months')::date
    WHEN 'Half-yearly' THEN (service.next_billing_date + INTERVAL '6 months')::date
    WHEN 'Annually' THEN (service.next_billing_date + INTERVAL '1 year')::date
    ELSE service.next_billing_date + COALESCE(service.custom_interval_days, 30)
  END;
$$;

CREATE OR REPLACE FUNCTION create_recurring_invoice_draft(target_service UUID, invoice_number_value TEXT, due_date_value DATE)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE service recurring_services%ROWTYPE; invoice_id_value UUID; total NUMERIC;
BEGIN
  SELECT * INTO service FROM recurring_services
  WHERE id = target_service AND status = 'Active' AND archived_at IS NULL AND public.has_venture_access(venture_id)
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active recurring service not found or access denied'; END IF;
  IF EXISTS (SELECT 1 FROM recurring_billing_runs WHERE recurring_service_id = service.id AND billing_date = service.next_billing_date) THEN
    RAISE EXCEPTION 'A draft already exists for this billing date';
  END IF;
  IF NULLIF(trim(invoice_number_value), '') IS NULL THEN RAISE EXCEPTION 'Invoice number is required'; END IF;
  total := ROUND(service.amount * (1 + service.tax_rate / 100), 2);
  INSERT INTO invoices (venture_id, client_id, amount, invoice_number, due_date, status, notes)
  VALUES (service.venture_id, service.client_id, total, trim(invoice_number_value), COALESCE(due_date_value, CURRENT_DATE + 15), 'Draft', 'Recurring invoice draft · ' || service.product_service)
  RETURNING id INTO invoice_id_value;
  INSERT INTO invoice_items (invoice_id, service_name, description, quantity, rate, amount)
  VALUES (invoice_id_value, service.product_service, COALESCE(service.plan_name, service.notes), 1, total, total);
  INSERT INTO recurring_billing_runs (recurring_service_id, billing_date, invoice_id)
  VALUES (service.id, service.next_billing_date, invoice_id_value);
  UPDATE recurring_services SET next_billing_date = advance_recurring_date(service), updated_at = NOW() WHERE id = service.id;
  RETURN invoice_id_value;
END;
$$;

REVOKE ALL ON FUNCTION create_recurring_invoice_draft(UUID, TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_recurring_invoice_draft(UUID, TEXT, DATE) TO authenticated;
