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

## Day 2 — 2026-09-08 (Discovery phase)

Pushed the repo to GitHub (private: `BT-Product/harbour-dashboard`), then
spent the day on design and on reworking the agent side, which didn't
survive contact with how the work actually happens.

**Look and feel.** Redesigned the client dashboard around a left sidebar
with a warm, calm palette and a serif display face (Lora) for headings,
using the Perplexity Health dashboard as a reference point. Later did a
density pass against HoneyBook and Buffer — a unified stat bar with
internal dividers, icon-led list rows, a time-of-day greeting — because
the first version read as unfinished: too much dead space and a bordered
box around every row. Then removed the `max-w-3xl`/`max-w-4xl` centering
so content uses the full width, with multi-column layouts where a single
column would otherwise stretch.

**The agent side got rebuilt around clients, not properties.** The flat
`/agent/transactions` list was replaced by `/agent/clients`, which drills
into a per-client page split across tabs (overview, upcoming tours, homes
seen, inspections) rather than one long scroll. Stage editing became a
real select over any stage rather than one-tap-forward-only, and key
dates, tours, and inspection items all became editable from the UI. Added
an `/agent` home page (active clients, tours this week, tours last week,
plus a nudge listing recent tours to check they got debriefed) and made
it the post-login landing.

This is a deliberate departure from the build spec's section 4a, which
scoped the agent to exactly two surfaces and left everything else in
Supabase Studio. The reasoning still stands for *entry friction* — the
debrief form is still its own fast standalone page — but managing a
client's transaction turned out to need a real UI, so we revisited it.

**Two structural decisions worth remembering:**

- Tours are now **upcoming-only**. A real tour outing is 5–6 addresses on
  one day, so both sections were flooding after a couple of weekends.
  Tours and Homes Seen are now grouped into one card per date, and once a
  tour date passes it drops off Tours entirely — the debrief under Homes
  Seen becomes the record of it. That also removed the duplication where
  the same home showed up in both places.
- **Top Contenders** on Homes Seen shows every home marked "strong," with
  no fixed cap. A hard top-2 was considered and rejected: an arbitrary
  cutoff could hide a home the agent actually flagged.

**Bugs found by clicking through the app, not by typecheck or lint:**

- Dialog triggers nested a `<button>` inside a `<button>`, a real
  hydration error, from passing a full `<Button>` through Base UI's
  `render` prop.
- Select dropdowns displayed raw values (`loan_approval`) instead of
  labels — masked for a while because single-word stages like "listed"
  happen to look presentable.
- Server actions only revalidated the overview route, so edits made from
  the new tab sub-routes could show stale data.
- The sidebar's bottom block wasn't pinned to the bottom because the
  shell used `min-h-screen` rather than `h-screen`.

**The app was unusable on a phone**, and had been since the sidebar was
introduced. Both sidebars were a fixed 256px with no responsive handling,
leaving ~119px of content on a 375px screen. This never showed up on
desktop because the old narrow container constrained the content, not the
sidebar. Fixed with a drawer: below `lg` the sidebar hides behind a
hamburger in a top bar; at `lg`+ nothing changed. This mattered more than
a normal layout bug — the debrief flow is explicitly designed for phone
use between showings, and clients are likely to open their dashboard on a
phone first.

Deployed to production after each change and verified live, including at
a 375px viewport.

### Not yet done

- Pilot cohort not yet selected or invited (`npm run invite-client` is
  ready; no real clients onboarded).
- Stage-explainer copy is a first draft — needs broker review and a Fair
  Housing check before any real client sees it.
- Brokerage name/DRE number in the `agents` row are still placeholders.
- Creating transactions and entering pre-approvals are still Studio-only;
  only editing is in the UI.
- Inspection report upload with LLM extraction is still a future idea,
  deliberately not started.
- `tours.home_seen_id` exists in the schema but nothing populates it, so
  a tour and its debrief aren't actually linked. The "recent tours — got
  a debrief written?" nudge is date-based, not a real gap calculation.
- Dark mode colors are defined but not wired up (nothing sets the `.dark`
  class), so the app is light-only.
