-- Groenics Phase 12: Correct Financial Terminology
-- Run after PHASE_11_PROJECT_PROFITABILITY_UPGRADE.sql.
-- Safe to run repeatedly. Back up production before applying migrations.

CREATE TABLE IF NOT EXISTS project_revenue_recognitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  recognition_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_cash_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE RESTRICT,
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('Founder withdrawal','Tax reserve')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revenue_recognition_venture_date
  ON project_revenue_recognitions(venture_id, recognition_date);
CREATE INDEX IF NOT EXISTS idx_revenue_recognition_project_date
  ON project_revenue_recognitions(project_id, recognition_date);
CREATE INDEX IF NOT EXISTS idx_cash_adjustments_venture_date
  ON financial_cash_adjustments(venture_id, adjustment_date);

ALTER TABLE project_revenue_recognitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_cash_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Venture members manage revenue recognitions" ON project_revenue_recognitions;
CREATE POLICY "Venture members manage revenue recognitions"
ON project_revenue_recognitions FOR ALL TO authenticated
USING (public.has_venture_access(venture_id))
WITH CHECK (
  public.has_venture_access(venture_id)
  AND EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_id AND projects.venture_id = project_revenue_recognitions.venture_id
  )
);

DROP POLICY IF EXISTS "Venture members manage cash adjustments" ON financial_cash_adjustments;
CREATE POLICY "Venture members manage cash adjustments"
ON financial_cash_adjustments FOR ALL TO authenticated
USING (public.has_venture_access(venture_id))
WITH CHECK (public.has_venture_access(venture_id));
