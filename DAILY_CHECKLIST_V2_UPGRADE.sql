-- Groenics Founder Execution System V2
-- Additive, idempotent migration. Preserves all V1 checklist history.
-- Run in Supabase SQL Editor after DAILY_CHECKLIST_UPGRADE.sql, or run directly:
-- this script creates the base checklist table when it does not yet exist.

BEGIN;

CREATE TABLE IF NOT EXISTS public.daily_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL DEFAULT gen_random_uuid(),
  checklist_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, client_id)
);

-- Translate the V1 spelling before installing the V2 status constraint.
UPDATE public.daily_checklist_items SET status = 'not_done' WHERE status = 'not-done';

DO $$
DECLARE constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.daily_checklist_items'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.daily_checklist_items DROP CONSTRAINT IF EXISTS %I',
      constraint_row.conname
    );
  END LOOP;
END $$;

ALTER TABLE public.daily_checklist_items
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Uncategorized',
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'Important',
  ADD COLUMN IF NOT EXISTS scheduled_time TIME,
  ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'None',
  ADD COLUMN IF NOT EXISTS target_value NUMERIC,
  ADD COLUMN IF NOT EXISTS actual_value NUMERIC,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS is_top_three BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS result_text TEXT,
  ADD COLUMN IF NOT EXISTS missed_reason TEXT,
  ADD COLUMN IF NOT EXISTS missed_reason_note TEXT,
  ADD COLUMN IF NOT EXISTS source_template_id UUID,
  ADD COLUMN IF NOT EXISTS source_template_item_id UUID,
  ADD COLUMN IF NOT EXISTS related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rescheduled_from_id UUID REFERENCES public.daily_checklist_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rescheduled_to_id UUID REFERENCES public.daily_checklist_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.daily_checklist_items
  DROP CONSTRAINT IF EXISTS daily_checklist_items_status_v2_check,
  DROP CONSTRAINT IF EXISTS daily_checklist_items_category_check,
  DROP CONSTRAINT IF EXISTS daily_checklist_items_priority_check,
  DROP CONSTRAINT IF EXISTS daily_checklist_items_target_nonnegative_check,
  DROP CONSTRAINT IF EXISTS daily_checklist_items_actual_nonnegative_check,
  DROP CONSTRAINT IF EXISTS daily_checklist_items_missed_reason_check,
  DROP CONSTRAINT IF EXISTS daily_checklist_items_recurrence_check,
  ADD CONSTRAINT daily_checklist_items_status_v2_check
    CHECK (status IN ('pending', 'done', 'not_done', 'skipped')),
  ADD CONSTRAINT daily_checklist_items_category_check
    CHECK (category IN (
      'Faith', 'Fitness', 'Sales', 'Follow-ups', 'Client Delivery',
      'Product', 'Content', 'Learning', 'Market Research', 'Administration',
      'Personal', 'Personal Execution', 'Field Visits',
      'Uncategorized'
    )),
  ADD CONSTRAINT daily_checklist_items_priority_check
    CHECK (priority IN ('Critical', 'Important', 'Optional')),
  ADD CONSTRAINT daily_checklist_items_target_nonnegative_check
    CHECK (target_value IS NULL OR target_value >= 0),
  ADD CONSTRAINT daily_checklist_items_actual_nonnegative_check
    CHECK (actual_value IS NULL OR actual_value >= 0),
  ADD CONSTRAINT daily_checklist_items_missed_reason_check
    CHECK (missed_reason IS NULL OR missed_reason IN (
      'lack_of_time', 'travel_field_visit', 'unexpected_work', 'low_energy',
      'waiting_for_someone', 'poor_planning', 'distraction', 'task_too_large', 'other'
    )),
  ADD CONSTRAINT daily_checklist_items_recurrence_check
    CHECK (recurrence IN (
      'None', 'Daily', 'Weekly', 'Gym Days', 'Non Gym Days', 'Off Day',
      'Applicable Days', 'Closing Days', 'Everyday', '5-6 days/week',
      'Recovery day', 'Workout days', 'Office days', 'Monday-Saturday',
      'When qualified', 'When deal closes', 'Working days', 'Delivery days',
      'When received', '3 days/week', 'Product days', '2 days/week',
      'Field days', 'Research days', 'Publishing days', 'Scheduled days',
      '4-5 days/week', '4 days/week', 'Learning days'
    ));

CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'Custom Template',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (recurrence_type IN ('daily', 'weekdays', 'weekly', 'specific_date', 'custom_days', 'manual')),
  recurrence_days SMALLINT[] NOT NULL DEFAULT '{}',
  specific_date DATE,
  is_starter BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS public.checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 160),
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Uncategorized',
  priority TEXT NOT NULL DEFAULT 'Important',
  scheduled_time TIME,
  target_value NUMERIC CHECK (target_value IS NULL OR target_value >= 0),
  unit TEXT,
  top_three_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  UNIQUE (template_id, sort_order)
);

ALTER TABLE public.checklist_template_items
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE public.daily_checklist_items
  DROP CONSTRAINT IF EXISTS daily_checklist_items_source_template_id_fkey,
  ADD CONSTRAINT daily_checklist_items_source_template_id_fkey
    FOREIGN KEY (source_template_id) REFERENCES public.checklist_templates(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS daily_checklist_items_source_template_item_id_fkey,
  ADD CONSTRAINT daily_checklist_items_source_template_item_id_fkey
    FOREIGN KEY (source_template_item_id) REFERENCES public.checklist_template_items(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.daily_checklist_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reflection_date DATE NOT NULL,
  biggest_win TEXT,
  biggest_lesson TEXT,
  main_obstacle TEXT,
  general_notes TEXT,
  tomorrow_focus TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, reflection_date)
);

CREATE TABLE IF NOT EXISTS public.checklist_report_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  what_worked TEXT,
  what_failed TEXT,
  next_change TEXT,
  next_priorities TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period_type, period_start, period_end)
);

CREATE UNIQUE INDEX IF NOT EXISTS daily_checklist_generated_item_unique
  ON public.daily_checklist_items (user_id, checklist_date, source_template_item_id)
  WHERE source_template_item_id IS NOT NULL AND deleted_at IS NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.daily_checklist_items'::regclass
      AND conname = 'daily_checklist_generated_item_upsert_unique'
  ) THEN
    ALTER TABLE public.daily_checklist_items
      ADD CONSTRAINT daily_checklist_generated_item_upsert_unique
      UNIQUE (user_id, checklist_date, source_template_item_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS daily_checklist_user_date_idx
  ON public.daily_checklist_items (user_id, checklist_date, created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS daily_checklist_user_status_idx
  ON public.daily_checklist_items (user_id, status, checklist_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS daily_checklist_user_category_idx
  ON public.daily_checklist_items (user_id, category, checklist_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS daily_checklist_user_template_idx
  ON public.daily_checklist_items (user_id, source_template_id, checklist_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS daily_checklist_related_task_idx ON public.daily_checklist_items (related_task_id);
CREATE INDEX IF NOT EXISTS daily_checklist_related_lead_idx ON public.daily_checklist_items (related_lead_id);
CREATE INDEX IF NOT EXISTS daily_checklist_related_client_idx ON public.daily_checklist_items (related_client_id);
CREATE INDEX IF NOT EXISTS daily_checklist_related_project_idx ON public.daily_checklist_items (related_project_id);
CREATE INDEX IF NOT EXISTS checklist_templates_recurrence_idx
  ON public.checklist_templates (user_id, is_active, recurrence_type) WHERE archived_at IS NULL;

-- Enforce no more than three non-deleted Top 3 items per user/date.
CREATE OR REPLACE FUNCTION public.enforce_daily_top_three_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_top_three AND NEW.deleted_at IS NULL AND (
    SELECT COUNT(*)
    FROM public.daily_checklist_items item
    WHERE item.user_id = NEW.user_id
      AND item.checklist_date = NEW.checklist_date
      AND item.is_top_three
      AND item.deleted_at IS NULL
      AND item.id <> NEW.id
  ) >= 3 THEN
    RAISE EXCEPTION 'A date can have no more than three Top 3 items.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_daily_top_three_limit ON public.daily_checklist_items;
CREATE TRIGGER enforce_daily_top_three_limit
  BEFORE INSERT OR UPDATE OF is_top_three, checklist_date, deleted_at
  ON public.daily_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_top_three_limit();

-- Keep reviewed_at truthful and client-independent.
CREATE OR REPLACE FUNCTION public.set_checklist_reviewed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.reviewed_at := CASE WHEN NEW.status = 'pending' THEN NULL ELSE NOW() END;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_checklist_reviewed_at ON public.daily_checklist_items;
CREATE TRIGGER set_checklist_reviewed_at
  BEFORE UPDATE ON public.daily_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_checklist_reviewed_at();

CREATE OR REPLACE FUNCTION public.set_checklist_child_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'checklist_templates', 'checklist_template_items',
    'daily_checklist_reflections', 'checklist_report_reflections'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', target_table);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_checklist_child_updated_at()',
      target_table
    );
  END LOOP;
END $$;

-- RLS: ownership is always resolved from auth.uid(); the UI never supplies user_id.
ALTER TABLE public.daily_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checklist_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_report_reflections ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE policy_row RECORD;
DECLARE target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'daily_checklist_items', 'checklist_templates',
    'daily_checklist_reflections', 'checklist_report_reflections'
  ]
  LOOP
    FOR policy_row IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = target_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_row.policyname, target_table);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY "Owners can read %1$s" ON public.%1$I
       FOR SELECT TO authenticated USING (user_id = auth.uid())',
      target_table
    );
    EXECUTE format(
      'CREATE POLICY "Owners can create %1$s" ON public.%1$I
       FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())',
      target_table
    );
    EXECUTE format(
      'CREATE POLICY "Owners can update %1$s" ON public.%1$I
       FOR UPDATE TO authenticated USING (user_id = auth.uid())
       WITH CHECK (user_id = auth.uid())',
      target_table
    );
  END LOOP;
