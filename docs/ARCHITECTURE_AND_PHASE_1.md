# Groenics Portal Architecture and Phase 1

## Current architecture

- Next.js 16 App Router with React 19 and TypeScript.
- Supabase Auth and Postgres accessed through `@supabase/ssr`.
- A server portal layout and Next.js Proxy protect `/portal`; the portal currently permits one founder email.
- Client-side portal pages query Supabase directly and use shared modal, form, table, state, and WhatsApp-draft components.
- SQL upgrades are manually applied through Supabase SQL Editor.
- Styling uses Tailwind CSS 4 with a dark Groenics design system.
- Deployment is compatible with Vercel and environment-based Supabase configuration.

## Existing feature mapping

| Requested area | Existing implementation |
| --- | --- |
| Sales | Leads, follow-ups, proposals, clients |
| Delivery | Projects, milestones, tasks, employees |
| Finance | Invoices, payments, receipts, expenses |
| Organization | Ventures and business settings |
| Communications | Review-first WhatsApp drafts |
| Daily command | Dashboard widgets only; Phase 1 adds the unified Today page |

## Reusable building blocks

- `PortalLayout` navigation and responsive shell.
- `Modal`, `FormInput`, `FormSelect`, and `FormTextarea`.
- Shared loading, empty, and error states.
- Supabase browser client and existing record types.
- Existing task, follow-up, proposal, invoice, project, client, lead, employee, and venture records.

## Risks found

1. Existing RLS policies grant broad access to any authenticated user; there is no membership or role schema yet.
2. Pages select the first active venture, so multi-venture selection is not yet a real tenant boundary.
3. Existing database upgrades are not managed by a migration runner and can drift between environments.
4. Most mutations happen directly from the browser; backend authorization is therefore dependent on RLS.
5. Several existing lint errors use `any` or legacy hook patterns outside Phase 1.
6. Meetings, visits, renewals, and content do not yet have dedicated modules. Phase 1 stores these as venture-scoped command-centre actions until their planned phases add canonical records.

## Phase 1 files and tables

Files:

- `TODAY_COMMAND_CENTRE_UPGRADE.sql`
- `app/portal/today/page.tsx`
- `components/PortalLayout.tsx`
- `lib/types.ts`

New tables:

- `today_action_items`: meetings, visits, client updates, renewals, content, and other manual daily actions.
- `activity_logs`: append-only history for Today quick actions.

Existing tables read or updated:

- `ventures`, `employees`, `clients`, `leads`, `tasks`, `followups`, `proposals`, `invoices`, `projects`, and `project_milestones`.

Phase 1 intentionally does not add Calendar, Visit, Subscription, Content, or RBAC modules ahead of their approved phases.

