# Phase 4: Reports and Today Separation

## Outcome

The two founder views now answer different questions:

- **Today:** What exactly needs attention now?
- **Reports:** How is the business performing?

Daily task lists, follow-up lists, upcoming-work lists, and recent-record lists were removed from Reports. Their canonical execution surface remains Today.

## Today

Today continues to aggregate:

- due and overdue next actions;
- follow-ups;
- meetings and field visits;
- tasks;
- proposals awaiting response or approaching expiry;
- due and overdue invoices;
- projects and milestones at risk;
- clients awaiting updates;
- renewals and manually scheduled actions;
- leads without a future next action.

Available controls:

- mark complete;
- reschedule;
- assign;
- change priority;
- add an internal note;
- open the related record;
- prepare a reviewed WhatsApp draft;
- prepare a reviewed email draft.

No external message is sent automatically.

## Reports

Reports now shows strategic metrics for the current India-time calendar month:

- collections;
- amount invoiced;
- outstanding receivables;
- overdue receivables;
- operating expenses;
- cash contribution estimate;
- active pipeline value;
- weighted pipeline value;
- proposals sent;
- deals won;
- active projects;
- projects at risk;
- monthly collection-target progress;
- pipeline count and value by stage.

## Calculation definitions

### Collections

The sum of payment records whose `payment_date` falls within the current month.

### Amount invoiced

The sum of non-cancelled invoices created during the current month.

### Outstanding receivables

For non-draft, non-cancelled invoices:

`invoice amount - recorded payments`

Balances are never allowed below zero.

### Overdue receivables

Outstanding receivables where `due_date` is before the current India date.

### Operating expenses

The sum of non-archived expenses recorded in the current month.

### Cash contribution estimate

`collections - operating expenses`

This is deliberately not labelled accounting profit. Direct project cost allocation and recognized revenue are not available yet.

### Active pipeline

The expected project value of leads that are not won, lost, or unqualified.

### Weighted pipeline

For each active lead:

`expected project value × probability of closing`

Missing probabilities contribute zero rather than inventing an assumption.

### Proposals sent

Non-draft proposals with an issue date in the current month.

### Deals won

Leads marked `Closed Won` or qualification `Won` whose update timestamp falls within the current month.

### At-risk projects

Projects that are on hold, or active/planning projects whose due date has passed.

## Database upgrade

Run:

`PHASE_4_STRATEGIC_REPORTING_UPGRADE.sql`

It adds one additive setting:

- `business_settings.monthly_revenue_target`

The target is explicitly a collection target, so progress compares cash received with the configured target.

## Deployment order

1. Complete and verify the Phase 2 security migration.
2. Run `PHASE_4_STRATEGIC_REPORTING_UPGRADE.sql`.
3. Set the monthly collection target under More → Business settings.
4. Deploy the application.
5. Compare Reports values with Billing and Expenses for the same month.

## Smoke-test checklist

1. Confirm Reports contains no task or follow-up queues.
2. Confirm Today still contains due work and all quick actions.
3. Record a test payment and confirm monthly collections increase.
4. Create a draft invoice and confirm it does not affect receivables.
5. Mark the invoice sent and confirm it affects outstanding receivables.
6. Record a partial payment and confirm the balance decreases.
7. Add an expense and confirm operating expenses update.
8. Set a monthly target and confirm the progress bar calculation.
9. Add expected value and probability to a lead and confirm both pipeline metrics.
10. Verify mobile cards stack without horizontal scrolling.
