-- Groenics Phase 20: Final report query indexes
-- Run after all Phase 1-19 schema upgrades.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_leads_reports
  ON leads(venture_id, pipeline_stage, created_at)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_reports
  ON clients(venture_id, status, created_at)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_reports
  ON invoices(venture_id, status, due_date, created_at)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_reports
  ON expenses(venture_id, expense_date, category)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_reports
  ON projects(venture_id, status, created_at)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_field_visits_reports
  ON field_visits(venture_id, appointment_at, status)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recurring_services_reports
  ON recurring_services(venture_id, status, next_billing_date)
  WHERE archived_at IS NULL;

COMMIT;
