# Phase 8: Activity and Action Unification

This phase keeps the existing operational tables but gives each one a clear role:

- **Activity** records something that happened.
- **Next action** is the single primary customer-facing step on a lead or client.
- **Calendar event** reserves time.
- **Task** represents internal work.
- **Follow-up** records or schedules a customer interaction.

## Implemented

- Activity logs can link simultaneously to a lead, client, and project.
- Existing direct lead, client, and project logs are backfilled into those links.
- The same timeline component now supports leads, clients, and projects.
- Calendar scheduling, completion, cancellation, and rescheduling are recorded automatically by database triggers.
- Lead and client next-action scheduling/rescheduling are recorded automatically.
- `complete_primary_next_action` atomically records the completed interaction, clears it, and optionally creates one replacement next action.
- Follow-up logging now records interaction notes and relationship links in the unified timeline.
- Projects now expose a Timeline action.
- The existing lead/client columns continue to enforce one primary next action per record; no competing action table was introduced.

## Migration

After a backup, run:

1. `SECURITY_AND_DATA_PROTECTION_UPGRADE.sql`
2. `NEXT_ACTION_ENGINE_UPGRADE.sql`
3. `CALENDAR_APPOINTMENTS_UPGRADE.sql`
4. `PHASE_8_ACTIVITY_UNIFICATION_UPGRADE.sql`

The migration is additive and repeatable. It does not delete legacy follow-ups, tasks, events, or activities.

## Remaining verification in Supabase

Because the local workspace is not connected to the production database, verify after applying the migration:

1. Complete and reschedule a calendar event and inspect the related record timeline.
2. Reschedule a lead and client next action and confirm a single activity is updated.
3. Call `complete_primary_next_action` for a test lead and confirm the old action is logged and the replacement is the only primary future action.
4. Confirm a user without venture membership cannot execute the function against that venture.
