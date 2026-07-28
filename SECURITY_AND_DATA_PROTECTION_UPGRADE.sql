-- Groenics Phase 2: Security and Data Protection
-- Review and run in Supabase SQL Editor before deploying the matching UI changes.
-- This migration is additive and idempotent. It does not delete business data.

BEGIN;

CREATE TABLE IF NOT EXISTS portal_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'Founder' CHECK (role IN ('Founder', 'Admin', 'Member', 'Viewer')),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, venture_id)
);

CREATE INDEX IF NOT EXISTS idx_portal_memberships_user
  ON portal_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_portal_memberships_venture
  ON portal_memberships(venture_id, status);

ALTER TABLE portal_memberships ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER avoids recursive membership-policy evaluation. The function
-- returns only a boolean and cannot expose membership rows.
CREATE OR REPLACE FUNCTION public.has_venture_access(target_venture UUID)
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
      AND membership.venture_id = target_venture
      AND membership.status = 'Active'
  );
$$;

REVOKE ALL ON FUNCTION public.has_venture_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_venture_access(UUID) TO authenticated;

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
  );
$$;

REVOKE ALL ON FUNCTION public.is_portal_founder() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_portal_founder() TO authenticated;

-- Seed the existing founder into every current venture. Change this email only
-- if the application's PORTAL_ALLOWED_EMAIL is changed at the same time.
INSERT INTO portal_memberships (user_id, venture_id, role, status)
SELECT users.id, ventures.id, 'Founder', 'Active'
FROM auth.users AS users
CROSS JOIN ventures
WHERE LOWER(users.email) = LOWER('mdnayabahmad441@gmail.com')
ON CONFLICT (user_id, venture_id)
DO UPDATE SET role = 'Founder', status = 'Active', updated_at = NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM portal_memberships
    WHERE role = 'Founder' AND status = 'Active'
  ) THEN
    RAISE EXCEPTION
      'Security migration stopped: no active founder membership was created. Verify the founder email in auth.users.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.add_venture_creator_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.portal_memberships (user_id, venture_id, role, status)
  VALUES (auth.uid(), NEW.id, 'Founder', 'Active')
  ON CONFLICT (user_id, venture_id)
  DO UPDATE SET role = 'Founder', status = 'Active', updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS add_venture_creator_membership ON ventures;
CREATE TRIGGER add_venture_creator_membership
AFTER INSERT ON ventures
FOR EACH ROW
EXECUTE FUNCTION public.add_venture_creator_membership();

DROP POLICY IF EXISTS "Members can read their memberships" ON portal_memberships;
CREATE POLICY "Members can read their memberships"
ON portal_memberships FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Soft-delete metadata. Financial records also receive an explicit void state.
ALTER TABLE ventures ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE ventures ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS void_reason TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE today_action_items ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE today_action_items ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.protect_archive_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
    NEW.archived_by := CASE WHEN NEW.archived_at IS NULL THEN NULL ELSE auth.uid() END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_invoice_void_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.voided_at IS DISTINCT FROM OLD.voided_at THEN
    NEW.voided_by := CASE WHEN NEW.voided_at IS NULL THEN NULL ELSE auth.uid() END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_record_protection_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  audit_action TEXT;
  new_row JSONB := to_jsonb(NEW);
  old_row JSONB := to_jsonb(OLD);
BEGIN
  IF TG_TABLE_NAME = 'invoices'
     AND new_row ->> 'voided_at' IS DISTINCT FROM old_row ->> 'voided_at'
     AND NULLIF(new_row ->> 'voided_at', '') IS NOT NULL THEN
    audit_action := 'voided';
  ELSIF new_row ->> 'archived_at' IS DISTINCT FROM old_row ->> 'archived_at' THEN
    audit_action := CASE
      WHEN NULLIF(new_row ->> 'archived_at', '') IS NULL THEN 'restored'
      ELSE 'archived'
    END;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.activity_logs (
    venture_id, record_type, record_id, action, details, performed_by
  ) VALUES (
    CASE
      WHEN TG_TABLE_NAME = 'ventures' THEN (new_row ->> 'id')::UUID
      ELSE (new_row ->> 'venture_id')::UUID
    END,
    INITCAP(REPLACE(TG_TABLE_NAME, '_', ' ')),
    (new_row ->> 'id')::UUID,
    audit_action,
    CASE
      WHEN audit_action = 'voided'
        THEN jsonb_build_object('reason', new_row ->> 'void_reason')
      ELSE '{}'::jsonb
    END,
    auth.uid()
  );

  RETURN NEW;
