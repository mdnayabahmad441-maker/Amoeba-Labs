-- Groenics daily checklist storage
-- Run this once in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.daily_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL DEFAULT gen_random_uuid(),
  checklist_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 160),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'done', 'not-done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, client_id)
);

CREATE INDEX IF NOT EXISTS daily_checklist_items_user_date_idx
  ON public.daily_checklist_items (user_id, checklist_date DESC, created_at ASC);

ALTER TABLE public.daily_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their checklist items" ON public.daily_checklist_items;
CREATE POLICY "Users can read their checklist items"
  ON public.daily_checklist_items FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their checklist items" ON public.daily_checklist_items;
CREATE POLICY "Users can create their checklist items"
  ON public.daily_checklist_items FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their checklist items" ON public.daily_checklist_items;
CREATE POLICY "Users can update their checklist items"
  ON public.daily_checklist_items FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their checklist items" ON public.daily_checklist_items;
CREATE POLICY "Users can delete their checklist items"
  ON public.daily_checklist_items FOR DELETE
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_checklist_items TO authenticated;

CREATE OR REPLACE FUNCTION public.set_daily_checklist_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_daily_checklist_updated_at ON public.daily_checklist_items;
CREATE TRIGGER set_daily_checklist_updated_at
  BEFORE UPDATE ON public.daily_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_daily_checklist_updated_at();
