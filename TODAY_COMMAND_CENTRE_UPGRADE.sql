-- Groenics Phase 1: Today Command Centre
-- Run in Supabase SQL Editor before opening /portal/today.

CREATE TABLE IF NOT EXISTS today_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN (
    'Task', 'Follow-up', 'Proposal', 'Invoice', 'Project', 'Milestone', 'Lead',
    'Meeting', 'Field Visit', 'Client Update', 'Renewal', 'Content', 'Other'
  )),
  source_record_type TEXT,
  source_record_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  action_date DATE NOT NULL DEFAULT CURRENT_DATE,
  action_time TIME,
  deadline DATE,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
  assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  department TEXT,
  related_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  related_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_today_actions_source
ON today_action_items(venture_id, source_record_type, source_record_id);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  performed_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_today_actions_venture_date ON today_action_items(venture_id, action_date);
CREATE INDEX IF NOT EXISTS idx_today_actions_status ON today_action_items(status);
CREATE INDEX IF NOT EXISTS idx_today_actions_employee ON today_action_items(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_today_actions_priority ON today_action_items(priority);
CREATE INDEX IF NOT EXISTS idx_activity_logs_record ON activity_logs(venture_id, record_type, record_id, created_at DESC);

ALTER TABLE today_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated today action access" ON today_action_items;
DROP POLICY IF EXISTS "Allow authenticated activity log access" ON activity_logs;

-- The current portal is restricted to one authenticated founder account.
-- Replace these policies with membership-based venture policies when user roles are introduced.
CREATE POLICY "Allow authenticated today action access"
ON today_action_items FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated activity log access"
ON activity_logs FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
