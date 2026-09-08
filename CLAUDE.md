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
- **Agent writes go through RPC functions**, not direct table
  inserts/updates: `agent_upsert_home_debrief`, `agent_advance_stage`. Both
  take the target `client_id`/`transaction_id` and re-derive authorization
  from `auth.uid()` server-side — never trust a client-supplied "I am the
  agent" flag.
- **`/api/health`** round-trips a real write against a dedicated
  `_health_check` single-row table (migration `0003`) using the service-role
  client, never the app's real tables. Returns 503 on failure.

## What stays in Supabase Studio, on purpose

Per the build spec's v1 scope, only two agent-facing UIs exist:
`/agent/debrief` (tour debrief entry) and `/agent/transactions` (one-tap
stage advance). Tour scheduling, inspection item entry, and preapproval
records are entered directly in Supabase Studio — no UI was built for them
because they're low-frequency, desk-context, long-form data entry, not the
"parking lot between showings" workflow the two built surfaces optimize for.
Don't add UI for these without revisiting that call first.

## Client onboarding

No public signup. Real clients are invited via `npm run invite-client`
(Supabase's invite-by-email flow — they set their own password). Demo/test
accounts from `npm run seed` use a fixed password instead since they're fake
data, not real onboarding — see the comment at the top of `scripts/seed.ts`.
