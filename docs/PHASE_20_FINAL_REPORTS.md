# Phase 20 — Final Reports

Phase 20 consolidates reporting into nine operational views:

1. Sales Pipeline
2. Collections and Outstanding
3. Project Profitability
4. Expenses
5. Field Visits
6. Recurring Revenue
7. Weekly CEO Report
8. Lead Sources
9. Win/Loss Analysis

The report workspace supports business-unit, client, project, and date filters.
Every tabular report supports CSV export. Optional reports show a migration
warning instead of breaking the complete Reports page when their module has not
yet been installed.

The business-unit filter is also a data-visibility aid: it lets the founder see
whether older records belong to a non-default venture without moving or
duplicating those records.

Run `PHASE_20_FINAL_REPORTS_UPGRADE.sql` after all earlier schema upgrades. It
only adds report indexes and does not modify business records.

For the full database sequence and existing-data checks, follow
`docs/SQL_RUN_ORDER_AND_DATA_RECOVERY.md`, then run the read-only
`DATA_VISIBILITY_DIAGNOSTIC.sql`.
