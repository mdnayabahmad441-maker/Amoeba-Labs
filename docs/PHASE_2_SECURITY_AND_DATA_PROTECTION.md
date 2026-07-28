# Phase 2: Security and Data Protection

## Outcome

Phase 2 changes the portal from application-only access checks and permanent deletion to database-enforced venture access, archival, invoice voiding, append-only audit history, invitation-only accounts, and basic API abuse protection.

## Deployment order

The SQL migration must be applied before deploying the matching application code because active-list queries now reference `archived_at`.

1. Back up the Supabase database.
2. Confirm the authorised founder exists in Supabase Auth with the email configured in `lib/auth-config.ts`.
3. Review the founder email in `SECURITY_AND_DATA_PROTECTION_UPGRADE.sql`.
4. Run `SECURITY_AND_DATA_PROTECTION_UPGRADE.sql` in the Supabase SQL Editor.
5. Run the verification queries below.
6. Deploy the application.
7. Sign in with the founder account and test every portal module.
8. Test an unauthorized authenticated account and confirm it cannot read ventures or business tables.

Do not deploy the application changes before the migration.

## What the migration does

- Adds `portal_memberships` as the database authorization source.
- Seeds the existing founder into every current venture.
- Adds `has_venture_access(venture_id)`.
- replaces broad authenticated policies with membership-scoped policies;
- adds archive metadata to operational records;
- adds void metadata and a required UI reason for invoices;
- records archive, restore, and invoice-void events through database triggers;
- makes activity history append-only to portal users;
- blocks authenticated hard deletion of top-level operational and financial records;
- retains line-item replacement during proposal and invoice editing for compatibility.

## Application changes

- Public signup redirects to login and explains that access is invitation-only.
- Authentication failures use a generic response.
- Login and enquiry endpoints have basic fixed-window rate limits.
- Leads, clients, tasks, follow-ups, employees, proposals, projects, expenses, and ventures now archive.
- Invoices now void with a reason instead of deleting invoice, item, and payment history.
- Active pages, Dashboard, Today, and Calendar exclude archived records.
- The pending calendar migration now uses venture-membership policies.

## Verification queries

Run these after applying the migration:

```sql
SELECT user_id, venture_id, role, status
FROM portal_memberships
ORDER BY created_at;

SELECT public.has_venture_access(id) AS current_user_has_access, id, venture_name
FROM ventures;

SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'authenticated'
  AND table_name IN (
    'ventures', 'clients', 'leads', 'tasks', 'followups', 'employees',
    'proposals', 'projects', 'invoices', 'payments', 'expenses',
    'today_action_items', 'activity_logs'
  )
ORDER BY table_name, privilege_type;
```

Expected results:

- the founder has one active membership per venture;
- `has_venture_access` returns true for the founder;
- authenticated policies reference venture membership rather than `USING (true)`;
- protected top-level tables do not grant authenticated `DELETE`;
- `activity_logs` does not grant authenticated `UPDATE` or `DELETE`.

## Manual smoke test

Using the founder account:

1. Open every portal route.
2. Create and edit a temporary lead.
3. Archive it and confirm it leaves Leads, Dashboard, and Today.
4. Confirm an `archived` entry exists in `activity_logs`.
5. Create a draft invoice without payments.
6. Void it with a reason.
7. Confirm its invoice items remain and the void reason is stored.
8. Confirm normal proposal and invoice line-item editing still works.
9. Confirm public enquiry submission still creates a website lead.

Using a separate authenticated test account with no membership:

1. Request `ventures`.
2. Request `leads`.
3. Attempt an insert and update.
4. Confirm all operations return no rows or an RLS authorization error.

## Important operational notes

- The in-process rate limiter is a first-line control. Serverless instances do not share memory, so production should also enable a distributed platform/WAF rate limit.
- Supabase Auth provider settings must also have public email signup disabled in the Supabase dashboard. The application route is disabled, but provider-level configuration is the authoritative control.
- The public enquiry flow still uses the tightly constrained anonymous insert policy because no service-role key is currently configured. Adding the server-only service-role key will allow that fallback policy to be removed in a later hardening step.
- The migration does not apply itself and does not modify live data beyond seeding founder memberships.
- A database backup and authenticated smoke test are required before production rollout.

## Rollback approach

Do not roll back by deleting archive columns or memberships. If application access is blocked:

1. restore or insert the correct founder membership;
2. verify the configured email and Supabase Auth user ID;
3. inspect `pg_policies`;
4. temporarily restore only the minimum founder-scoped policy needed to recover access.

Never restore the former unrestricted `TO authenticated USING (true)` policies.
