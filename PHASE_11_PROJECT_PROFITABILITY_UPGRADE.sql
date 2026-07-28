-- Groenics Phase 11: Project Profitability
-- Run after PHASE_10_PROJECT_START_GATES_UPGRADE.sql and BILLING_UPGRADE.sql.
-- Safe to run repeatedly. Back up production before applying migrations.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS recognized_revenue NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (recognized_revenue >= 0),
  ADD COLUMN IF NOT EXISTS profitability_basis TEXT NOT NULL DEFAULT 'Collected',
  ADD COLUMN IF NOT EXISTS direct_cost_budget NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (direct_cost_budget >= 0),
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (estimated_hours >= 0),
  ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (actual_hours >= 0);

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_profitability_basis_check;
ALTER TABLE projects ADD CONSTRAINT projects_profitability_basis_check
  CHECK (profitability_basis IN ('Invoiced','Collected','Recognized'));

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS direct_cost_type TEXT;

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_direct_cost_type_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_direct_cost_type_check CHECK (
  direct_cost_type IS NULL OR direct_cost_type IN (
    'Contractor','Employee','Software','API','Travel','Other'
  )
);
CREATE INDEX IF NOT EXISTS idx_expenses_project_date
  ON expenses(project_id, expense_date) WHERE project_id IS NOT NULL AND archived_at IS NULL;

DROP VIEW IF EXISTS project_profitability;
CREATE VIEW project_profitability
WITH (security_invoker = true)
AS
WITH invoice_totals AS (
  SELECT p.id AS project_id,
    COALESCE(SUM(i.amount) FILTER (WHERE i.status <> 'Cancelled'), 0)::NUMERIC AS invoiced_amount,
    COALESCE(SUM(pay.paid_amount) FILTER (WHERE i.status <> 'Cancelled'), 0)::NUMERIC AS collected_amount
  FROM projects p
  LEFT JOIN invoices i ON i.archived_at IS NULL
    AND (i.project_id = p.id OR (i.project_id IS NULL AND p.proposal_id IS NOT NULL AND i.proposal_id = p.proposal_id))
  LEFT JOIN (
    SELECT invoice_id, SUM(amount)::NUMERIC AS paid_amount
    FROM payments GROUP BY invoice_id
  ) pay ON pay.invoice_id = i.id
  GROUP BY p.id
),
cost_totals AS (
  SELECT project_id,
    COALESCE(SUM(amount), 0)::NUMERIC AS direct_costs,
    COALESCE(SUM(amount) FILTER (WHERE direct_cost_type = 'Contractor'), 0)::NUMERIC AS contractor_cost,
    COALESCE(SUM(amount) FILTER (WHERE direct_cost_type = 'Employee'), 0)::NUMERIC AS employee_cost,
    COALESCE(SUM(amount) FILTER (WHERE direct_cost_type = 'Software'), 0)::NUMERIC AS software_cost,
    COALESCE(SUM(amount) FILTER (WHERE direct_cost_type = 'API'), 0)::NUMERIC AS api_cost,
    COALESCE(SUM(amount) FILTER (WHERE direct_cost_type = 'Travel'), 0)::NUMERIC AS travel_cost,
    COALESCE(SUM(amount) FILTER (WHERE direct_cost_type = 'Other' OR direct_cost_type IS NULL), 0)::NUMERIC AS other_cost
  FROM expenses
  WHERE archived_at IS NULL AND project_id IS NOT NULL
  GROUP BY project_id
),
base AS (
  SELECT p.id AS project_id, p.venture_id, p.project_name, p.client_id, p.status,
    COALESCE(p.budget, 0)::NUMERIC AS contract_value,
    COALESCE(i.invoiced_amount, 0)::NUMERIC AS invoiced_amount,
    COALESCE(i.collected_amount, 0)::NUMERIC AS collected_amount,
    COALESCE(p.recognized_revenue, 0)::NUMERIC AS recognized_revenue,
    p.profitability_basis,
    COALESCE(c.direct_costs, 0)::NUMERIC AS direct_costs,
    COALESCE(c.contractor_cost, 0)::NUMERIC AS contractor_cost,
    COALESCE(c.employee_cost, 0)::NUMERIC AS employee_cost,
    COALESCE(c.software_cost, 0)::NUMERIC AS software_cost,
    COALESCE(c.api_cost, 0)::NUMERIC AS api_cost,
    COALESCE(c.travel_cost, 0)::NUMERIC AS travel_cost,
    COALESCE(c.other_cost, 0)::NUMERIC AS other_cost,
    COALESCE(p.direct_cost_budget, 0)::NUMERIC AS direct_cost_budget,
    COALESCE(p.estimated_hours, 0)::NUMERIC AS estimated_hours,
    COALESCE(p.actual_hours, 0)::NUMERIC AS actual_hours
  FROM projects p
  LEFT JOIN invoice_totals i ON i.project_id = p.id
  LEFT JOIN cost_totals c ON c.project_id = p.id
  WHERE p.archived_at IS NULL
),
calculated AS (
  SELECT base.*,
    GREATEST(invoiced_amount - collected_amount, 0)::NUMERIC AS outstanding_amount,
    CASE profitability_basis
      WHEN 'Invoiced' THEN invoiced_amount
      WHEN 'Recognized' THEN recognized_revenue
      ELSE collected_amount
    END::NUMERIC AS profitability_revenue
  FROM base
)
SELECT calculated.*,
  (profitability_revenue - direct_costs)::NUMERIC AS gross_profit,
  CASE WHEN profitability_revenue > 0
    THEN ROUND(((profitability_revenue - direct_costs) / profitability_revenue) * 100, 2)
    ELSE NULL END AS gross_margin,
  CASE WHEN actual_hours > 0
    THEN ROUND(profitability_revenue / actual_hours, 2)
    ELSE NULL END AS effective_revenue_per_hour,
  (direct_cost_budget - direct_costs)::NUMERIC AS budget_variance,
  CASE
    WHEN profitability_revenue - direct_costs < 0 THEN 'Loss-making'
    WHEN profitability_revenue = 0 AND direct_costs > 0 THEN 'At risk'
    WHEN profitability_revenue > 0 AND ((profitability_revenue - direct_costs) / profitability_revenue) < 0.20 THEN 'Low margin'
    WHEN direct_cost_budget > 0 AND direct_costs > direct_cost_budget THEN 'At risk'
    ELSE 'Healthy'
  END AS profitability_health
FROM calculated;

GRANT SELECT ON project_profitability TO authenticated;
