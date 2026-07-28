# Phase 3: Navigation Simplification

## Outcome

The portal navigation now reflects the founder's normal operating sequence and keeps supporting administration out of the primary menu.

## Primary navigation

1. Today
2. Leads
3. Calendar
4. Clients
5. Proposals
6. Projects
7. Billing
8. Expenses
9. Reports

## More menu

These modules remain fully available under **More**:

- Employees
- Tasks
- Follow-ups
- Ventures
- Business settings

Tasks and follow-ups have not been removed. Today continues to surface their due and overdue records, while their full modules remain available for detailed management.

## Default portal destination

Today is now the default destination for:

- successful email/password login;
- an existing authenticated session opening the login page;
- OAuth callback completion;
- an authenticated user visiting `/auth/login` or `/auth/signup`;
- direct navigation to `/portal`.

The business performance page previously served at `/portal` is now available at `/portal/reports`.

## Route behavior

| Route | Behavior |
|---|---|
| `/portal` | Server redirect to `/portal/today` |
| `/portal/today` | Default daily execution page |
| `/portal/reports` | Existing business overview/reporting page |
| Secondary module routes | Remain directly addressable and appear under More |

## Responsive behavior

- The primary menu remains vertically scrollable on smaller-height screens.
- Mobile navigation closes after selecting any destination.
- The More section expands inside the existing responsive sidebar.
- Opening a secondary module directly expands More so its location is visible.
- The collapsed desktop sidebar retains compact labels for all primary areas.

## Scope boundary

This phase changes information architecture only. It does not:

- activate the pending Calendar database migration;
- remove daily execution sections from Reports—that is Phase 4;
- change lead pipeline stages—that is Phase 5;
- change qualification/scoring—that is Phase 6 and Phase 7;
- add lead-to-client conversion—that is Phase 9.

Keeping these changes separate makes deployment and verification safer.

## Verification checklist

1. Sign in and confirm the destination is `/portal/today`.
2. Visit `/portal` and confirm it redirects to Today.
3. Open all nine primary destinations.
4. Expand More and open all five secondary destinations.
5. Refresh on a secondary route and confirm More opens with the route highlighted.
6. Test the sidebar in expanded and collapsed desktop states.
7. Test the overlay, More menu, route selection, and close behavior at a mobile width.
8. Confirm `/portal/reports` loads the former Dashboard content.
