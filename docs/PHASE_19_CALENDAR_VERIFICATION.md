# Phase 19 — Calendar Verification

Phase 19 completes the calendar lifecycle and keeps scheduling safe for a
founder-led operation.

## Verified and hardened

- Create and edit events
- Explicit completion with a required outcome
- Cancellation with a required reason
- Rescheduling with database reschedule counts and activity history
- One-time, daily, weekly, and monthly recurrence
- Future occurrence generation, capped to prevent runaway series
- Reminder and attendee copying across generated occurrences
- Meeting notes and outcomes
- Related lead, client, project, and responsible employee
- Optional next customer action after completion
- Today integration that shows only Scheduled and Confirmed events
- Mobile cards, filters, day/week/month/agenda views, and empty states
- Business timezone conversion with `Asia/Kolkata` as the safe default

Yearly and complex recurrence are intentionally unavailable. Existing yearly
metadata becomes a one-time event instead of generating unexpected future
appointments.

## External calendar safety

The internal Calendar page never creates, updates, or deletes a Google Calendar
event. Google synchronization remains review-first and requires a separately
authorized integration flow. OAuth tokens are not stored in calendar-event
records.

## Deployment

1. Run `CALENDAR_APPOINTMENTS_UPGRADE.sql` if it has not already been applied.
2. Run `PHASE_18_BUSINESS_SETTINGS_CLEANUP_UPGRADE.sql`.
3. Run `PHASE_19_CALENDAR_VERIFICATION_UPGRADE.sql`.
4. In the portal, create a one-time event linked to a test lead.
5. Reschedule it and verify `reschedule_count` increases.
6. Complete it with an outcome and create the next action.
7. Create a short recurring test series and verify future occurrences,
   attendees, and reminders.
8. Cancel a test occurrence and confirm a reason is required.

## Recurrence limits

Series generation is capped at 120 future occurrences and examines at most 240
intervals. Completed historical occurrences are preserved when a series is
edited; future scheduled occurrences are rebuilt from the parent event.