END $$;

DO $$
DECLARE policy_row RECORD;
BEGIN
  FOR policy_row IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'checklist_template_items'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.checklist_template_items',
      policy_row.policyname
    );
  END LOOP;
END $$;

CREATE POLICY "Owners can read template items"
  ON public.checklist_template_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.checklist_templates template
    WHERE template.id = template_id AND template.user_id = auth.uid()
  ));
CREATE POLICY "Owners can create template items"
  ON public.checklist_template_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.checklist_templates template
    WHERE template.id = template_id AND template.user_id = auth.uid()
  ));
CREATE POLICY "Owners can update template items"
  ON public.checklist_template_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.checklist_templates template
    WHERE template.id = template_id AND template.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.checklist_templates template
    WHERE template.id = template_id AND template.user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE ON
  public.daily_checklist_items,
  public.checklist_templates,
  public.checklist_template_items,
  public.daily_checklist_reflections,
  public.checklist_report_reflections
TO authenticated;
REVOKE DELETE ON
  public.daily_checklist_items,
  public.checklist_templates,
  public.checklist_template_items,
  public.daily_checklist_reflections,
  public.checklist_report_reflections
FROM authenticated;

-- Explicit user-requested exception: checklist items may be permanently
-- deleted through the bulk-delete UI, but only by their authenticated owner.
DROP POLICY IF EXISTS "Owners can permanently delete daily checklist items"
  ON public.daily_checklist_items;
CREATE POLICY "Owners can permanently delete daily checklist items"
  ON public.daily_checklist_items FOR DELETE TO authenticated
  USING (user_id = auth.uid());
GRANT DELETE ON public.daily_checklist_items TO authenticated;

DROP POLICY IF EXISTS "Owners can permanently delete checklist templates"
  ON public.checklist_templates;
CREATE POLICY "Owners can permanently delete checklist templates"
  ON public.checklist_templates FOR DELETE TO authenticated
  USING (user_id = auth.uid());
GRANT DELETE ON public.checklist_templates TO authenticated;

COMMIT;
