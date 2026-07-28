# Phase 9: Guided Lead-to-Client Conversion

Phase 9 replaces fragmented acceptance, project, and invoice actions with a review-first conversion wizard on the Leads page.

## Wizard

1. Confirm the lead and select its sent or accepted proposal.
2. Review duplicate clients matched by normalized phone, email, or organization name.
3. Create a new client or deliberately link an existing one.
4. Record agreement and deposit requirements.
5. Choose whether to create a Planning project, draft invoice, onboarding meeting, and initial task.
6. Review all outputs and confirm once.

The database performs the conversion in one transaction. A failure rolls back every step.

## Safety and workflow rules

- A proposal linked to the lead is required.
- The proposal becomes Accepted only when conversion succeeds.
- Invoice creation produces a Draft only; nothing is sent automatically.
- One active project and one initial invoice are permitted per proposal.
- The lead becomes Won only after the client and selected outputs are created.
- Existing lead history remains and the conversion activity links the lead, client, and project timelines.
- A `lead_conversions` record preserves the conversion relationship and commercial choices.
- Re-running conversion for the same lead is blocked.

## Migration order

After a production backup, run:

1. `SECURITY_AND_DATA_PROTECTION_UPGRADE.sql`
2. `NEXT_ACTION_ENGINE_UPGRADE.sql`
3. `CALENDAR_APPOINTMENTS_UPGRADE.sql`
4. `PHASE_8_ACTIVITY_UNIFICATION_UPGRADE.sql`
5. `PHASE_9_LEAD_CONVERSION_UPGRADE.sql`

## Production verification

Use a test lead with a sent proposal:

1. Confirm duplicate matches before conversion.
2. Convert using a new client and verify client, project, draft invoice and line items.
3. Verify the onboarding event appears in Calendar and Today.
4. Verify the initial task appears in Tasks and Today.
5. Verify the lead is Won and the proposal is Accepted.
6. Verify the unified timelines retain pre-conversion history.
7. Attempt a second conversion and confirm it is rejected.
