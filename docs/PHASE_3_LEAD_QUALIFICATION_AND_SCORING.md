# Phase 3: Lead Qualification and Scoring

## Delivered

- Structured qualification fields covering organization profile, problem, workaround, software, budget, value, decision-maker, urgency, timeline, authority, need, ability to pay, competitor, probability, and loss/disqualification reasons.
- The requested qualification lifecycle from New through Won or Lost.
- A database-calculated 0–100 score using problem severity, urgency, ability to pay, decision-maker access, estimated value, engagement, timeline, and founder/company fit.
- Confidence based on qualification completeness.
- Human-readable score reasoning and a recommended next action.
- Configurable relative weights in Business Settings; weights are normalized and saving settings recalculates venture leads.
- Lead filters for qualification status and minimum score.
- High-scoring leads without a next action are elevated in Today.
- Database constraints, indexes, score refresh trigger, and existing-lead backfill.

## Migration order

1. `TODAY_COMMAND_CENTRE_UPGRADE.sql`
2. `NEXT_ACTION_ENGINE_UPGRADE.sql`
3. `LEAD_QUALIFICATION_SCORING_UPGRADE.sql`

## Important scoring behavior

- Empty scoring inputs contribute zero and lower confidence.
- Scores are decision support, not an autonomous sales decision.
- Estimated value is converted into a 0–5 factor using transparent INR bands in the migration.
- Changing scoring weights recalculates all leads in the active venture.
- Reasons for Unqualified and Lost become required in the UI for those statuses.

## Main files

- `LEAD_QUALIFICATION_SCORING_UPGRADE.sql`
- `components/Portal/LeadQualificationFields.tsx`
- `app/portal/leads/page.tsx`
- `app/portal/settings/page.tsx`
- `app/portal/today/page.tsx`
- `lib/types.ts`

## Security note

The database functions use invoker permissions and therefore remain subject to existing RLS. The portal is still founder-only; membership-based multi-user venture policies remain a later security dependency.

