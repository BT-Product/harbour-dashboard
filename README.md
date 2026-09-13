# Harbour

A client-facing dashboard that makes a real estate transaction feel processed
instead of hectic. It's built by a practicing real estate agent, who is also
its first tenant.

**Live:** https://harbour-dashboard-ten.vercel.app
**Status:** discovery phase, in production with a live pilot client

Buying or selling a home means weeks of silence punctuated by jargon. The client
doesn't know what's happening, so they call their agent, who repeats the same
status update to every client. Harbour gives the client a place to look: where
their transaction stands, what happens next in plain language, the homes
they've toured with their agent's notes, and, for a **move-up buyer** carrying
a sale and a purchase at once, how the two timelines relate and where the
coordination risk sits.

That last case is why the product exists. A pure buyer has one timeline, and so
does a pure seller. A move-up buyer has two that must land in the right order,
and no generic status tracker handles that. Harbour is built for the hard case,
and the simpler ones come along for free.

The data model has been multi-tenant since day one. The eventual play is B2B2C:
other agents as paying customers, their clients as end users.

## How it's being run

Harbour is being run as a hypothesis test, not a launch.

- **Hypothesis:** move-up buyers with self-serve visibility into both
  transactions will visit habitually and feel more in control, without feeling
  less personally attended to.
- **Success thresholds, committed before the first client:** a median of 2+
  visits a week while a transaction is active, no client saying at close that
  they felt *less* attended to, and at least one client mentioning the
  dashboard to someone else without being prompted.
- **Riskiest assumption:** that self-serve status adds to felt care rather than
  replacing the human contact that earns referrals. High usage is a false
  positive if the relationship gets thinner.

**Where it stands:** one pilot client so far, and not yet a move-up buyer, the
case the hypothesis actually depends on. With a cohort of one, none of the
thresholds can be read yet.

### What the first real client changed

Visit tracking went in before the first client, to measure retention. The
first thing it actually produced was a usability finding. This is the first
client's first session:

```
21:11:47  /dashboard            21:12:37  /dashboard/escrow
21:12:19  /dashboard/tours      21:12:41  /dashboard/inspections
21:12:22  /dashboard/homes      21:12:56  /dashboard/financials
21:12:29  /dashboard/homes/…    21:13:52  /dashboard   (back to the start)
```

Six sections in 37 seconds, three to eight seconds each, then back to the
start. That isn't reading. It's opening doors to see what's behind them. The
overview said where they stood but nothing about what the menu contained, so the
only way to find out was to click everything. It's now a map: one plain
sentence of status, then a card per section showing what's inside. We could
never have spotted this ourselves, because we already knew what each section
held.

The reasoning behind decisions like this is in the tracking docs:
[`project.md`](project.md) (what this is, current phase),
[`strategy.md`](strategy.md) (hypothesis, measurement, design reasoning), and
[`change_log.md`](change_log.md) (what was built each day and why). Reversed
decisions are recorded as reversals, with the argument that changed them.

## What's built

**Clients** sign in to an overview that says where things stand in one plain
sentence ("You're house hunting. Your next tour is Sunday"), then shows what's
inside each section: upcoming tours with stops and times, homes seen with the
agent's notes and favorites, a stage timeline with plain-language explainers,
inspection items, key dates, and an HOA-adjusted affordability calculator based
on their pre-approval. Nothing is editable. It's a window, not a workspace.
The evening before a tour, they get one email listing every stop.

**The agent** manages everything from `/agent`: a home view of active clients
and tours that still need a debrief, a per-client page (overview, tours, homes
seen, inspections, financials), and a standalone debrief form built for a phone
in a parking lot between showings. A client's whole lifecycle, from invite to
removal, runs from the app, with nothing left to do by hand in the database.

## Engineering decisions worth knowing

