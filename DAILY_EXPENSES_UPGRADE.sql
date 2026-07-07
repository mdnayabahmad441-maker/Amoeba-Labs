-- Groenics daily expenses upgrade
-- Run this in Supabase SQL Editor to enable the Daily Expense Tracker.

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'Miscellaneous',
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'UPI',
  vendor TEXT,
  paid_by TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_venture_id ON expenses(venture_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated expense access" ON expenses;

CREATE POLICY "Allow authenticated expense access"
ON expenses
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
