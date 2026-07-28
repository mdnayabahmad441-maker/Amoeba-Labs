-- Groenics Phase 17: Employees and Ventures simplification
-- Run after SECURITY_AND_DATA_PROTECTION_UPGRADE.sql.

BEGIN;

ALTER TABLE ventures
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS venture_kind TEXT NOT NULL DEFAULT 'Operating business';

ALTER TABLE ventures DROP CONSTRAINT IF EXISTS ventures_venture_kind_check;
ALTER TABLE ventures ADD CONSTRAINT ventures_venture_kind_check
  CHECK (venture_kind IN ('Operating business', 'Business unit', 'Product / offer'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_ventures_one_default
  ON ventures (is_default) WHERE is_default;

-- Prefer Groenics; otherwise retain the oldest active business as the default.
SELECT set_config('app.changing_default_venture', 'true', TRUE);
UPDATE ventures SET is_default = FALSE WHERE is_default;
UPDATE ventures
SET is_default = TRUE, status = 'Active', archived_at = NULL,
    venture_kind = 'Operating business'
WHERE id = COALESCE(
  (SELECT id FROM ventures WHERE lower(trim(venture_name)) = 'groenics' ORDER BY created_at LIMIT 1),
  (SELECT id FROM ventures WHERE status = 'Active' AND archived_at IS NULL ORDER BY created_at LIMIT 1)
);
SELECT set_config('app.changing_default_venture', 'false', TRUE);

UPDATE ventures
SET venture_kind = 'Product / offer'
WHERE lower(venture_name) LIKE '%naysha%educore%' AND is_default = FALSE;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_auth_user
  ON employees(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_founder_per_venture
  ON employees(venture_id) WHERE is_founder AND archived_at IS NULL;

-- Link an existing matching employee, or create the founder assignment record.
DO $$
DECLARE
  founder_user UUID;
  founder_email TEXT;
  default_venture UUID;
BEGIN
  SELECT user_id, users.email
  INTO founder_user, founder_email
  FROM portal_memberships membership
  JOIN auth.users users ON users.id = membership.user_id
  JOIN ventures venture ON venture.id = membership.venture_id
  WHERE membership.role = 'Founder'
    AND membership.status = 'Active'
    AND venture.is_default
  ORDER BY membership.created_at
  LIMIT 1;

  SELECT id INTO default_venture FROM ventures WHERE is_default LIMIT 1;

  IF founder_user IS NOT NULL AND default_venture IS NOT NULL THEN
    UPDATE employees
    SET auth_user_id = founder_user, is_founder = TRUE, status = 'Active',
        archived_at = NULL, updated_at = NOW()
    WHERE id = (
      SELECT id FROM employees
      WHERE venture_id = default_venture
        AND (lower(email) = lower(founder_email) OR is_founder)
      ORDER BY created_at
      LIMIT 1
    );

    IF NOT FOUND THEN
      INSERT INTO employees (
        venture_id, full_name, role, department, email, status,
        notes, auth_user_id, is_founder
      ) VALUES (
        default_venture, 'Founder', 'Founder', 'Leadership', founder_email,
        'Active', 'Default owner for founder-managed work.', founder_user, TRUE
      );
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_default_venture(target_venture UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_venture_access(target_venture) THEN
    RAISE EXCEPTION 'You do not have access to this venture.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ventures
    WHERE id = target_venture AND status = 'Active' AND archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Only an active, unarchived venture can be the default.';
  END IF;

  PERFORM set_config('app.changing_default_venture', 'true', TRUE);
  UPDATE ventures SET is_default = FALSE WHERE is_default;
  UPDATE ventures SET is_default = TRUE WHERE id = target_venture;
  PERFORM set_config('app.changing_default_venture', 'false', TRUE);
END;
$$;

REVOKE ALL ON FUNCTION public.set_default_venture(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_default_venture(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_default_venture()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.is_default
    AND current_setting('app.changing_default_venture', TRUE) IS DISTINCT FROM 'true'
    AND (
    NEW.is_default = FALSE OR NEW.status <> 'Active' OR NEW.archived_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Choose another default venture before deactivating or archiving this one.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_default_venture ON ventures;
CREATE TRIGGER protect_default_venture
BEFORE UPDATE OF is_default, status, archived_at ON ventures
FOR EACH ROW EXECUTE FUNCTION public.protect_default_venture();

CREATE OR REPLACE FUNCTION public.protect_founder_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.is_founder AND (
    NEW.is_founder = FALSE OR NEW.status <> 'Active' OR NEW.archived_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'The founder assignment record must remain active.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_founder_employee ON employees;
CREATE TRIGGER protect_founder_employee
BEFORE UPDATE OF is_founder, status, archived_at ON employees
FOR EACH ROW EXECUTE FUNCTION public.protect_founder_employee();

COMMIT;
