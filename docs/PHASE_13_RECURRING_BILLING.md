# Phase 13: Recurring Billing

Recurring Billing manages subscriptions, maintenance, hosting, managed automation, support retainers, and monthly software services.

## Capabilities

- Client, product/service, plan, frequency, amount, tax, dates, status, and notes
- Monthly, quarterly, half-yearly, annual, and custom frequencies
- Draft, Active, Paused, Cancelled, and Expired statuses
- Monthly recurring revenue and annual recurring revenue
- Renewals due within 30 days
- Billing-due reminders in Today
- One reviewed invoice draft per service billing date
- Next billing date advances only after draft creation succeeds

Invoice drafts are never sent automatically. The founder must review and send them through Billing.

## Migration

After a backup, run `PHASE_13_RECURRING_BILLING_UPGRADE.sql` after Phase 12 and the billing migration.

## Verification

1. Add monthly and annual active services and confirm MRR/ARR normalization.
2. Create an invoice draft and verify its line item and Draft status.
3. Confirm the next billing date advances.
4. Try creating the same period twice and confirm it is blocked.
5. Confirm billing due within seven days and renewals within 30 days appear in Today.
6. Confirm Paused, Cancelled, and Expired services do not produce Today reminders.
