-- Groenics portal allowed users seed
-- Run in Supabase SQL Editor after adding/changing portal auth users.
-- Idempotent: it grants founder membership to allowed auth users for all ventures.

BEGIN;

INSERT INTO portal_memberships (user_id, venture_id, role, status)
SELECT users.id, ventures.id, 'Founder', 'Active'
FROM auth.users AS users
CROSS JOIN ventures
WHERE LOWER(users.email) IN (
  LOWER('groenics@gmail.com'),
  LOWER('mdnayabahmad441@gmail.com')
)
ON CONFLICT (user_id, venture_id)
DO UPDATE SET role = 'Founder', status = 'Active', updated_at = NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users AS users
    JOIN portal_memberships membership ON membership.user_id = users.id
    WHERE LOWER(users.email) IN (
      LOWER('groenics@gmail.com'),
      LOWER('mdnayabahmad441@gmail.com')
    )
      AND membership.role = 'Founder'
      AND membership.status = 'Active'
  ) THEN
    RAISE EXCEPTION
      'No active founder membership was created. Verify the allowed email exists in auth.users.';
  END IF;
END $$;

COMMIT;
