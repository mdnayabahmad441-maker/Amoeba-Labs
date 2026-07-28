-- Groenics Phase 16: Website Enquiry Quality
-- Run after PHASE_8_ACTIVITY_UNIFICATION_UPGRADE.sql and TODAY_COMMAND_CENTRE_UPGRADE.sql.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS normalized_phone TEXT,
  ADD COLUMN IF NOT EXISTS normalized_email TEXT,
  ADD COLUMN IF NOT EXISTS enquiry_count INTEGER NOT NULL DEFAULT 0 CHECK (enquiry_count >= 0),
  ADD COLUMN IF NOT EXISTS first_enquiry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_enquiry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_landing_page TEXT,
  ADD COLUMN IF NOT EXISTS last_landing_page TEXT,
  ADD COLUMN IF NOT EXISTS last_referrer TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_normalized_email ON leads(venture_id, normalized_email)
  WHERE normalized_email IS NOT NULL AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_normalized_phone ON leads(venture_id, normalized_phone)
  WHERE normalized_phone IS NOT NULL AND archived_at IS NULL;

UPDATE leads SET
  normalized_email = NULLIF(lower(trim(email)), ''),
  normalized_phone = CASE
    WHEN length(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')) = 10
      THEN '91' || regexp_replace(phone, '[^0-9]', '', 'g')
    ELSE NULLIF(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g'), '')
  END
WHERE normalized_email IS NULL OR normalized_phone IS NULL;

CREATE TABLE IF NOT EXISTS website_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE RESTRICT,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  source TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  message TEXT,
  landing_page TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_website_enquiries_lead ON website_enquiries(lead_id, created_at DESC);
ALTER TABLE website_enquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Venture members read website enquiries" ON website_enquiries;
CREATE POLICY "Venture members read website enquiries" ON website_enquiries FOR SELECT TO authenticated
USING (public.has_venture_access(venture_id));
