# Phase 14: Field-Visit Management

Field Visits is a mobile-first field-sales workflow linked to leads and clients.

## Included

- Business/contact, town, address, PIN, map, distance, travel cost, appointment, purpose, decision-maker and demonstration planning
- Planned, Confirmed, Completed, Cancelled, No show, and Reschedule required statuses
- Mobile map, call, and WhatsApp actions
- Outcome, problem, workaround, objections, value, and notes
- Completing a visit records a linked activity and can update the record’s single primary next action
- Proposal-task and lightweight content-idea actions
- Town and day filters
- Today integration
- Field-day report covering distance, travel cost, visits, decision-makers, demonstrations, follow-ups, proposals, pipeline value, and later wins

File/photo attachment was not added because the portal has no existing secure storage/attachment infrastructure. It should only be enabled after storage RLS, file validation, retention, and deletion rules exist.

## Migration

After a backup, run `PHASE_14_FIELD_VISITS_UPGRADE.sql` after Phase 8.

## Verification

Test planning, editing, completing, cancelling, no-show, rescheduling, map/call/WhatsApp actions, next-action creation, proposal tasks, content insights, Today visibility, town filtering, and the day report on mobile width.
