-- Groenics employees upgrade
-- Run this in Supabase SQL Editor to add employees and assign tasks to them.

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT,
  department TEXT,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS assigned_to_phone TEXT;

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_venture_id ON employees(venture_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_employee_id ON tasks(assigned_employee_id);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated employee access" ON employees;

CREATE POLICY "Allow authenticated employee access"
ON employees
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
