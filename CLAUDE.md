@AGENTS.md

# Harbour

Client-facing real estate transaction dashboard. Password-authenticated,
multi-tenant from day one, single agent (Britton) as the only tenant for now.
Full build spec context lives in the conversation that created this repo —
this file covers what a future session needs to work in the codebase.

## Stack

Next.js (App Router, TypeScript, Tailwind, shadcn/ui) on Vercel. Supabase
(Postgres + Auth) for data and auth. No ORM — plain `@supabase/supabase-js` /
`@supabase/ssr` queries against hand-written types in
`src/lib/supabase/database.types.ts`.

## Commands

```bash
npm run dev             # local dev server
npm run build            # production build (also type-checks + lints)
npm run lint
npm run seed              # seeds a demo agent + move-up/buyer/seller cohort
npm run invite-client -- "email@example.com" "Full Name" "555-0100"
```

Copy `.env.local.example` to `.env.local` and fill in the Supabase project's
URL, anon key, and service role key before running anything that touches the
database.

## Architecture notes worth knowing before changing the schema

- **Multi-tenant from day one**: every client-owned row traces back to
  `agents` via `profiles.agent_id`. There's one agent row today, but RLS
  policies scope by tenant (`is_agent_of()`, `current_agent_id()` in
  `supabase/migrations/0002_functions_and_policies.sql`) rather than assuming
  a single agent.
- **`stage_definitions` uses a composite primary key** `(transaction_type,
  stage_key)`, not `stage_key` alone. The buy and sell stage sequences reuse
  names like `offer_accepted`, `inspection`, `appraisal`, `clear_to_close`,
  `closed` — a single-column key would collide. `transactions` has a
  composite FK `(type, current_stage_key)` to match.
- **`homes_seen.private_notes` is enforced unreachable to clients at the
  database level, not just in app code.** Column-level `SELECT` privilege on
  `private_notes` is revoked from the `authenticated` Postgres role entirely
  — a client session gets `permission denied for column` even on `select *`,
  regardless of RLS. The only way to read or write the full row (private
  notes included) is through the `SECURITY DEFINER` functions
  `agent_upsert_home_debrief` / `agent_list_homes_seen`, which check
  `is_agent_of(client_id)` internally. This was verified against a local
  Postgres instance with a stubbed `auth` schema — see the migration's
  header comment for what was tested. If you ever add a new sensitive column
  to a client-readable table, use this same pattern (revoke the column grant
  + a `SECURITY DEFINER` function), not just an RLS policy.
- **Agent writes go through `SECURITY DEFINER` RPC functions**, not direct
  table inserts/updates. Each one takes the target `client_id` /
  `transaction_id` / row id and re-derives authorization from `auth.uid()`
  server-side via `is_agent_of()` — never trust a client-supplied "I am the
  agent" flag. Current set:
  - `agent_upsert_home_debrief`, `agent_list_homes_seen` (migration 0002)
  - `agent_advance_stage` (0002) — despite the name it sets any stage, not
    just the next one; the UI uses it as a general stage setter
  - `agent_update_key_dates`, `agent_upsert_tour`, `agent_delete_tour`,
    `agent_upsert_inspection_item`, `agent_delete_inspection_item` (0005)
  - `agent_upsert_preapproval`, `agent_delete_preapproval`,
    `agent_delete_client_data` (0007) — the last one deletes every app
    row a client owns in one transaction and refuses to touch a profile
    with `is_agent = true` (`is_agent_of()` is true for the agent's own
    profile, so without that guard an agent could delete themselves)
  - `agent_create_transaction` (0006) — takes `agent_id` from
    `current_agent_id()` rather than the caller, defaults a null
    `p_stage_key` to the first stage of that type's sequence, and sets
    `linked_transaction_id` on **both** legs when a move-up buyer's
    counterpart is passed
  - `update_my_partner` (0004) — the one client-side write; scoped to the
    caller's own row and only touches the two partner columns
  Follow this pattern for any new agent write rather than adding table
  grants.
- **`/api/health`** round-trips a real write against a dedicated
  `_health_check` single-row table (migration `0003`) using the service-role
  client, never the app's real tables. Returns 503 on failure.

## Agent surface

The build spec's section 4a scoped the agent to exactly two surfaces
(debrief entry + one-tap stage advance) and left everything else in
Supabase Studio. That was revisited on 2026-09-08 and deliberately
widened — managing a client's transaction needed a real UI. Today:

- `/agent` — home: active clients, tours this week/last week, and a nudge
  listing recent tours to check they got debriefed. Post-login landing.
- `/agent/clients` — client list; drills into a per-client page split
  across tabs (overview, upcoming tours, homes seen, inspections).
- `/agent/debrief` — still its own standalone fast-entry form. The
  original reasoning holds here: this is the one used in a parking lot
  between showings, so it stays optimized for speed over completeness.

Creating a transaction is on the client's Overview tab, including
linking a move-up buyer's two legs together — that link is what turns
on the coordination view, so it's offered as a checked-by-default
option whenever an unlinked opposite-side transaction exists rather
than left to be remembered. Pre-approvals are on the client's
Financials tab (buy-side only, matching the client's own nav).

Nothing about a client's normal lifecycle requires Supabase Studio any
more.

**Adding and removing a client are the one exception to the RPC rule.**
Creating and deleting an `auth.users` row is an Admin API operation, so
`src/app/agent/clients/actions.ts` uses the service-role key directly.
It calls `requireAgent()` first — an explicit `is_agent` check on the
caller's own profile — because RLS isn't doing that work there. Removal
still routes the *data* delete through `agent_delete_client_data` so the
cascade is one transaction with database-side authorization, and only
the auth user is deleted with the service role, last (deleting it first
cascades the profile away and strands everything referencing it).

These two actions return `{ ok, error }` rather than throwing: Next
scrubs server action error messages in production, and their failures
(rejected address, already invited, mail not sent) are ones the agent
has to read to act on.

## Layout

`AppShell` (`src/components/app-shell.tsx`) wraps both dashboards. Below
`lg` the sidebar hides off-canvas behind a hamburger in a top bar and
slides in as a drawer; at `lg`+ it's static and always visible. Content
is full-width — deliberately not constrained to a centered max-width
column. If you add a page, use multi-column grids at wider breakpoints
rather than letting a single column stretch, and check it at 375px.

## Client onboarding

No public signup. Real clients are invited from **Clients → Add client**
in the agent UI (Supabase's invite-by-email flow — they set their own
password, and no password ever passes through the app).
`npm run invite-client` still does the same thing from the terminal.

**The invite email depends on Supabase's SMTP setup.** The built-in
email service is for testing: it's rate-limited and won't reliably
deliver to arbitrary addresses, so custom SMTP has to be configured in
the Supabase dashboard before inviting real pilot clients. A failed send
surfaces as an error toast on the Add client dialog rather than a silent
non-delivery — but check that a pilot client actually received the email
before assuming they're onboarded.

Demo/test accounts from `npm run seed` use a fixed password instead since
they're fake data, not real onboarding — see the comment at the top of
`scripts/seed.ts`.
