# Phase 12: Correct Financial Terminology

The Reports area now separates:

- Amount invoiced
- Amount collected
- Recognized revenue
- Outstanding receivables
- Overdue receivables
- Operating expenses
- Direct project costs
- Gross profit
- Estimated operating profit
- Founder withdrawals
- Tax reserve
- Available cash

## Definitions

`Gross profit = recognized revenue − direct project costs`

`Estimated operating profit = gross profit − operating expenses`

`Available cash = collections − direct costs − operating expenses − founder withdrawals − tax reserve`

These are operational management figures, not statutory accounts.

## Filters

The financial position report supports:

- This month
- Previous month
- Current quarter
- Indian financial year
- Custom period
- Venture
- Client
- Project

## Dated entries

Recognized revenue is recorded against a project and date. Founder withdrawals and tax reserves are separate dated cash adjustments. They are not stored as revenue or ordinary project profit.

## Migration

After a production backup, run `PHASE_12_FINANCIAL_TERMINOLOGY_UPGRADE.sql` after Phase 11.

## Verification

1. Record an invoice and confirm it affects invoiced, not collected.
2. Record a partial payment and confirm collected and outstanding.
3. Add a project cost and an operating expense and confirm they remain separate.
4. Record recognized revenue and confirm gross profit.
5. Record a withdrawal and tax reserve and confirm available cash changes without changing profit.
6. Test month, quarter, financial-year, custom, venture, client, and project filters.
