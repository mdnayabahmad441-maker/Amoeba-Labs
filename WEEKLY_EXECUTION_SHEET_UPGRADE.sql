-- Groenics Weekly Execution Sheet
-- Run after DAILY_CHECKLIST_UPGRADE.sql and DAILY_CHECKLIST_V2_UPGRADE.sql.
-- Idempotent: safe to rerun. No existing daily_checklist_items rows are deleted or changed.

BEGIN;

CREATE TABLE IF NOT EXISTS public.checklist_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Administration',
  priority TEXT NOT NULL DEFAULT 'Important' CHECK (priority IN ('Critical','Important','Optional')),
  default_target_value NUMERIC,
  default_unit TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS checklist_tasks_user_name_active_unique
  ON public.checklist_tasks(user_id, lower(name)) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.checklist_routine_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.checklist_tasks(id) ON DELETE RESTRICT,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  default_target_value NUMERIC,
  default_unit TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, task_id, weekday, effective_from)
);

CREATE TABLE IF NOT EXISTS public.checklist_week_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  task_id UUID REFERENCES public.checklist_tasks(id) ON DELETE SET NULL,
  task_name_snapshot TEXT NOT NULL,
  category_snapshot TEXT NOT NULL,
  priority_snapshot TEXT NOT NULL CHECK (priority_snapshot IN ('Critical','Important','Optional')),
  target_value_snapshot NUMERIC,
  unit_snapshot TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL DEFAULT 'recurring' CHECK (source_type IN ('recurring','manual','copied','migrated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(user_id, week_start_date, task_id)
);

CREATE TABLE IF NOT EXISTS public.checklist_week_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  week_task_id UUID NOT NULL REFERENCES public.checklist_week_tasks(id) ON DELETE RESTRICT,
  execution_date DATE NOT NULL,
  is_scheduled BOOLEAN NOT NULL DEFAULT TRUE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_not_applicable BOOLEAN NOT NULL DEFAULT FALSE,
  is_top_three BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(user_id, week_task_id, execution_date)
);

CREATE TABLE IF NOT EXISTS public.checklist_generated_weeks (
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id,week_start_date)
);

CREATE INDEX IF NOT EXISTS checklist_routine_effective_idx ON public.checklist_routine_days(user_id,weekday,effective_from,effective_until) WHERE is_active;
CREATE INDEX IF NOT EXISTS checklist_week_tasks_week_idx ON public.checklist_week_tasks(user_id,week_start_date,sort_order) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS checklist_week_cells_date_idx ON public.checklist_week_cells(user_id,execution_date) WHERE deleted_at IS NULL;

ALTER TABLE public.checklist_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_routine_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_week_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_week_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_generated_weeks ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT; p RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY['checklist_tasks','checklist_routine_days','checklist_week_tasks','checklist_week_cells','checklist_generated_weeks'] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
      'Owners manage ' || replace(t,'_',' '), t);
  END LOOP;
END $$;

GRANT SELECT,INSERT,UPDATE ON public.checklist_tasks,public.checklist_routine_days,public.checklist_week_tasks,public.checklist_week_cells TO authenticated;
GRANT SELECT,INSERT ON public.checklist_generated_weeks TO authenticated;

CREATE OR REPLACE FUNCTION public.check_weekly_top_three_limit()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.is_top_three AND NEW.deleted_at IS NULL AND (
    SELECT COUNT(*) FROM public.checklist_week_cells
    WHERE user_id=NEW.user_id AND execution_date=NEW.execution_date
      AND is_top_three AND deleted_at IS NULL AND id<>NEW.id
  ) >= 3 THEN RAISE EXCEPTION 'Only three Daily Top 3 tasks are allowed per day'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS enforce_weekly_top_three ON public.checklist_week_cells;
CREATE TRIGGER enforce_weekly_top_three BEFORE INSERT OR UPDATE OF is_top_three
ON public.checklist_week_cells FOR EACH ROW EXECUTE FUNCTION public.check_weekly_top_three_limit();

