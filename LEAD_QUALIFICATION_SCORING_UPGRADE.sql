-- Groenics Phase 3: Lead Qualification and Scoring
-- Run after NEXT_ACTION_ENGINE_UPGRADE.sql.

ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS score_weight_problem_severity INTEGER NOT NULL DEFAULT 15 CHECK (score_weight_problem_severity BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS score_weight_urgency INTEGER NOT NULL DEFAULT 15 CHECK (score_weight_urgency BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS score_weight_ability_to_pay INTEGER NOT NULL DEFAULT 15 CHECK (score_weight_ability_to_pay BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS score_weight_decision_maker INTEGER NOT NULL DEFAULT 15 CHECK (score_weight_decision_maker BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS score_weight_estimated_value INTEGER NOT NULL DEFAULT 10 CHECK (score_weight_estimated_value BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS score_weight_engagement INTEGER NOT NULL DEFAULT 10 CHECK (score_weight_engagement BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS score_weight_timeline INTEGER NOT NULL DEFAULT 10 CHECK (score_weight_timeline BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS score_weight_founder_fit INTEGER NOT NULL DEFAULT 10 CHECK (score_weight_founder_fit BETWEEN 0 AND 100);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS qualification_status TEXT NOT NULL DEFAULT 'New',
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS company_size TEXT,
  ADD COLUMN IF NOT EXISTS number_of_branches INTEGER CHECK (number_of_branches IS NULL OR number_of_branches >= 0),
  ADD COLUMN IF NOT EXISTS main_business_problem TEXT,
  ADD COLUMN IF NOT EXISTS problem_severity INTEGER CHECK (problem_severity IS NULL OR problem_severity BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS current_workaround TEXT,
  ADD COLUMN IF NOT EXISTS existing_software TEXT,
  ADD COLUMN IF NOT EXISTS budget_range TEXT,
  ADD COLUMN IF NOT EXISTS expected_project_value NUMERIC(14,2) CHECK (expected_project_value IS NULL OR expected_project_value >= 0),
  ADD COLUMN IF NOT EXISTS decision_maker_name TEXT,
  ADD COLUMN IF NOT EXISTS decision_maker_identified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS urgency INTEGER CHECK (urgency IS NULL OR urgency BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS buying_timeline TEXT,
  ADD COLUMN IF NOT EXISTS authority_level INTEGER CHECK (authority_level IS NULL OR authority_level BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS need_level INTEGER CHECK (need_level IS NULL OR need_level BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS ability_to_pay INTEGER CHECK (ability_to_pay IS NULL OR ability_to_pay BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS probability_of_closing INTEGER CHECK (probability_of_closing IS NULL OR probability_of_closing BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS competitor_considered TEXT,
  ADD COLUMN IF NOT EXISTS qualification_notes TEXT,
  ADD COLUMN IF NOT EXISTS disqualification_reason TEXT,
  ADD COLUMN IF NOT EXISTS lost_reason TEXT,
  ADD COLUMN IF NOT EXISTS engagement_score INTEGER CHECK (engagement_score IS NULL OR engagement_score BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS timeline_score INTEGER CHECK (timeline_score IS NULL OR timeline_score BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS founder_company_fit INTEGER CHECK (founder_company_fit IS NULL OR founder_company_fit BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS lead_score INTEGER NOT NULL DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS score_confidence TEXT NOT NULL DEFAULT 'Low',
  ADD COLUMN IF NOT EXISTS score_reason TEXT,
  ADD COLUMN IF NOT EXISTS recommended_next_action TEXT,
  ADD COLUMN IF NOT EXISTS score_updated_at TIMESTAMPTZ;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_qualification_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_qualification_status_check CHECK (qualification_status IN ('New','Attempting contact','Researching','Unqualified','Qualified','Discovery scheduled','Discovery completed','Demonstration scheduled','Demonstration completed','Proposal requested','Proposal sent','Negotiation','Not ready','Won','Lost'));
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_score_confidence_check;
ALTER TABLE leads ADD CONSTRAINT leads_score_confidence_check CHECK (score_confidence IN ('Low','Medium','High'));

CREATE INDEX IF NOT EXISTS idx_leads_qualification_status ON leads(venture_id, qualification_status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(venture_id, lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_expected_value ON leads(venture_id, expected_project_value DESC);

CREATE OR REPLACE FUNCTION calculate_lead_score(target leads)
RETURNS TABLE(score INTEGER, confidence TEXT, reason TEXT, recommendation TEXT)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  settings business_settings%ROWTYPE;
  weight_total NUMERIC;
  value_factor NUMERIC;
  decision_factor NUMERIC;
  answered INTEGER;
  raw_score NUMERIC;
BEGIN
  SELECT * INTO settings FROM business_settings WHERE venture_id = target.venture_id LIMIT 1;
  weight_total := COALESCE(settings.score_weight_problem_severity,15) + COALESCE(settings.score_weight_urgency,15) + COALESCE(settings.score_weight_ability_to_pay,15) + COALESCE(settings.score_weight_decision_maker,15) + COALESCE(settings.score_weight_estimated_value,10) + COALESCE(settings.score_weight_engagement,10) + COALESCE(settings.score_weight_timeline,10) + COALESCE(settings.score_weight_founder_fit,10);
  IF weight_total <= 0 THEN weight_total := 100; END IF;
  value_factor := CASE WHEN target.expected_project_value IS NULL THEN 0 WHEN target.expected_project_value >= 500000 THEN 5 WHEN target.expected_project_value >= 200000 THEN 4 WHEN target.expected_project_value >= 100000 THEN 3 WHEN target.expected_project_value >= 50000 THEN 2 ELSE 1 END;
  decision_factor := CASE WHEN target.decision_maker_identified THEN GREATEST(COALESCE(target.authority_level,1),1) ELSE 0 END;
  raw_score := (COALESCE(target.problem_severity,0) * COALESCE(settings.score_weight_problem_severity,15) + COALESCE(target.urgency,0) * COALESCE(settings.score_weight_urgency,15) + COALESCE(target.ability_to_pay,0) * COALESCE(settings.score_weight_ability_to_pay,15) + decision_factor * COALESCE(settings.score_weight_decision_maker,15) + value_factor * COALESCE(settings.score_weight_estimated_value,10) + COALESCE(target.engagement_score,0) * COALESCE(settings.score_weight_engagement,10) + COALESCE(target.timeline_score,0) * COALESCE(settings.score_weight_timeline,10) + COALESCE(target.founder_company_fit,0) * COALESCE(settings.score_weight_founder_fit,10)) / (5 * weight_total) * 100;
  score := LEAST(100, GREATEST(0, ROUND(raw_score)::INTEGER));
  answered := (target.problem_severity IS NOT NULL)::INTEGER + (target.urgency IS NOT NULL)::INTEGER + (target.ability_to_pay IS NOT NULL)::INTEGER + (target.authority_level IS NOT NULL)::INTEGER + (target.expected_project_value IS NOT NULL)::INTEGER + (target.engagement_score IS NOT NULL)::INTEGER + (target.timeline_score IS NOT NULL)::INTEGER + (target.founder_company_fit IS NOT NULL)::INTEGER;
  confidence := CASE WHEN answered >= 7 THEN 'High' WHEN answered >= 4 THEN 'Medium' ELSE 'Low' END;
  reason := CONCAT('Severity ',COALESCE(target.problem_severity,0),'/5; urgency ',COALESCE(target.urgency,0),'/5; ability to pay ',COALESCE(target.ability_to_pay,0),'/5; decision access ',decision_factor,'/5; ',answered,'/8 scoring inputs completed.');
  recommendation := CASE
    WHEN target.qualification_status IN ('Lost','Unqualified') THEN 'Record the reason and stop active follow-up.'
    WHEN score >= 75 AND NOT target.decision_maker_identified THEN 'Reach the decision-maker and schedule discovery.'
    WHEN score >= 75 AND target.qualification_status NOT IN ('Proposal requested','Proposal sent','Negotiation','Won') THEN 'Prioritize discovery or demonstration and confirm proposal scope.'
    WHEN score >= 50 THEN 'Complete missing qualification and schedule the next conversation.'
    WHEN answered < 4 THEN 'Research and collect the missing qualification details.'
    ELSE 'Nurture with a dated next action or mark not ready.' END;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION refresh_lead_score()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE calculated RECORD;
BEGIN
  SELECT * INTO calculated FROM calculate_lead_score(NEW);
  NEW.lead_score := calculated.score;
  NEW.score_confidence := calculated.confidence;
  NEW.score_reason := calculated.reason;
  NEW.recommended_next_action := calculated.recommendation;
  NEW.score_updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_refresh_score ON leads;
CREATE TRIGGER leads_refresh_score BEFORE INSERT OR UPDATE OF problem_severity, urgency, ability_to_pay, authority_level, decision_maker_identified, expected_project_value, engagement_score, timeline_score, founder_company_fit, qualification_status ON leads
FOR EACH ROW EXECUTE FUNCTION refresh_lead_score();

CREATE OR REPLACE FUNCTION recalculate_venture_lead_scores(target_venture UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE changed INTEGER;
BEGIN
  UPDATE leads SET founder_company_fit = founder_company_fit WHERE venture_id = target_venture;
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed;
END;
$$;

-- Fire scoring once for existing rows.
UPDATE leads SET founder_company_fit = founder_company_fit;
