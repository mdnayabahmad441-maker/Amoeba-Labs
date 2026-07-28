# Portal System Audit and Stabilization

## Executive summary

The portal is a working founder-operated CRM, operations, project, and finance system built with Next.js, React, TypeScript, Tailwind CSS, and Supabase.

The currently implemented portal covers:

- venture management;
- website enquiry capture;
- lead management, qualification, scoring, and next actions;
- client management;
- follow-ups and activity history;
- employee assignment;
- tasks and daily execution;
- proposals;
- projects and milestones;
- invoices, payments, expenses, and basic financial reporting;
- a Today command centre;
- settings for business identity, tax, currency, numbering, and lead scoring;
- a calendar interface whose database migration has not yet been applied.

The application builds successfully. The Phase 1, Phase 2 next-action, and Phase 3 lead-scoring database upgrades are present in the connected database. The calendar code exists, but its four calendar tables are not present, so calendar functionality is not yet live.

The main risks are not missing screens. They are access control, hard deletion, workflow duplication, partial audit logging, and inconsistent date handling. Those should be addressed before adding more major modules.

## Current architecture

### Application layer

- Next.js App Router with server layouts and client-side portal pages.
- React 19 and TypeScript.
- Tailwind CSS for responsive UI.
- Supabase SSR authentication on the server.
- Supabase browser client for most portal reads and mutations.
- jsPDF for downloadable business documents.
- Vercel-compatible deployment structure.

### Authentication flow

1. A user submits the login form.
2. `/api/auth/login` authenticates through Supabase and writes the session cookies.
3. `proxy.ts` protects `/portal/*`.
4. `app/portal/layout.tsx` verifies the authenticated user again.
5. Access is currently restricted in application code to one configured founder email.

This gives the UI two authentication checks, but database authorization still depends on Supabase Row Level Security.

### Data access

Most portal pages use the browser Supabase client directly. This makes RLS the real security boundary. The public enquiry API writes website leads through a server route and uses the service-role key when configured, otherwise the anonymous client.

## Portal navigation and features

### Dashboard — `/portal`

The Dashboard provides a high-level business snapshot, including operational totals and quick access to day-to-day work. Some daily action content overlaps with the newer Today page and should eventually be removed from the Dashboard so it remains strategic.

### Today — `/portal/today`

The Today command centre brings together:

- overdue and due-today tasks;
- follow-ups due today or overdue;
- lead and client next actions;
- calendar events when the calendar schema is available;
- manually created daily action items;
- completion and rescheduling controls;
- source links back to the underlying record.

It has now been stabilized so the page continues to work even when the optional calendar tables have not been installed.

### Calendar — `/portal/calendar`

The calendar interface supports code paths for:

- meetings, calls, follow-ups, deadlines, reminders, field visits, and other event types;
- lead, client, project, task, and proposal associations;
- attendees;
- reminders;
- recurrence settings;
- event status and notes.

Current status: the UI and migration file exist, but the required database tables are absent. Calendar is therefore coded but not live until `CALENDAR_APPOINTMENTS_UPGRADE.sql` is reviewed and applied.

### Leads — `/portal/leads`

Lead management includes:

- manual lead creation and editing;
- website enquiry capture;
- source, stage, contact, notes, value, and follow-up information;
- detailed qualification fields;
- qualification statuses;
- problem severity, urgency, authority, need, ability to pay, and founder fit;
- expected project value and probability of closing;
- automated lead score from 0–100;
- score confidence and score explanation;
- recommended next action;
- owner assignment;
- dated next actions;
- follow-up recording;
- activity timeline;
- proposal association.

Known gap: there is no complete, explicit lead-to-client conversion workflow. A lead can progress toward proposals and won status, but conversion into a client record is not implemented as one safe, guided operation.

### Clients — `/portal/clients`

Client management includes:

- company and contact information;
- GST and address details;
- status, notes, and assignment;
- next actions and last-contact tracking;
- follow-up recording;
- activity timeline;
- links into related work.

### Follow-ups — `/portal/followups`

Follow-ups support:

- lead or client association;
- due date and type;
- outcome and notes;
- completion state;
- contact history;
- updating the related record’s last-contact and next-action information.

### Employees — `/portal/employees`

The employee module stores team members used for operational ownership and assignment. Employees can be connected to leads, clients, tasks, and next actions.

This is operational employee management, not a full HR, payroll, attendance, or permissions system.