**Private notes are unreachable to clients at the database level, not in app
code.** Agents keep candid notes on each home ("seller is motivated, don't
show your hand"). Postgres revokes read access to that column entirely for the
client role, so a client session gets `permission denied for column` even on
`select *`, whatever the app does. The only path to it is a `SECURITY DEFINER`
function that checks the caller is that client's agent. This was verified
against a local Postgres instance before being trusted.

**A buyer exists before a property does.** The buy sequence starts at "House
Hunting," with no address and no contract, because touring is the window this
product is really about and a buyer spends weeks there. `property_address` is
nullable, and each stage declares whether it requires one.

**Reminders can't double-send.** Each client-and-date pair is claimed with a
unique constraint *before* the email goes out, so a cron retry or a manual
resend can't email anyone twice. A failed send releases the claim, so failures
get retried instead of silently never sending. "Tomorrow" is calculated in the
timezone where the tours happen, not the server's (UTC), which would otherwise
skip every Pacific-coast tour before 5pm.

**When the logs say nothing is wrong, the bug is underneath the application.**
The first client's login failed three separate times, and every request
Harbour served returned success throughout. The causes were all one layer down:
a Supabase redirect silently replaced with localhost, SMTP rejecting a
password, and the client's employer's email scanner stripping the sign-in token
from the URL fragment. Moving the token into the query string fixed the last
one. Visit tracking is what proved they never reached the dashboard, even
though their auth record said the invite was accepted.

More architectural notes, the full list of database functions, and the
conventions for extending any of this are in [`CLAUDE.md`](CLAUDE.md).

## In design: the inspection agent

**Designed, not built.** It's deliberately kept out of the discovery pilot so
the two don't muddy each other, and unlike the dashboard it's aimed at many
agents from the start. The full design is in [`strategy.md`](strategy.md).

**The problem.** A home inspection produces a sixty-page PDF with forty-odd
flagged "deficiencies," most of them routine. The inspector sends it to the
client and the agent at the same moment, so the client opens it alone, counts
the problems, and panics. The expensive part isn't reading the report. It's the
hour on the phone afterward.

**The principles it rests on:**

- **Fast where no judgment is needed, reviewed where it is.** Any flow that
  drafts and then waits for the agent's approval reaches the client after the
  panic has started. So a message that needs no judgment ("the report's in,
  most of this is routine, I'm reviewing it tonight") sends automatically on
  arrival, and everything substantive waits for a human.
- **The agent is never the source of a fact.** Agents aren't licensed to
  assess structures or price repairs, so every claim shown to a client is
  attributed: to the inspector, to base-rate context, or to a specialist who
  needs to look. A counterintuitive result is that a longer brief is *safer*
  than a short one, because "minor, don't worry about it" is an unlicensed
  opinion.
- **Harbour never withholds, it only frames.** The client already has every
  source document, so leaving something out protects no one. This reversed an
  earlier rule against filtering findings, and it shapes how costs are
  presented. The most frightening thing about "$10,700 in repairs" is that it
  reads as a bill, when at this stage it's what the buyer is asking the
  *seller* to cover. Saying so isn't spin. It's what the number is for.
- **Autonomy comes from detectors, not from trust.** Each workflow step was
  scored on how reversible it is, how far the damage spreads (including the
  damage to a client's confidence in their agent), and whether a failure would
  be visible or silent. Only one step is always a human's: telling a client
  their deal may be at risk. The only other exception is the first brief for
  any new client. Everything else runs automatically *because* a specific check
  catches its failure mode, and a step with no check stays with a human.

**The two most valuable parts came from working a real inspection, not from
the design sessions:**

- **The same defect shows up in several reports, and only one of them prices
  it.** The home inspection flags an issue with no cost, and the pest or roof
  inspector finds the same thing and quotes a repair. Matching them gives a
  licensed price with no contractor to chase, which overturned an earlier plan
  to defer cost data. The agent proposes matches and never merges them itself,
  because a wrong merge hides one defect under another's cost.
- **A narrative for the agent's call.** Grouping findings by root cause turns
  fourteen separate crises into one problem with one fix. This changes what the
  client thinks the problem *is*, which calms them more than any statistic. It's
  also the lowest-risk thing the agent produces, because a licensed human retells
  it in their own words.

**Where it stands.** Several questions are settled. The client can't ask the
agent questions, because that would replace the call and contradict the
riskiest assumption above. Severity comes from the inspector's own grading
rather than the model's judgment, and a report without usable grading goes to
a human. One design question is still open: when to publish while specialist
reports are still arriving. Before anything is built, a broker and a real
estate attorney will review the rules for how the narrative is framed.

## Stack

Next.js (App Router, TypeScript, Tailwind, shadcn/ui on Base UI) deployed on
Vercel. Supabase for Postgres and auth. Resend for outbound client email, with
the nightly reminder run by Vercel Cron. No ORM: plain `@supabase/supabase-js`
and `@supabase/ssr` queries against hand-written types in
`src/lib/supabase/database.types.ts`.

Every agent write goes through a `SECURITY DEFINER` Postgres function that
re-checks authorization from `auth.uid()` on the server, rather than through
table grants. Row-level security scopes every client-owned row to its tenant.

## Running it locally

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

`.env.local` needs the Supabase URL, anon key, and service role key. Tour
reminders also need `RESEND_API_KEY`, `EMAIL_FROM` (on a verified sending
domain), and `CRON_SECRET`. The example file documents each one.

```bash
npm run build    # production build; also type-checks and lints
npm run lint
npm run seed     # demo agent + move-up / buyer / seller cohort, fixed password
npm run invite-client -- "client@example.com" "Jane Client" "555-0100"
```

The database schema and policies are in `supabase/migrations/`, applied in
order. `supabase/seed.sql` holds the stage definitions and their client-facing
explainer copy. `/api/health` runs a real write against a dedicated table and
returns 503 on failure.

## Setup that's easy to get wrong

There's no public signup. The agent adds a client from **Clients → Add
client**, which asks whether they're buying, selling, or both, creates the
matching transactions, and emails an invite. The client sets their own
password, so no password ever passes through the app. Getting that email to
actually work took all of these:

1. **Site URL and redirect allow-list.** Supabase's default Site URL is
   `http://localhost:3000`. Every link names its own origin, but that origin
   still has to be on the project's allow-list, or Supabase quietly falls back
   to localhost.
2. **Custom SMTP.** The built-in email service is rate-limited, meant for
   testing, and sends as "Supabase Auth."
3. **Tokens in the query string, not the fragment.** The invite and reset
   email templates point at `/auth/callback?token_hash=…&type=…`. Corporate
   link scanners strip everything after a `#`.
4. **Test against a throwaway address first.** None of these failures show up
   inside the app, so check every change to the email path on a disposable
   inbox before a real client sees it.
