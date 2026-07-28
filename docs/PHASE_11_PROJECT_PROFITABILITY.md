# Phase 11: Project Profitability

Phase 11 connects project delivery to real invoices, payments, direct expenses, and hours.

## Revenue is kept separate

Every project displays:

- Contract value
- Amount invoiced
- Amount collected
- Recognized revenue
- Outstanding amount

The founder explicitly selects the gross-profit basis:

- **Invoiced** — invoices raised, excluding cancelled invoices
- **Collected** — payments actually received
- **Recognized** — revenue deliberately recognized on the project

The selected basis is always displayed beside gross profit.

## Direct costs

Project-linked expenses are classified as:

- Contractor
- Employee
- Software
- API
- Travel
- Other

The project screen includes a quick Add direct cost action. It creates a normal expense linked to that project, avoiding a duplicate cost ledger.

## Calculations

`Gross profit = selected profitability revenue − direct project costs`

`Gross margin = gross profit ÷ selected profitability revenue × 100`

`Effective revenue per hour = selected profitability revenue ÷ actual hours`

`Cost budget variance = direct-cost budget − actual direct costs`

Health indicators are Healthy, Low margin, At risk, and Loss-making.

## Migration

After a production backup, run `PHASE_11_PROJECT_PROFITABILITY_UPGRADE.sql` after the Phase 10 and billing migrations.

The migration adds project financial settings, project links to expenses, and an RLS-aware `project_profitability` view.

## Verification

1. Link an invoice to a project through the Phase 9 conversion.
2. Record a partial payment and confirm collected and outstanding amounts.
3. Add costs in every category and confirm the breakdown.
4. Change the revenue basis and verify gross profit changes without relabelling collections.
5. Add actual hours and verify effective revenue per hour.
6. Exceed the direct-cost budget and confirm the At risk indicator.
