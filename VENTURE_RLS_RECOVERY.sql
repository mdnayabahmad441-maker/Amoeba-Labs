-- Restores the authorized portal owners' ability to create and manage ventures.
-- Run this once in the Supabase SQL Editor when venture writes return HTTP 403.
-- This keeps RLS enabled and does not modify or delete business records.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_portal_founder()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.portal_memberships membership
    WHERE membership.user_id = auth.uid()
      AND membership.role = 'Founder'
      AND membership.status = 'Active'
  )
  OR LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN (
    LOWER('groenics@gmail.com'),
    LOWER('mdnayabahmad441@gmail.com')
  );
$$;

REVOKE ALL ON FUNCTION public.is_portal_founder() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_portal_founder() TO authenticated;

-- The creator trigger from SECURITY_AND_DATA_PROTECTION_UPGRADE.sql will add
-- a founder membership to each new venture. Recreate the policy explicitly so
-- a previous migration's policy cannot continue to reject those inserts.
DROP POLICY IF EXISTS "Venture members can access ventures" ON public.ventures;
CREATE POLICY "Venture members can access ventures"
ON public.ventures FOR ALL TO authenticated
USING (public.has_venture_access(id) OR public.is_portal_founder())
WITH CHECK (public.has_venture_access(id) OR public.is_portal_founder());

-- Restore memberships for the same allowed owners on existing ventures.
INSERT INTO public.portal_memberships (user_id, venture_id, role, status)
SELECT users.id, ventures.id, 'Founder', 'Active'
FROM auth.users AS users
CROSS JOIN public.ventures AS ventures
WHERE LOWER(users.email) IN (
  LOWER('groenics@gmail.com'),
  LOWER('mdnayabahmad441@gmail.com')
)
ON CONFLICT (user_id, venture_id)
DO UPDATE SET role = 'Founder', status = 'Active', updated_at = NOW();

COMMIT;
