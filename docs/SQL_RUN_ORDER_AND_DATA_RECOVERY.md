# SQL Run Order and Existing-Data Visibility

The portal code does not delete client data when a migration is missing. Empty
pages are most commonly caused by:

1. New code querying a column whose migration has not been run.
2. RLS hiding ventures because the founder membership was not seeded.
3. Existing records belonging to a different business unit than the current
   default.
4. Records being archived and therefore intentionally excluded.

Back up the Supabase database before running production migrations. Run each
file separately in the Supabase SQL Editor and stop if any file reports an
error.

## Exact execution order

### Existing foundation

Run these only if their tables or columns are not already present. They are
written to preserve existing rows.

1. `BUSINESS_OPERATIONS_UPGRADE.sql`
2. `BILLING_UPGRADE.sql`
3. `DAILY_EXPENSES_UPGRADE.sql`
4. `EMPLOYEES_UPGRADE.sql`
5. `TASK_HANDOVER_UPGRADE.sql`

### Portal improvement phases

6. `TODAY_COMMAND_CENTRE_UPGRADE.sql`
7. `NEXT_ACTION_ENGINE_UPGRADE.sql`
8. `LEAD_QUALIFICATION_SCORING_UPGRADE.sql`
9. `SECURITY_AND_DATA_PROTECTION_UPGRADE.sql`
10. `CALENDAR_APPOINTMENTS_UPGRADE.sql`
11. `PHASE_4_STRATEGIC_REPORTING_UPGRADE.sql`
12. `PHASE_5_CANONICAL_SALES_PIPELINE_UPGRADE.sql`
13. `PHASE_8_ACTIVITY_UNIFICATION_UPGRADE.sql`
14. `PHASE_9_LEAD_CONVERSION_UPGRADE.sql`
15. `PHASE_10_PROJECT_START_GATES_UPGRADE.sql`
16. `PHASE_11_PROJECT_PROFITABILITY_UPGRADE.sql`
17. `PHASE_12_FINANCIAL_TERMINOLOGY_UPGRADE.sql`
18. `PHASE_13_RECURRING_BILLING_UPGRADE.sql`
19. `PHASE_14_FIELD_VISITS_UPGRADE.sql`
20. `PHASE_16_WEBSITE_ENQUIRY_QUALITY_UPGRADE.sql`
21. `PHASE_17_EMPLOYEES_VENTURES_UPGRADE.sql`
22. `PHASE_18_BUSINESS_SETTINGS_CLEANUP_UPGRADE.sql`
23. `PHASE_19_CALENDAR_VERIFICATION_UPGRADE.sql`
24. `PHASE_20_FINAL_REPORTS_UPGRADE.sql`

There are no separate Phase 6, 7, or 15 SQL files: those phases reused the
Phase 3, Phase 5, Phase 8, and reporting schema. Do not run
`PUBLIC_ENQUIRY_LEADS_POLICY.sql`; the current public enquiry API uses a
server-side service role and the old public insert policy is no longer needed.

## Check existing data after migration

Run `DATA_VISIBILITY_DIAGNOSTIC.sql`. It is read-only.

- If client counts appear under a non-default business, open **More → Business
  units** and make that business the default, or use the Business-unit filter
  in Reports. Do not move records merely to make them appear.
- If the founder has no Active membership for a venture, rerun
  `SECURITY_AND_DATA_PROTECTION_UPGRADE.sql` after confirming the configured
  founder email is `mdnayabahmad441@gmail.com`.
- If records have an `archived_at` value, investigate each record before
  restoring it. Never run a blanket unarchive statement.
- If the diagnostic itself fails on a missing column or table, return to the
  first failed migration and continue from there.

## Important safety rules

- Never use `DELETE` to recover visibility.
- Never reassign every record to Groenics without reviewing venture counts.
- Never disable RLS as a visibility workaround.
- Do not paste all migrations into one transaction. Running files separately
  makes the exact failure visible and keeps recovery controlled.
