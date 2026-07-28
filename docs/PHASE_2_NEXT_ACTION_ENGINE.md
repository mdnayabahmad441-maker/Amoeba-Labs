# Phase 2: Next-Action Engine

## Delivered

- Structured next actions for every lead and client: type, date/time, channel, responsible employee, expected outcome, priority, and notes.
- Last-contact timestamps and visible contact age.
- Automatic warnings for missing or missed actions, contact inactivity, repeated rescheduling, stuck lead stages, and clients requiring updates.
- Venture-configurable warning thresholds in Business Settings.
- Follow-up logging synchronizes last contact and the next action back to the related record.
- Lead/client activity history backed by the Phase 1 `activity_logs` table.
- Today Command Centre now uses `next_action_at`, ownership, and priority and includes active clients awaiting updates.
- Existing `leads.next_follow_up` remains populated for backwards compatibility.

## Database impact

Run `TODAY_COMMAND_CENTRE_UPGRADE.sql` first, followed by `NEXT_ACTION_ENGINE_UPGRADE.sql`.

Updated tables:

- `leads`
- `clients`
- `business_settings`

The migration adds constraints, partial indexes, reschedule tracking triggers, lead-stage timing, and a compatibility backfill from `leads.next_follow_up`.

## Files

- `NEXT_ACTION_ENGINE_UPGRADE.sql`
- `lib/next-action.ts`
- `components/Portal/NextActionFields.tsx`
- `components/Portal/ActivityTimelineModal.tsx`
- `components/Portal/FollowupModal.tsx`
- `app/portal/leads/page.tsx`
- `app/portal/clients/page.tsx`
- `app/portal/today/page.tsx`
- `app/portal/settings/page.tsx`
- `lib/types.ts`

## Security boundary

Phase 2 remains within the current founder-only authentication model. Data is venture-scoped in queries and foreign keys, but the existing broad authenticated RLS policies are not a complete multi-user tenant boundary. Role and membership enforcement remains scheduled for the security foundation phase.