CREATE OR REPLACE FUNCTION public.protect_checklist_execution_dates()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE india_today DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
BEGIN
  -- SECURITY DEFINER generation/migration functions run as their owner and may
  -- create snapshots. Authenticated users cannot directly rewrite past cells.
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.execution_date < india_today
    AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Past checklist days are read-only';
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.execution_date > india_today
    AND NEW.is_completed AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Future checklist days cannot be completed';
  END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
DROP TRIGGER IF EXISTS protect_checklist_execution_dates ON public.checklist_week_cells;
CREATE TRIGGER protect_checklist_execution_dates
BEFORE INSERT OR UPDATE OR DELETE ON public.checklist_week_cells
FOR EACH ROW EXECUTE FUNCTION public.protect_checklist_execution_dates();

CREATE OR REPLACE FUNCTION public.setup_default_weekly_routine()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid UUID:=auth.uid(); r RECORD; task_uuid UUID; added INTEGER:=0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  CREATE TEMP TABLE IF NOT EXISTS routine_seed(
    name TEXT, category TEXT, priority TEXT, target NUMERIC, unit TEXT, days SMALLINT[], ordering INTEGER
  ) ON COMMIT DROP;
  TRUNCATE routine_seed;
  INSERT INTO routine_seed VALUES
  ('Offer Salah on time','Faith','Critical',5,'Count',ARRAY[1,2,3,4,5,6,7],10),
  ('Quran or spiritual study','Faith','Important',20,'Minutes',ARRAY[1,2,3,4,5,6,7],20),
  ('Follow planned diet','Fitness','Critical',1,'Yes/No',ARRAY[1,2,3,4,5,6,7],30),
  ('Meet protein target','Fitness','Critical',100,'Grams',ARRAY[1,2,3,4,5,6,7],40),
  ('Drink water','Fitness','Important',3,'Litres',ARRAY[1,2,3,4,5,6,7],50),
  ('Sleep including nap','Fitness','Critical',7,'Hours',ARRAY[1,2,3,4,5,6,7],60),
  ('Write Daily Top 3','Personal Execution','Critical',3,'Count',ARRAY[1,2,3,4,5,6,7],70),
  ('Clear urgent messages','Administration','Important',100,'Percentage',ARRAY[1,2,3,4,5,6,7],80),
  ('Complete evening review','Personal Execution','Critical',1,'Session',ARRAY[1,2,3,4,5,6,7],90),
  ('Plan tomorrow','Personal Execution','Critical',1,'Session',ARRAY[1,2,3,4,5,6,7],100),
  ('Gym workout','Fitness','Critical',60,'Minutes',ARRAY[1,3,5,6],200),
  ('Research qualified prospects','Sales','Important',10,'Count',ARRAY[1],210),
  ('Send targeted outreaches','Sales','Critical',20,'Messages',ARRAY[1],220),
  ('Make prospect calls','Sales','Critical',5,'Calls',ARRAY[1],230),
  ('Complete due follow-ups','Follow-ups','Critical',100,'Percentage',ARRAY[1,5,6],240),
  ('Book meeting or demo','Sales','Critical',1,'Meeting',ARRAY[1],250),
  ('Update CRM and next actions','Administration','Critical',100,'Percentage',ARRAY[1],260),
  ('Client delivery','Client Delivery','Critical',120,'Minutes',ARRAY[1,6],270),
  ('Publish scheduled content','Content','Important',1,'Post',ARRAY[1,6],280),
  ('Recovery walk','Fitness','Important',30,'Minutes',ARRAY[2,4],300),
  ('Confirm school appointments','Field Visits','Critical',3,'Count',ARRAY[2],310),
  ('Visit qualified schools','Field Visits','Critical',3,'Count',ARRAY[2],320),
  ('Speak with decision-makers','Field Visits','Critical',3,'Count',ARRAY[2],330),
  ('Conduct school demonstrations','Field Visits','Critical',2,'Demos',ARRAY[2],340),
  ('Record school problems','Market Research','Important',5,'Count',ARRAY[2],350),
  ('Collect verified school contacts','Field Visits','Important',3,'Count',ARRAY[2],360),
  ('Record school visit notes in CRM','Field Visits','Critical',100,'Percentage',ARRAY[2],370),
  ('Schedule school next actions','Field Visits','Critical',100,'Percentage',ARRAY[2],380),
  ('Capture school field-visit footage','Content','Optional',5,'Clips',ARRAY[2],390),
  ('Focused client delivery','Client Delivery','Critical',180,'Minutes',ARRAY[3],400),
  ('Complete client milestone','Client Delivery','Critical',1,'Count',ARRAY[3],410),
  ('Test work before delivery','Client Delivery','Critical',1,'Yes/No',ARRAY[3],420),
  ('Send client progress update','Client Delivery','Important',1,'Message',ARRAY[3],430),
  ('Complete due lead follow-ups','Follow-ups','Critical',100,'Percentage',ARRAY[3],440),
  ('Follow up on open proposals','Follow-ups','Critical',100,'Percentage',ARRAY[3,5],450),
  ('Update CRM and project progress','Administration','Important',100,'Percentage',ARRAY[3],460),
  ('Request or record feedback','Client Delivery','Important',1,'Count',ARRAY[3],470),
  ('Publish product demonstration','Content','Important',1,'Post',ARRAY[3],480),
  ('Confirm business appointments','Field Visits','Critical',3,'Count',ARRAY[4],500),
  ('Visit qualified businesses','Field Visits','Critical',3,'Count',ARRAY[4],510),
  ('Speak with owners or decision-makers','Field Visits','Critical',3,'Count',ARRAY[4],520),
  ('Conduct demonstrations','Field Visits','Critical',2,'Demos',ARRAY[4],530),
  ('Record operational problems','Market Research','Important',5,'Count',ARRAY[4],540),
  ('Collect verified business contacts','Field Visits','Important',3,'Count',ARRAY[4],550),
  ('Record visit outcomes','Field Visits','Critical',100,'Percentage',ARRAY[4],560),
  ('Schedule business next actions','Field Visits','Critical',100,'Percentage',ARRAY[4],570),
  ('Capture business field-visit footage','Content','Optional',5,'Clips',ARRAY[4],580),
  ('Complete Jummah and Friday spiritual routine','Faith','Critical',1,'Yes/No',ARRAY[5],600),
  ('Follow up on overdue payments','Follow-ups','Critical',100,'Percentage',ARRAY[5],610),
  ('Make closing calls','Sales','Critical',5,'Calls',ARRAY[5],620),
  ('Ask a qualified prospect for the sale','Sales','Critical',1,'Count',ARRAY[5],630),
  ('Send required proposals','Sales','Important',1,'Proposal',ARRAY[5],640),
  ('Update all next actions','Administration','Critical',100,'Percentage',ARRAY[5],650),
  ('Publish case study or testimonial','Content','Important',1,'Post',ARRAY[5],660),
  ('Conduct demo or closing meeting','Sales','Critical',1,'Meeting',ARRAY[6],700),
  ('Ask qualified prospects for the sale','Sales','Critical',1,'Count',ARRAY[6],710),
  ('Collect advance payment when applicable','Sales','Critical',1,'Count',ARRAY[6],720),
  ('Batch-record videos','Content','Important',3,'Count',ARRAY[6],730),
  ('Edit content pieces','Content','Important',2,'Count',ARRAY[6],740),
  ('Schedule next week''s content','Content','Important',1,'Session',ARRAY[6],750),
  ('Sunday recovery walk','Fitness','Important',45,'Minutes',ARRAY[7],800),
  ('Measure body weight','Fitness','Important',1,'Count',ARRAY[7],810),
  ('Measure waist','Fitness','Important',1,'Count',ARRAY[7],820),
  ('Complete weekly sales review','Administration','Critical',1,'Session',ARRAY[7],830),
  ('Review revenue, expenses and cash collected','Administration','Critical',1,'Session',ARRAY[7],840),
  ('Review clients, projects and deadlines','Client Delivery','Important',1,'Session',ARRAY[7],850),
  ('Review Salah, fitness and routine consistency','Personal Execution','Important',1,'Session',ARRAY[7],860),
  ('Identify the week''s biggest business problem','Market Research','Important',1,'Count',ARRAY[7],870),
  ('Prepare qualified prospects for next week','Sales','Critical',50,'Count',ARRAY[7],880),
  ('Schedule next week''s meetings and visits','Field Visits','Critical',1,'Session',ARRAY[7],890),
  ('Plan next week''s content','Content','Important',1,'Session',ARRAY[7],900),
  ('Document one reusable process','Product','Important',1,'Count',ARRAY[7],910),
  ('Rank one business opportunity','Market Research','Important',1,'Count',ARRAY[7],920),
  ('Spend focused time with family','Personal Execution','Important',60,'Minutes',ARRAY[7],930);

  FOR r IN SELECT * FROM routine_seed LOOP
    INSERT INTO public.checklist_tasks(user_id,name,category,priority,default_target_value,default_unit)
    VALUES(uid,r.name,r.category,r.priority,r.target,r.unit)
    ON CONFLICT(user_id,lower(name)) WHERE archived_at IS NULL DO UPDATE SET updated_at=checklist_tasks.updated_at
    RETURNING id INTO task_uuid;
    INSERT INTO public.checklist_routine_days(user_id,task_id,weekday,default_target_value,default_unit,sort_order,effective_from)
    SELECT uid,task_uuid,d,r.target,r.unit,r.ordering,(NOW() AT TIME ZONE 'Asia/Kolkata')::DATE
    FROM unnest(r.days) d
    WHERE NOT EXISTS(
      SELECT 1 FROM public.checklist_routine_days existing
      WHERE existing.user_id=uid AND existing.task_id=task_uuid
        AND existing.weekday=d AND existing.is_active
    )
    ON CONFLICT(user_id,task_id,weekday,effective_from) DO NOTHING;
    GET DIAGNOSTICS added=ROW_COUNT;
  END LOOP;
  RETURN added;
