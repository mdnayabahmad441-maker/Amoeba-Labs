# Phase 10: Agreement, Deposit and Project-Start Gates

Projects now have explicit commercial and onboarding gates:

- Agreement required, status, and accepted date
- Deposit required, amount, linked invoice, and received status
- Requirements received
- Onboarding completed
- Calculated start readiness

## Project statuses

1. Awaiting Agreement
2. Awaiting Deposit
3. Awaiting Requirements
4. Ready to Start
5. Active
6. Client Review
7. On Hold
8. Completed
9. Cancelled

The database automatically selects the appropriate awaiting status. A project cannot become Active unless every required gate is complete.

## Founder override

A blocked project can be activated only through the Founder override action. A reason is mandatory, and the user, time, reason, and incomplete gate state are written to the activity timeline.

## Conversion integration

When Phase 9 creates a project, the conversion’s agreement and deposit requirements are copied to the project automatically. An accepted proposal therefore creates a gated project rather than immediately starting delivery.

## Migration

After a production backup, run `PHASE_10_PROJECT_START_GATES_UPGRADE.sql` after the Phase 9 migration.

Existing Active and Completed projects are preserved as ready. Existing Planning projects become Awaiting Requirements.

## Verification

1. Create a project requiring an agreement and deposit.
2. Confirm it shows Awaiting Agreement.
3. Accept the agreement and confirm it moves to Awaiting Deposit.
4. Mark the deposit received and confirm requirements/onboarding remain visible blockers.
5. Complete every gate and confirm Ready to Start.
6. Change the status to Active.
7. On another blocked project, use Founder override and verify the required reason in its timeline.
