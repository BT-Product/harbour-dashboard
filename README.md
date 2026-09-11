# Harbour

A client-facing dashboard that makes a real estate transaction feel processed
instead of hectic.

Buying or selling a home involves weeks of silence punctuated by jargon. The
client doesn't know what's happening, so they call their agent, who repeats the
same status update to every client. Harbour gives the client a place to look:
where their transaction stands, what happens next in plain language, the homes
they've toured with their agent's notes, and — for a **move-up buyer** carrying a
sale and a purchase at once — how the two timelines relate and where the
coordination risk sits.

That last case is the reason the product exists. A pure buyer has one timeline.
A pure seller has one timeline. A move-up buyer has two that must land in the
right order, and no generic status tracker solves that. Harbour is built for the
hard case; the simpler ones fall out as a subset.

**Status:** discovery phase, in production with a live pilot client. One agent
(the product owner) is the only tenant, though the data model has been
multi-tenant since day one — the eventual play is B2B2C, with other agents as
paying customers and their clients as end users.

- Live: https://harbour-dashboard-ten.vercel.app
- Background: [`project.md`](project.md) (what this is, who it's for),
  [`strategy.md`](strategy.md) (the hypothesis under test and how it's measured),
  [`change_log.md`](change_log.md) (what was built each day and why)

## The two surfaces

**Clients** sign in and see their own transaction — stage stepper with plain
language explainers, upcoming tours, homes they've seen with notes, inspection
items, key dates, and an HOA-adjusted affordability calculator built on their
pre-approval. Nothing is editable; it's a window, not a workspace.

**The agent** manages everything from `/agent`: a home view of active clients
and tours needing debriefs, a per-client page (overview, upcoming tours, homes
seen, inspections, financials), and a standalone fast-entry debrief form
designed for a phone in a parking lot between showings.

## Two things worth knowing before you read the code

**Private notes are unreachable to clients at the database level, not in app
code.** Agents keep candid notes on `homes_seen.private_notes` ("seller is
motivated, don't show your hand"). Column-level `SELECT` on that column is
revoked from the `authenticated` Postgres role entirely, so a client session
gets `permission denied for column` even on `select *`, whatever the app does.
The only path to it is a `SECURITY DEFINER` function that checks the caller is
that client's agent. This was verified against a local Postgres instance before
being trusted.

**A buyer exists before a property does.** The buy stage sequence starts at
"House Hunting" — no address, no contract — because touring is the window this
product is actually about, and a buyer spends weeks there. `property_address` is
nullable, and `stage_definitions.requires_property` says which stages demand
one.

Deeper architectural notes, the full list of database functions, and the
conventions to follow when extending any of this live in
[`CLAUDE.md`](CLAUDE.md).

## In design: the inspection agent

Scoped 2026-09-11, **not built** — deliberately held until the discovery
thresholds above are read out. The full reasoning is in
[`strategy.md`](strategy.md); the short version, because the design problem
turned out to be more interesting than the feature:

A home inspection produces a sixty-page PDF flagging forty-odd
"deficiencies," most of them routine. The inspector sends it to the client
and the agent *at the same moment* — the client usually paid for it. So the
client opens it alone, counts forty-seven problems, and panics. The expensive
part of an inspection isn't reading the report; it's the hour on the phone
afterward.

Three things fell out of scoping it that are worth reading the doc for:

**There is no window, so the design splits on judgment.** Any pipeline that
analyzes, drafts, and *then* waits for the agent's approval delivers its
brief after the client has already spiraled. A holding message requires no
per-deal judgment — "the report is in, most of what you'll see is routine,
I'm reviewing it tonight" is true of every inspection ever conducted — so it
sends automatically on arrival while everything substantive still waits for a
human. The throwaway message turns out to be the actual intervention.

**The agent is never the source of a fact.** Realtors aren't licensed to
assess structures or price repairs. Every client-visible claim carries
provenance — inspector-stated with citation, base-rate context,
specialist-required, or the agent's own judgment — and originating a cost
figure or a severity verdict is prohibited. The counterintuitive consequence
is that a *longer* brief is safer than a short one, because "minor, don't
worry about it" is an unlicensed structural opinion in the agent's own voice.

**One core constraint got reversed, and the doc records why.** The design
originally forbade dropping any finding, on failure-to-disclose grounds.
That was wrong: the client receives the raw report directly from the
inspector, so disclosure is already complete and filtering can't undo it —
and a forty-seven-item list *is* the overload the feature exists to prevent.
The constraint was working against its own goal. What replaced it keeps the
filtered items collapsed but present, mainly so the agent's
de-prioritizations stay auditable. That argument holds only while the client
receives the raw report independently, which is flagged in the doc as the
thing to revisit if Harbour ever becomes the inspection's front door.

**Every step is labeled above or below the autonomy line**, scored on
reversibility, blast radius, and whether failure is observable or silent.
Blast radius counts the effect on a person, not just on data — a published
brief is reversible, but a client's confidence in their realtor isn't, and
the client's read of a visible error is "he didn't read this." The result is
counterintuitive: exactly one step is unconditionally above the line
(telling a client their deal is at risk — irreversible, deal-sized, and
silent when missed). Which yields the principle the whole model rests on:

> A step doesn't move below the line because the agent earned trust. It
> moves below because a detector was built for its failure mode.

Graduation is something you build, not something you wait for.

## Stack

Next.js (App Router, TypeScript, Tailwind, shadcn/ui on Base UI) deployed on
Vercel. Supabase for Postgres and auth. No ORM — plain `@supabase/supabase-js`
and `@supabase/ssr` queries against hand-written types in
`src/lib/supabase/database.types.ts`.

Every agent write goes through a `SECURITY DEFINER` Postgres function that
re-derives authorization from `auth.uid()` server-side, rather than through
table grants. Row-level security scopes every client-owned row to its tenant.

## Running it locally

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase URL, anon key, service role key
npm run dev
```

```bash
npm run build    # production build; also type-checks and lints
npm run lint
npm run seed     # demo agent + move-up / buyer / seller cohort, fixed password
npm run invite-client -- "client@example.com" "Jane Client" "555-0100"
```

Database schema and policies live in `supabase/migrations/`, applied in order;
`supabase/seed.sql` holds the stage definitions and their client-facing
explainer copy.

`/api/health` round-trips a real write against a dedicated table using the
service-role client and returns 503 on failure.

## Client onboarding

There's no public signup. The agent adds a client from **Clients → Add client**,
which asks whether they're buying, selling, or both, creates the matching
transactions, and emails an invite. The client sets their own password from the
link — no password ever passes through the app.

Auth emails need two things configured on the Supabase project, and they are
easy to miss:

1. **Site URL and redirect allow-list.** Supabase's default Site URL is
   `http://localhost:3000`. Every link the app generates now names its own
   origin explicitly, but that origin still has to be in the project's redirect
   allow-list or Supabase falls back to the Site URL — which sends a real client
   to a dead address on their own machine.
2. **Custom SMTP.** The built-in email service is rate-limited and intended for
   testing, and it sends as "Supabase Auth" from a supabase.io address, which is
   not what a client should receive from their real estate agent.
