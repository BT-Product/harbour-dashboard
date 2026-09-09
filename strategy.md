# Harbour — Strategy

## Hypothesis under test

Move-up buyers who have self-serve visibility into *both* of their
transactions and how the timelines relate will visit habitually during the
active window and report feeling more in control, without feeling less
personally attended to.

A pure buyer has one timeline. A pure seller has one timeline. A move-up
buyer has two that must land in the right order — the coordination
problem is the thing no generic status tracker solves, and it's why the
product is built for the move-up case first: pure-buy and pure-sell
clients fall out as a strict subset for free.

## Pre-committed thresholds

- Median 2+ visits per week per client while a transaction is active.
- No client reporting feeling *less* personally attended to at close.
- At least one client, unprompted, referencing the dashboard when
  describing the experience to someone else.

## Riskiest assumption

That self-serve status *increases* felt care rather than substituting for
the human contact that actually earns referrals. Usage alone is a false
positive if the relationship gets thinner — this is the thing to watch
most closely, not just the visit-frequency number.

## Measurement plan

- Login frequency per client, by transaction week — retention curve shape,
  not a raw total.
  - **Instrumented 2026-09-09**, before the first real client. Every
    client dashboard page view is recorded in `client_page_views`
    (Supabase itself keeps only `auth.users.last_sign_in_at`, a single
    overwritten timestamp, so none of this could be reconstructed after
    the fact).
  - **A visit is a run of page views with no gap longer than 30 minutes.**
    The table stores raw views, not visits, so that threshold can be
    re-argued later against data already collected rather than being
    frozen at write time. It's a guess — worth revisiting once there's a
    month of real usage to look at.
  - The agent's own browsing is excluded database-side, so Britton
    checking a client's dashboard can't inflate their numbers.
  - Per-client counts are visible on the agent's client page (last visit,
    visits this week, week before, pages opened). The cohort-level
    median is a manual read for now — there's no analytics view.
- At close: "How would you feel if this dashboard had not been available?"
  (Sean Ellis disappointment framing.)
- One qualitative note per client at close: did it change how they talked
  to Britton, or how often they called.
- For the move-up client specifically: "What did you wish was here that
  wasn't?" — the gaps are the roadmap.
- **Staleness**: median hours between a home tour (`seen_at`) and its
  debrief being written (`debriefed_at`). This measures a second, distinct
  failure mode — if the dashboard goes stale, the finding is about agent
  workflow, not client demand. A client who checks twice and finds nothing
  new stops checking, so a stale dashboard is worse than no dashboard.

## Why the move-up buyer specifically

Design consequence of the hypothesis: build for the hard case (two
coordinated timelines), not the easy ones. The coordination view and the
read-only seller status strip on the buyer dashboard exist because a
move-up client logging into a buy-only view sees half their transaction —
and the missing half is usually the one causing the anxiety. Without that,
this phase would only be testing a generic status tracker, not the actual
differentiator.