### Tasks — `/portal/tasks`

Task management includes:

- task creation, editing, assignment, and completion;
- due dates and priorities;
- relation to operational work;
- display in Today when due or overdue.

### Proposals — `/portal/proposals`

Proposal management includes:

- proposal details and line items;
- client and lead association;
- status management;
- downloadable documents;
- acceptance handling;
- creation of a project from an accepted proposal;
- conversion of a proposal to an invoice.

The proposal-to-project and proposal-to-invoice actions exist, but stronger duplicate prevention and audit protection should be added before wider multi-user use.

### Projects — `/portal/projects`

Project management includes:

- client-linked projects;
- project status, dates, value, and notes;
- milestones;
- progress and delivery tracking;
- project creation from proposals.

### Billing — `/portal/billing`

Billing includes:

- invoices and invoice line items;
- tax and totals;
- client association;
- due dates and status;
- payment recording;
- partial and full payment handling;
- overdue-state calculation;
- downloadable invoice documents.

This is practical founder-level billing, not a double-entry accounting ledger.

### Expenses — `/portal/expenses`

Expense management includes:

- expense recording and editing;
- categories, vendors, tax, dates, and amounts;
- venture association;
- CSV export;
- summary reporting.

### Ventures — `/portal/ventures`

Venture management allows multiple business ventures to exist in the same application. Most screens currently select the first active venture, so the application is not yet a polished multi-venture switching experience.

### Settings — `/portal/settings`

Settings cover:

- business identity and contact details;
- currency and tax configuration;
- invoice and proposal numbering;
- business document preferences;
- operational warning thresholds;
- lead-scoring weights.

## Route inventory

### Public routes

- `/`
- `/apply`
- `/auth/login`
- `/auth/signup`
- `/auth/callback`

### Public/server API routes

- `/api/enquiries`
- `/api/auth/login`

### Protected portal routes

- `/portal`
- `/portal/today`
- `/portal/calendar`
- `/portal/leads`
- `/portal/clients`
- `/portal/followups`
- `/portal/employees`
- `/portal/tasks`
- `/portal/proposals`
- `/portal/projects`
- `/portal/billing`
- `/portal/expenses`
- `/portal/ventures`
- `/portal/settings`

## Database and migration status

The connected database was checked through read-only REST requests.

| Upgrade or area | Status | Evidence |
|---|---|---|
| Core portal schema | Applied | Core venture, CRM, task, project, proposal, billing, expense, employee, settings, and activity tables respond |
| Today command centre | Applied | `today_action_items` and related activity structures exist |
| Phase 2 next-action engine | Applied | Lead/client next-action, owner, and last-contact columns exist |
| Phase 3 qualification and scoring | Applied | Qualification, score, confidence, scoring-weight, and warning columns exist |
| Calendar and appointments | Not applied | Calendar event, attendee, reminder, and integration tables are absent |

### Confirmed core tables

- `ventures`
- `business_settings`
- `leads`
- `clients`
- `employees`
- `tasks`
- `followups`
- `proposals`
- `projects`
- `invoices`
- `payments`
- `expenses`
- `today_action_items`
- `activity_logs`

### Calendar tables expected by code but currently absent

- `calendar_events`
- `calendar_event_attendees`
- `calendar_event_reminders`
- `calendar_integrations`

No database migrations were applied automatically during this audit.

## End-to-end workflow status

| Workflow | Status | Notes |
|---|---|---|
| Website enquiry → lead | Working | Public enquiry API inserts a lead |
| Lead → qualification | Working | Qualification schema and UI are present |
| Qualification → automated score | Working | Database scoring trigger and settings exist |
| Lead/client → next action | Working | Phase 2 schema and UI are present |
| Lead/client → follow-up | Working | Follow-up records and contact updates exist |
| Due work → Today | Working | Tasks, follow-ups, next actions, and manual items are aggregated |
| Record → calendar event | Pending migration | UI exists; database tables do not |
| Lead → client | Incomplete | No single canonical conversion workflow |
| Lead/client → proposal | Working | Proposal associations exist |
| Accepted proposal → project | Working in code | Duplicate/idempotency protection should be strengthened |
| Proposal → invoice | Working in code | Requires a linked client |
| Invoice → payment/status | Working | Partial/full payments update invoice state |
| Project → milestones/progress | Working | Project delivery tracking exists |
| Expense → export/report | Working | CSV export and summaries exist |

## Security findings

