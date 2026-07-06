-- Groenics business operations upgrade
-- Run this in Supabase SQL Editor to enable proposals, projects, milestones,
-- and configurable business settings.

CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL DEFAULT 'Groenics',
  legal_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  tax_id TEXT,
  bank_details TEXT,
  upi_id TEXT,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  proposal_prefix TEXT NOT NULL DEFAULT 'PROP',
  default_payment_terms TEXT DEFAULT 'Payment due within 15 days.',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (venture_id)
);

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  proposal_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  rate DECIMAL(12, 2) NOT NULL DEFAULT 0,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  project_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Planning',
  start_date DATE,
  due_date DATE,
  budget DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Not Started',
  amount DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_settings_venture_id ON business_settings(venture_id);
CREATE INDEX IF NOT EXISTS idx_proposals_venture_id ON proposals(venture_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal_id ON proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_projects_venture_id ON projects(venture_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id);

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated business settings access" ON business_settings;
DROP POLICY IF EXISTS "Allow authenticated proposal access" ON proposals;
DROP POLICY IF EXISTS "Allow authenticated proposal item access" ON proposal_items;
DROP POLICY IF EXISTS "Allow authenticated project access" ON projects;
DROP POLICY IF EXISTS "Allow authenticated project milestone access" ON project_milestones;

CREATE POLICY "Allow authenticated business settings access"
ON business_settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated proposal access"
ON proposals
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated proposal item access"
ON proposal_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated project access"
ON projects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated project milestone access"
ON project_milestones
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

INSERT INTO business_settings (venture_id)
SELECT ventures.id
FROM ventures
WHERE ventures.status = 'Active'
  AND NOT EXISTS (
    SELECT 1
    FROM business_settings
    WHERE business_settings.venture_id = ventures.id
  );