END $$;

CREATE OR REPLACE FUNCTION public.generate_checklist_week(requested_date DATE)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid UUID:=auth.uid(); ws DATE; inserted_count INTEGER;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  ws:=requested_date-(EXTRACT(ISODOW FROM requested_date)::INTEGER-1);
  INSERT INTO public.checklist_generated_weeks(user_id,week_start_date) VALUES(uid,ws)
  ON CONFLICT(user_id,week_start_date) DO NOTHING;
  GET DIAGNOSTICS inserted_count=ROW_COUNT;
  IF inserted_count=0 THEN RETURN 0; END IF;
  INSERT INTO public.checklist_week_tasks(user_id,week_start_date,task_id,task_name_snapshot,category_snapshot,
    priority_snapshot,target_value_snapshot,unit_snapshot,sort_order,source_type)
  SELECT uid,ws,t.id,t.name,t.category,t.priority,
    MAX(rd.default_target_value),MAX(rd.default_unit),MIN(rd.sort_order),'recurring'
  FROM public.checklist_tasks t JOIN public.checklist_routine_days rd ON rd.task_id=t.id AND rd.user_id=uid
  WHERE t.user_id=uid AND t.is_active AND t.archived_at IS NULL AND rd.is_active
    AND rd.effective_from<=ws+6 AND (rd.effective_until IS NULL OR rd.effective_until>=ws)
  GROUP BY t.id,t.name,t.category,t.priority
  ON CONFLICT(user_id,week_start_date,task_id) DO NOTHING;

  INSERT INTO public.checklist_week_cells(user_id,week_task_id,execution_date)
  SELECT uid,wt.id,ws+(rd.weekday-1)
  FROM public.checklist_week_tasks wt JOIN public.checklist_routine_days rd
    ON rd.task_id=wt.task_id AND rd.user_id=uid
  WHERE wt.user_id=uid AND wt.week_start_date=ws AND wt.deleted_at IS NULL AND rd.is_active
    AND rd.effective_from<=ws+(rd.weekday-1)
    AND (rd.effective_until IS NULL OR rd.effective_until>=ws+(rd.weekday-1))
  ON CONFLICT(user_id,week_task_id,execution_date) DO NOTHING;
  GET DIAGNOSTICS inserted_count=ROW_COUNT;
  RETURN inserted_count;