### Critical: overly broad authenticated RLS policies

Several schema policies allow any authenticated Supabase account to access records without enforcing venture ownership. The application-level founder email check reduces exposure through the portal, but it is not a sufficient database security boundary.

Affected area: core portal tables governed by broad policies such as `FOR ALL TO authenticated USING (true)` or checks that only require a non-null authenticated user.

Recommended fix: create a database-level founder or venture-membership authorization model and rewrite every RLS policy around that model.

### High: public signup remains available

The signup screen can create Supabase users even though only one founder email is permitted into the portal. Combined with broad authenticated policies, unauthorized account creation is dangerous.

Recommended fix: disable public signup or restrict it to an invitation-only founder/team-member process before loosening portal access.

### High: business and financial records are hard-deleted

Hard-delete actions exist for leads, clients, invoices, expenses, projects, proposals, tasks, employees, follow-ups, and ventures. Invoice deletion can also remove related payment and line-item records through cascades.

Recommended fix: replace user-facing deletion with archive/void/soft-delete states and retain immutable audit history for financial records.

### High: activity logging is incomplete

An activity log exists, but it does not cover every create, edit, status transition, deletion, payment, and conversion consistently.

Recommended fix: enforce audit entries through shared server actions or database triggers rather than relying on each screen to remember logging.

### Medium: no visible rate limiting

The login and enquiry APIs do not currently implement application-level rate limiting.

Recommended fix: add per-IP and per-account rate limits, abuse logging, and safe generic authentication errors.

### Medium: browser-side mutations depend completely on RLS

Most portal writes occur directly from client components. This is acceptable only when RLS is exact and extensively tested.

Recommended fix: secure RLS first, then move sensitive multi-step operations—payments, proposal conversion, lead conversion, and destructive actions—behind transactional server endpoints or database functions.

### Public enquiry stabilization completed

The enquiry API previously accepted a Formspree endpoint from the browser, creating an outbound-request/SSRF risk. It now:

- uses a server-side allowlist of known forms;
- ignores arbitrary client-selected endpoints;
- validates and normalizes the email;
- applies field-length limits;
- limits the accepted data shape.

## Data safety and deletion map

| Module | Current destructive behavior | Risk |
|---|---|---|
| Leads | Direct delete | Lost acquisition and history data |
| Clients | Direct delete | Orphaned business context |
| Follow-ups | Direct delete | Lost communication history |
| Tasks | Direct delete | Lost execution history |
| Employees | Direct delete | Broken assignment/history context |
| Proposals | Direct delete | Lost commercial record |
| Projects | Direct delete | Lost delivery record |
| Invoices | Direct delete with related cascades | Financial record loss |
| Expenses | Direct delete | Financial reporting loss |
| Ventures | Direct delete | Potentially broad cascading loss |

Deleting and reinserting proposal/invoice line items, calendar attendees, or reminders during an edit is a different pattern, but still needs transaction safety and audit coverage.

## Duplicate and overlapping workflows

The portal currently has several ways to represent the same business intent:

- `leads.stage` and `leads.qualification_status` both describe lead progression;
- `leads.next_follow_up` and `next_action_at` both schedule future work;
- follow-ups, next actions, tasks, calendar events, and Today manual items can all represent an upcoming action;
- the Dashboard and Today both present daily execution information;
- manual Today meeting/field-visit items overlap with the calendar;
- several pages independently select the first active venture;
- activity history is split between domain records and partial `activity_logs`.

Recommended canonical model:

- qualification status owns sales progression;
- next action owns the next required action on a lead or client;
- follow-up owns a completed or scheduled communication;
- task owns general work;
- calendar owns a time-blocked appointment;
- Today is a read/execute view over those sources, not another duplicate task system;
- Dashboard owns strategic metrics, not the daily queue.

## Date and timezone findings

The portal is intended for Asia/Kolkata. The layout hydration mismatch was caused by server and browser locale formatting producing `20/7/2026` and `7/20/2026`. The header now renders an explicit `en-IN`, `Asia/Kolkata` value passed consistently from the server.

Remaining risks:

- several pages derive a date with `new Date().toISOString().split("T")[0]`, which uses UTC and can select the wrong local date near midnight;
- several screens use `toLocaleDateString()` without an explicit locale and timezone;
- follow-up date conversion assumes the runtime’s local timezone;
- calendar date conversion depends on browser/runtime timezone;
- timestamps and date-only business fields are not consistently separated.

