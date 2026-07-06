-- Groenics public enquiry capture
-- Run this in Supabase SQL Editor if you are not using SUPABASE_SERVICE_ROLE_KEY
-- in Vercel. It lets the website create new lead rows while keeping reads private.

DROP POLICY IF EXISTS "Allow public active venture lookup" ON ventures;
DROP POLICY IF EXISTS "Allow public website enquiry lead inserts" ON leads;

CREATE POLICY "Allow public active venture lookup"
ON ventures
FOR SELECT
TO anon
USING (status = 'Active');

CREATE POLICY "Allow public website enquiry lead inserts"
ON leads
FOR INSERT
TO anon
WITH CHECK (
  stage = 'New Lead'
  AND source IN ('Website Contact', 'Website Assessment', 'Website')
  AND email IS NOT NULL
  AND client_name IS NOT NULL
  AND contact_person IS NOT NULL
  AND venture_id IN (
    SELECT id
    FROM ventures
    WHERE status = 'Active'
  )
);
