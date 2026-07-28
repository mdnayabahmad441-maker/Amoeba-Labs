# Phase 5: Canonical Sales Pipeline

## Outcome

Every lead now has one authoritative sales progression field:

1. New
2. Contacted
3. Qualified
4. Meeting/Demo
5. Proposal
6. Negotiation
7. Won
8. Lost

Lead priority and disposition are separate:

- Hot
- Warm
- Cold
- Not ready
- Unqualified

`Not ready` and `Unqualified` no longer compete with sales stages.

## Database fields

### Authoritative

- `leads.pipeline_stage`
- `leads.lead_temperature`
- `leads.pipeline_stage_updated_at`

### Deprecated compatibility fields

- `leads.stage`
- `leads.qualification_status`

The deprecated fields remain temporarily because existing scoring functions and rollback application versions reference them. A database trigger derives them from the canonical fields, so they cannot become independent pipelines.

Do not write to deprecated fields from new application code.

## Migration mapping

The migration gives detailed qualification statuses priority, then uses the legacy stage as a fallback.

| Existing value | Canonical pipeline |
|---|---|
| New | New |
| Attempting contact | Contacted |
| Researching | Contacted |
| Qualified | Qualified |
| Discovery scheduled | Meeting/Demo |
| Discovery completed | Meeting/Demo |
| Demonstration scheduled | Meeting/Demo |
| Demonstration completed | Meeting/Demo |
| Proposal requested | Proposal |
| Proposal sent | Proposal |
| Negotiation | Negotiation |
| Won / Closed Won | Won |
| Lost / Closed Lost | Lost |
| New Lead | New |
| Contacted | Contacted |
| Demo Scheduled | Meeting/Demo |
| Proposal Sent | Proposal |

`Not ready` and `Unqualified` use the legacy stage fallback for pipeline position and migrate to the corresponding temperature/disposition.

## Temperature mapping

| Existing condition | Temperature |
|---|---|
| Qualification is Unqualified | Unqualified |
| Qualification is Not ready | Not ready |
| Lead score at least 75 | Hot |
| Lead score 50–74 | Warm |
| Lead score below 50 | Cold |

This is only the initial backfill. The founder can change temperature independently afterward.

## Required reasons

- Moving a lead to `Lost` requires `lost_reason`.
- Setting temperature to `Unqualified` requires `disqualification_reason`.

Existing legacy records without reasons receive an explicit migration placeholder so no record is silently discarded and the database constraint can be safely enabled.

## Application changes

- Leads has one pipeline filter and one temperature filter.
- The lead table shows pipeline and temperature together.
- The edit form has one pipeline selector and one temperature selector.
- The old qualification selector and second stage selector are removed.
- Today ignores Won and Lost leads and describes active leads with canonical values.
- Reports calculates pipeline and deals won from `pipeline_stage`.
- Accepted proposals move linked leads to canonical `Won`.
- Website enquiries start at `New` and `Cold`.
- Next-action stuck-stage warnings use `pipeline_stage_updated_at`.
- Pipeline and temperature changes create activity-log entries containing previous and new values.

## Deployment order

1. Back up Supabase.
2. Confirm Phase 2 security and Phase 3 lead scoring migrations are applied.
3. Run `PHASE_5_CANONICAL_SALES_PIPELINE_UPGRADE.sql`.
4. Run the verification queries below.
5. Deploy the application.
6. Test lead creation, editing, proposal acceptance, Today, and Reports.

The application must not be deployed before the migration because it reads the new canonical columns.

## Verification queries

```sql
SELECT pipeline_stage, lead_temperature, COUNT(*)
FROM leads
GROUP BY pipeline_stage, lead_temperature
ORDER BY pipeline_stage, lead_temperature;

SELECT id, client_name, pipeline_stage, stage, lead_temperature, qualification_status
FROM leads
WHERE
  stage <> CASE pipeline_stage
    WHEN 'New' THEN 'New Lead'
    WHEN 'Contacted' THEN 'Contacted'
    WHEN 'Qualified' THEN 'Contacted'
    WHEN 'Meeting/Demo' THEN 'Demo Scheduled'
    WHEN 'Proposal' THEN 'Proposal Sent'
    WHEN 'Negotiation' THEN 'Negotiation'
    WHEN 'Won' THEN 'Closed Won'
    WHEN 'Lost' THEN 'Closed Lost'
  END;

SELECT id, client_name
FROM leads
WHERE pipeline_stage = 'Lost'
  AND NULLIF(BTRIM(lost_reason), '') IS NULL;

SELECT id, client_name
FROM leads
WHERE lead_temperature = 'Unqualified'
  AND NULLIF(BTRIM(disqualification_reason), '') IS NULL;
```

The last three queries should return no rows.

## Rollback safety

The migration does not drop legacy columns or legacy values. If an application rollback is required, the compatibility trigger keeps old fields populated. Do not drop the canonical columns during rollback; restore the previous application, investigate, and preserve all migrated data.
