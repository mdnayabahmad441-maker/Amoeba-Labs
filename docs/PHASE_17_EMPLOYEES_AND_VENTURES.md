# Phase 17 — Employees and Ventures

This phase simplifies the founder-only operating model without removing the
records needed for future growth.

## Employees

- Employee records remain available under **More**.
- They are assignment records, not portal login accounts.
- A founder employee record is linked to the founder's authenticated user.
- New leads, clients, tasks, calendar events, Today actions, and website
  enquiries default to the founder where the relevant form supports ownership.
- The founder record cannot be archived or made inactive.
- `auth_user_id` prepares employee records for future role-based accounts, but
  this phase does not expose employee authentication.

## Business units

- The Ventures navigation label is now **Business units**.
- Groenics is selected as the default operating business.
- NaySha EduCore is classified as a **Product / offer** unless it has already
  been intentionally separated for accounting.
- Only one active, unarchived default venture is permitted.
- Operational pages select the database default instead of an arbitrary first
  active row.
- The default business cannot be archived or deactivated until another active
  business is explicitly made the default.
- Normal portal operations only archive ventures; they never delete them.

## Deployment

1. Run `SECURITY_AND_DATA_PROTECTION_UPGRADE.sql` if it has not already been
   applied.
2. Run `PHASE_17_EMPLOYEES_VENTURES_UPGRADE.sql`.
3. Open **More → Business units** and confirm Groenics has the **Default**
   badge.
4. Open **More → Employees** and confirm the founder has the **Default owner**
   badge.
5. Create a test task and lead and verify the founder is preselected.

The migration is additive and keeps all historical venture and assignment
relationships intact.