Recommended fix: introduce shared India-time date helpers, explicitly distinguish date-only values from instants, and remove raw date formatting from feature components.

## Responsive and accessibility findings

The portal uses responsive Tailwind layouts and mobile navigation, but large CRUD tables and dense modal forms remain the highest-risk mobile areas.

Important improvements:

- use card or stacked representations for dense tables on small screens;
- ensure all icon-only actions have accessible labels;
- make destructive actions visually distinct and confirmation-based;
- verify modal focus trapping, escape behavior, and scroll containment;
- keep primary actions reachable without horizontal scrolling;
- use consistent validation summaries and field-level messages.

An authenticated, device-level browser regression pass is still required before production sign-off because the audit did not use a production founder session or mutate live business records.

## Stabilization changes completed in this audit

### Today fallback

File: `app/portal/today/page.tsx`

The calendar query is now optional. Missing calendar tables no longer prevent Today from loading its tasks, follow-ups, next actions, and manual items.

### Public enquiry API protection

Files:

- `app/api/enquiries/route.ts`
- `components/Contact.tsx`
- `app/apply/page.tsx`

Arbitrary outbound form endpoints were removed from browser payloads and replaced with a server-side allowlist plus input normalization and limits.

### Previous stability fixes retained

- server-backed login route and cookie handling;
- deterministic India-time portal header to prevent hydration mismatch;
- build-safe TypeScript for the new portal modules.

## Verification completed

- Production build: passes.
- TypeScript compilation as part of the Next.js build: passes.
- Route generation: passes for all public, API, and portal routes.
- Targeted lint for the latest Today/calendar/layout/type changes: passes.
- Repository-wide lint: does not yet pass. It reports 31 errors and 5 warnings in older dashboard, follow-up, project, proposal, venture, table, authentication, and expense code. Most errors are explicit `any` types; the Dashboard also has a React hook/declaration-order error.
- Database migration status: checked with read-only requests.
- No live business records were created, edited, or deleted during the audit.

The repository currently has no automated test suite or `test` script. This is a release risk for payment calculations, scoring, conversions, RLS, and cross-module workflows.

## Safe next phase: security and data protection

The next phase should be completed before more feature expansion.

1. Introduce a venture-membership or founder-access table and a reusable authorization function.
2. Replace broad authenticated RLS policies on every business table.
3. Disable public signup or implement invitation-only membership.
4. Add RLS tests for anonymous, unauthorized authenticated, founder, and future employee roles.
5. Add `archived_at`, `archived_by`, and appropriate void/status fields.
6. Replace hard-delete UI actions with archive or void operations.
7. Protect invoice, payment, expense, proposal, and project histories from destructive edits.
8. Make activity logging complete and tamper-resistant.
9. Move sensitive multi-record workflows behind transactional database functions or server routes.
10. Add login and enquiry rate limiting.
11. Add structured error reporting and backup/export procedures.
12. Add automated tests for lead scoring, Today aggregation, payments, proposal conversion, and timezone boundaries.

Only after this phase should navigation and workflow consolidation proceed:

- make Today the single daily execution view;
- keep Dashboard strategic;
- choose one canonical lead progression field;
- build an explicit lead-to-client conversion;
- then apply and activate the calendar schema.

## Copy-ready co-founder summary

We currently have a working founder business portal that combines CRM, lead qualification, client management, follow-ups, task execution, proposals, project delivery, invoicing, payment tracking, expense management, venture settings, and a daily command centre.

Website enquiries automatically enter the CRM as leads. Leads can be qualified, scored, assigned, followed up, given dated next actions, and progressed toward proposals. Proposals can be turned into projects and invoices. Projects have milestone and progress tracking. Invoices support partial and full payments, overdue tracking, and downloadable documents. Expenses can be tracked and exported. The Today screen combines all due and overdue work into one actionable view.

We also have a calendar module coded, but its database migration has not yet been installed, so it should be considered pending rather than live.

The system is technically healthy and builds successfully, but the next priority should be security and data protection—not more features. Database access policies are currently too broad for multiple authenticated users, several important records can be permanently deleted, activity logging is incomplete, and some workflow concepts overlap. The safest next phase is to tighten database permissions, disable unrestricted signup, introduce archive/void behavior, protect financial history, complete audit logging, standardize India-time date handling, and add automated tests. After that, we can simplify navigation and make the lead-to-client-to-proposal-to-project-to-invoice journey fully canonical.
