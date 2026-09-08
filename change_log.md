# Harbour — Change Log

## Day 1 — 2026-09-07 (Discovery phase)

- Interviewed to confirm scope and a handful of build-time judgment calls
  before writing code: build the seller status strip and coordination view
  (not cut them), shadcn/ui for the interface, seed realistic demo data,
  and settled the HOA-adjusted affordability calculation (treat the
  preapproved loan at its rate as a fixed 30-year P&I budget, back-solve
  the max loan/price after a given HOA payment).
- Scaffolded the app: Next.js (App Router, TypeScript, Tailwind),
  shadcn/ui, Supabase client libraries.
- Designed and wrote the full Postgres schema and RLS policy set
  (`supabase/migrations/`), including two corrections to the original
  data model surfaced during implementation:
  - `stage_definitions` needed a composite primary key
    `(transaction_type, stage_key)` — the buy and sell stage sequences
    reuse key names (`offer_accepted`, `inspection`, etc.), which collide
    under a single-column key.
  - `homes_seen.private_notes` needed a database-level guarantee, not just
    an RLS policy, to be unreachable to clients — solved with a revoked
    column grant plus `SECURITY DEFINER` functions for agent access.
- Verified the RLS/column-grant design against a local Postgres instance
  with a stubbed `auth` schema before trusting it: confirmed a client
  session gets `permission denied` on both `select *` and an explicit
  `select private_notes`, and that the agent's debrief/stage-advance
  functions work end to end.
- Built the full v1 surface: client dashboard (overview with move-up
  coordination view and seller status strip, homes seen, tours, escrow
  stage stepper, inspections, financials with the affordability
  calculator), the two agent-facing surfaces (`/agent/debrief`,
  `/agent/transactions`), Supabase auth, and `/api/health`.
- Created the live Supabase project and Vercel project (Britton generated
  scoped credentials — a narrowly-permissioned personal access token and
  the project's DB connection string — rather than a full-access token).
  Pushed migrations and seed data to the live database.
- Seeded a demo cohort: one move-up buyer (linked buy + sell
  transactions), one pure buyer, one pure seller.
- Found and fixed three real bugs via live browser testing against the
  deployed app (not just typecheck/lint): agents landed on the empty
  client dashboard after login instead of their own tools; `/api/health`
  always reported failure due to a timestamp string-format mismatch
  between JS and Postgres; the seed script's batch insert sent an
  explicit `NULL` for `is_agent` on rows that omitted it (a PostgREST
  batch-insert quirk).
- Deployed to production: https://harbour-dashboard-ten.vercel.app.
  Verified login, the coordination view, the seller status strip, all
  client pages, agent debrief entry, stage advance, and the pure-seller
  reduced nav directly against the live deployment.
- Created `project.md`, `strategy.md`, and this file to start tracking the
  project going forward.

### Not yet done

- Pilot cohort not yet selected or invited (`npm run invite-client` is
  ready; no real clients onboarded).
- Stage-explainer copy is a first draft — needs broker review and a Fair
  Housing check before any real client sees it.
- Brokerage name/DRE number in the `agents` row are still placeholders.