END;
$$;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'ventures', 'clients', 'leads', 'tasks', 'followups', 'employees',
    'proposals', 'projects', 'invoices', 'expenses', 'today_action_items'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_archive_actor ON public.%I', table_name);
    EXECUTE format(
      'CREATE TRIGGER set_archive_actor BEFORE UPDATE OF archived_at ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.protect_archive_metadata()',
      table_name
    );
    EXECUTE format('DROP TRIGGER IF EXISTS audit_record_protection ON public.%I', table_name);
    EXECUTE format(
      'CREATE TRIGGER audit_record_protection AFTER UPDATE OF archived_at ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.log_record_protection_change()',
      table_name
    );
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS set_invoice_void_actor ON invoices;
CREATE TRIGGER set_invoice_void_actor
BEFORE UPDATE OF voided_at ON invoices
FOR EACH ROW EXECUTE FUNCTION public.protect_invoice_void_metadata();

DROP TRIGGER IF EXISTS audit_invoice_void ON invoices;
CREATE TRIGGER audit_invoice_void
AFTER UPDATE OF voided_at ON invoices
FOR EACH ROW EXECUTE FUNCTION public.log_record_protection_change();

-- Replace permissive authenticated policies with venture membership checks.
DO $$
DECLARE
  target_table TEXT;
  policy_row RECORD;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'ventures', 'schools', 'clients', 'leads', 'tasks', 'reminders', 'invoices',
    'employees', 'followups', 'business_settings', 'proposals', 'projects',
    'expenses', 'today_action_items', 'activity_logs', 'calendar_events',
    'calendar_integrations'
  ]
  LOOP
    IF to_regclass('public.' || target_table) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
      FOR policy_row IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = target_table
          AND 'authenticated' = ANY(roles)
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_row.policyname, target_table);
      END LOOP;

      IF target_table = 'ventures' THEN
        EXECUTE 'CREATE POLICY "Venture members can access ventures"
          ON public.ventures FOR ALL TO authenticated
          USING (public.has_venture_access(id))
          WITH CHECK (public.has_venture_access(id) OR public.is_portal_founder())';
      ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns AS schema_column
        WHERE schema_column.table_schema = 'public'
          AND schema_column.table_name = target_table
          AND schema_column.column_name = 'venture_id'
      ) THEN
        EXECUTE format(
          'CREATE POLICY "Venture members can access %1$s"
           ON public.%1$I FOR ALL TO authenticated
           USING (public.has_venture_access(venture_id))
           WITH CHECK (public.has_venture_access(venture_id))',
          target_table
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- Audit history is append-only for normal portal users.
DROP POLICY IF EXISTS "Venture members can access activity_logs" ON activity_logs;
CREATE POLICY "Venture members can read activity logs"
ON activity_logs FOR SELECT TO authenticated
USING (public.has_venture_access(venture_id));
CREATE POLICY "Venture members can add activity logs"
ON activity_logs FOR INSERT TO authenticated
WITH CHECK (
  public.has_venture_access(venture_id)
  AND performed_by = auth.uid()
);
REVOKE UPDATE, DELETE ON activity_logs FROM authenticated;

-- Child records inherit authorization through their parent.
DO $$
DECLARE policy_row RECORD;
BEGIN
  IF to_regclass('public.proposal_items') IS NOT NULL THEN
    FOR policy_row IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='proposal_items' AND 'authenticated'=ANY(roles)
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.proposal_items', policy_row.policyname); END LOOP;
    EXECUTE 'CREATE POLICY "Venture members can access proposal items"
      ON proposal_items FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM proposals p WHERE p.id = proposal_id AND public.has_venture_access(p.venture_id)))
      WITH CHECK (EXISTS (SELECT 1 FROM proposals p WHERE p.id = proposal_id AND public.has_venture_access(p.venture_id)))';
  END IF;

  IF to_regclass('public.project_milestones') IS NOT NULL THEN
    FOR policy_row IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='project_milestones' AND 'authenticated'=ANY(roles)
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_milestones', policy_row.policyname); END LOOP;
    EXECUTE 'CREATE POLICY "Venture members can access project milestones"
      ON project_milestones FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND public.has_venture_access(p.venture_id)))
      WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND public.has_venture_access(p.venture_id)))';
  END IF;

  IF to_regclass('public.invoice_items') IS NOT NULL THEN
    FOR policy_row IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='invoice_items' AND 'authenticated'=ANY(roles)
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.invoice_items', policy_row.policyname); END LOOP;
    EXECUTE 'CREATE POLICY "Venture members can access invoice items"
      ON invoice_items FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND public.has_venture_access(i.venture_id)))
      WITH CHECK (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND public.has_venture_access(i.venture_id)))';
  END IF;

  IF to_regclass('public.payments') IS NOT NULL THEN
    FOR policy_row IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='payments' AND 'authenticated'=ANY(roles)
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.payments', policy_row.policyname); END LOOP;
    EXECUTE 'CREATE POLICY "Venture members can access payments"
      ON payments FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND public.has_venture_access(i.venture_id)))
      WITH CHECK (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND public.has_venture_access(i.venture_id)))';
  END IF;
END $$;

-- Financial history may be corrected or voided, but never physically deleted
-- through the authenticated browser client.
REVOKE DELETE ON
  ventures, clients, leads, tasks, followups, employees, proposals, projects,
  invoices, payments, expenses, today_action_items
FROM authenticated;

COMMIT;