END $$;

CREATE OR REPLACE FUNCTION public.add_checklist_week_task(
  requested_week DATE, task_name TEXT, task_category TEXT, task_priority TEXT,
  task_target NUMERIC, task_unit TEXT, weekdays SMALLINT[], repeat_future BOOLEAN
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid UUID:=auth.uid(); ws DATE; tid UUID; wtid UUID; d SMALLINT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NULLIF(BTRIM(task_name),'') IS NULL OR array_length(weekdays,1) IS NULL THEN RAISE EXCEPTION 'Name and days are required'; END IF;
  ws:=requested_week-(EXTRACT(ISODOW FROM requested_week)::INTEGER-1);
  INSERT INTO public.checklist_tasks(user_id,name,category,priority,default_target_value,default_unit)
  VALUES(uid,BTRIM(task_name),task_category,task_priority,task_target,task_unit)
  ON CONFLICT(user_id,lower(name)) WHERE archived_at IS NULL DO UPDATE SET updated_at=NOW()
  RETURNING id INTO tid;
  INSERT INTO public.checklist_week_tasks(user_id,week_start_date,task_id,task_name_snapshot,category_snapshot,priority_snapshot,target_value_snapshot,unit_snapshot,source_type)
  VALUES(uid,ws,tid,BTRIM(task_name),task_category,task_priority,task_target,task_unit,'manual')
  ON CONFLICT(user_id,week_start_date,task_id) DO UPDATE SET deleted_at=NULL RETURNING id INTO wtid;
  FOREACH d IN ARRAY weekdays LOOP
    INSERT INTO public.checklist_week_cells(user_id,week_task_id,execution_date)
    VALUES(uid,wtid,ws+(d-1)) ON CONFLICT(user_id,week_task_id,execution_date) DO UPDATE SET deleted_at=NULL,is_scheduled=TRUE;
    IF repeat_future THEN
      INSERT INTO public.checklist_routine_days(user_id,task_id,weekday,default_target_value,default_unit,effective_from)
      VALUES(uid,tid,d,task_target,task_unit,ws)
      ON CONFLICT(user_id,task_id,weekday,effective_from) DO UPDATE SET is_active=TRUE,effective_until=NULL;
    END IF;
  END LOOP;
  RETURN wtid;
END $$;

CREATE OR REPLACE FUNCTION public.copy_previous_checklist_week(target_week DATE)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid UUID:=auth.uid(); ws DATE; prev DATE; r RECORD; new_wtid UUID; copied INTEGER:=0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  ws:=target_week-(EXTRACT(ISODOW FROM target_week)::INTEGER-1); prev:=ws-7;
  FOR r IN SELECT wt.*,c.execution_date FROM public.checklist_week_tasks wt
    JOIN public.checklist_week_cells c ON c.week_task_id=wt.id AND c.deleted_at IS NULL AND c.is_scheduled
    WHERE wt.user_id=uid AND wt.week_start_date=prev AND wt.deleted_at IS NULL LOOP
    INSERT INTO public.checklist_week_tasks(user_id,week_start_date,task_id,task_name_snapshot,category_snapshot,priority_snapshot,target_value_snapshot,unit_snapshot,sort_order,source_type)
    VALUES(uid,ws,r.task_id,r.task_name_snapshot,r.category_snapshot,r.priority_snapshot,r.target_value_snapshot,r.unit_snapshot,r.sort_order,'copied')
    ON CONFLICT(user_id,week_start_date,task_id) DO UPDATE SET deleted_at=NULL RETURNING id INTO new_wtid;
    INSERT INTO public.checklist_week_cells(user_id,week_task_id,execution_date)
    VALUES(uid,new_wtid,ws+(EXTRACT(ISODOW FROM r.execution_date)::INTEGER-1))
    ON CONFLICT(user_id,week_task_id,execution_date) DO NOTHING;
    copied:=copied+1;
  END LOOP; RETURN copied;
END $$;

CREATE OR REPLACE FUNCTION public.import_checklist_week_tasks(requested_week DATE, import_rows JSONB)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  uid UUID:=auth.uid(); row_data JSONB; selected_days SMALLINT[]; imported INTEGER:=0;
  allowed_categories CONSTANT TEXT[]:=ARRAY['Faith','Fitness','Sales','Follow-ups','Client Delivery','Product','Market Research','Content','Learning','Administration','Personal Execution','Field Visits'];
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF jsonb_typeof(import_rows)<>'array' OR jsonb_array_length(import_rows)=0 THEN RAISE EXCEPTION 'The import contains no task rows'; END IF;
  FOR row_data IN SELECT * FROM jsonb_array_elements(import_rows) LOOP
    IF NULLIF(BTRIM(row_data->>'name'),'') IS NULL THEN RAISE EXCEPTION 'Every row requires Task Name'; END IF;
    IF NOT (row_data->>'category'=ANY(allowed_categories)) THEN RAISE EXCEPTION 'Invalid category for task: %',row_data->>'name'; END IF;
    IF row_data->>'priority' NOT IN ('Critical','Important','Optional') THEN RAISE EXCEPTION 'Invalid priority for task: %',row_data->>'name'; END IF;
    SELECT ARRAY_AGG(value::SMALLINT ORDER BY value::SMALLINT) INTO selected_days
    FROM jsonb_array_elements_text(row_data->'weekdays');
    IF selected_days IS NULL OR EXISTS(SELECT 1 FROM unnest(selected_days) d WHERE d<1 OR d>7)
      THEN RAISE EXCEPTION 'Select at least one valid weekday for task: %',row_data->>'name'; END IF;
    PERFORM public.add_checklist_week_task(
      requested_week,row_data->>'name',row_data->>'category',row_data->>'priority',
      NULLIF(row_data->>'target_value','')::NUMERIC,NULLIF(row_data->>'unit',''),
      selected_days,COALESCE((row_data->>'repeat_future')::BOOLEAN,FALSE)
    );
    imported:=imported+1;
  END LOOP;
  RETURN imported;
END $$;

CREATE OR REPLACE FUNCTION public.permanently_delete_checklist_week_task(target_week_task UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid UUID:=auth.uid(); target_week DATE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT week_start_date INTO target_week FROM public.checklist_week_tasks
  WHERE id=target_week_task AND user_id=uid;
  IF target_week IS NULL THEN RAISE EXCEPTION 'Weekly task not found'; END IF;
  DELETE FROM public.checklist_week_cells WHERE week_task_id=target_week_task AND user_id=uid;
  DELETE FROM public.checklist_week_tasks WHERE id=target_week_task AND user_id=uid;
END $$;

CREATE OR REPLACE FUNCTION public.permanently_delete_checklist_week(target_week DATE)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid UUID:=auth.uid(); ws DATE; removed INTEGER;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  ws:=target_week-(EXTRACT(ISODOW FROM target_week)::INTEGER-1);
  IF EXISTS(
    SELECT 1 FROM public.checklist_week_cells c
    JOIN public.checklist_week_tasks wt ON wt.id=c.week_task_id
    WHERE wt.user_id=uid AND wt.week_start_date=ws AND wt.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND c.execution_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE
  ) THEN RAISE EXCEPTION 'This week contains protected past-day history and cannot be permanently deleted'; END IF;
  DELETE FROM public.checklist_week_cells c USING public.checklist_week_tasks wt
  WHERE c.week_task_id=wt.id AND wt.user_id=uid AND wt.week_start_date=ws;
  DELETE FROM public.checklist_week_tasks WHERE user_id=uid AND week_start_date=ws;
  GET DIAGNOSTICS removed=ROW_COUNT;
  RETURN removed;
END $$;

CREATE OR REPLACE FUNCTION public.permanently_delete_checklist_week_tasks(target_week_tasks UUID[])
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid UUID:=auth.uid(); removed INTEGER; requested_count INTEGER;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  requested_count:=COALESCE(array_length(target_week_tasks,1),0);
  IF requested_count=0 THEN RAISE EXCEPTION 'Select at least one task'; END IF;
  IF (SELECT COUNT(*) FROM public.checklist_week_tasks WHERE user_id=uid AND id=ANY(target_week_tasks))<>requested_count
    THEN RAISE EXCEPTION 'One or more selected tasks are invalid'; END IF;
  DELETE FROM public.checklist_week_cells WHERE user_id=uid AND week_task_id=ANY(target_week_tasks);
  DELETE FROM public.checklist_week_tasks WHERE user_id=uid AND id=ANY(target_week_tasks);
  GET DIAGNOSTICS removed=ROW_COUNT;
  RETURN removed;
END $$;

-- Preserve existing daily history as migrated weekly snapshots and cells.
INSERT INTO public.checklist_tasks(user_id,name,category,priority,default_target_value,default_unit)
SELECT DISTINCT ON(user_id,lower(title)) user_id,title,COALESCE(category,'Administration'),COALESCE(priority,'Important'),target_value,unit
FROM public.daily_checklist_items WHERE deleted_at IS NULL
ON CONFLICT(user_id,lower(name)) WHERE archived_at IS NULL DO NOTHING;

INSERT INTO public.checklist_week_tasks(user_id,week_start_date,task_id,task_name_snapshot,category_snapshot,priority_snapshot,target_value_snapshot,unit_snapshot,source_type)
SELECT DISTINCT d.user_id,d.checklist_date-(EXTRACT(ISODOW FROM d.checklist_date)::INTEGER-1),t.id,d.title,
  COALESCE(d.category,'Administration'),COALESCE(d.priority,'Important'),d.target_value,d.unit,'migrated'
FROM public.daily_checklist_items d JOIN public.checklist_tasks t ON t.user_id=d.user_id AND lower(t.name)=lower(d.title)
WHERE d.deleted_at IS NULL
ON CONFLICT(user_id,week_start_date,task_id) DO NOTHING;

INSERT INTO public.checklist_week_cells(user_id,week_task_id,execution_date,is_completed,is_not_applicable,is_top_three,note,completed_at)
SELECT d.user_id,wt.id,d.checklist_date,d.status='done',d.status='skipped',d.is_top_three,d.description,
  CASE WHEN d.status='done' THEN COALESCE(d.updated_at,d.created_at) END
FROM public.daily_checklist_items d JOIN public.checklist_tasks t ON t.user_id=d.user_id AND lower(t.name)=lower(d.title)
JOIN public.checklist_week_tasks wt ON wt.user_id=d.user_id AND wt.task_id=t.id
 AND wt.week_start_date=d.checklist_date-(EXTRACT(ISODOW FROM d.checklist_date)::INTEGER-1)
WHERE d.deleted_at IS NULL
ON CONFLICT(user_id,week_task_id,execution_date) DO NOTHING;

GRANT EXECUTE ON FUNCTION public.setup_default_weekly_routine() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_checklist_week(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_checklist_week_task(DATE,TEXT,TEXT,TEXT,NUMERIC,TEXT,SMALLINT[],BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.copy_previous_checklist_week(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_checklist_week_tasks(DATE,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.permanently_delete_checklist_week_task(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.permanently_delete_checklist_week(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.permanently_delete_checklist_week_tasks(UUID[]) TO authenticated;

COMMIT;
