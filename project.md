# Harbour — Project Overview

## What it is

Harbour is a password-authenticated, client-facing dashboard that makes a
real estate transaction feel processed instead of hectic. Clients log in
and see their transaction's current stage, what happens next in plain
language, home tour history with agent notes, and — for move-up buyers
carrying two transactions — how their sale and purchase timelines relate
to each other and where the coordination risk sits.

Built multi-tenant from day one (a single `agents` tenant today, Britton),
with the eventual play being B2B2C SaaS: other agents as paying customers,
their clients as end users. Waypoint (lead generation) is a separate
product — no shared branding, data, or logic with Harbour.

## Current phase

**Discovery, now with a live client.** Validating the core hypothesis
(see `strategy.md`) with a small pilot cohort before any decision on
broader rollout or the B2B2C path. Pre-committed success thresholds are set; nothing about "launch" is
implied until those are read out.

V1 shipped to production during discovery and has kept moving: client
dashboard, auth, health check, and an agent surface that grew past the
spec's original two screens into a client-centric management view. Works
on a phone as of day 2. See `change_log.md`.

As of 2026-09-08 the agent can run a client's whole lifecycle from the
app — invite them, create and edit their transactions, keep tours,
debriefs, inspections and pre-approvals current, and remove them —
with nothing left in Supabase Studio. **Real pilot clients are planned
to be invited on 2026-09-09**, which makes two things load-bearing that
weren't before: custom SMTP in Supabase (the built-in email service
won't reliably deliver invites), and the stage-explainer copy, which
hasn't had broker or Fair Housing review and will be read by a real
client the moment they log in.

**A second bet is scoped but not started.** As of 2026-09-11 there is a
full design for an inspection agent — ingesting inspection reports and
producing a client-facing brief — in `strategy.md`. It is explicitly *not*
part of Discovery: the pilot tests the dashboard hypothesis, and starting
a second workstream before those thresholds are read out would muddy both.
It is written down now because the design was argued through properly and
would be expensive to re-derive. Unlike the dashboard, it is aimed at many
realtors from the start rather than at Britton alone.

## Key stakeholders

- **Britton Taylor** — agent, product owner, sole tenant, and the person
  the pilot cohort's experience runs through day to day.
- **Pilot cohort clients** — 2–3 active clients, prioritizing at least one
  move-up buyer (the primary persona the product is designed around).
  **First real client onboarded 2026-09-10** (Tara Taylor — invited,
  password set, signed in the same morning). Still short of a move-up
  buyer, which is the case the hypothesis actually turns on.
- **Brokerage** — not yet engaged; broker review of the stage-explainer
  copy (and a Fair Housing check on any copy that varies by client
  circumstance) is a pre-launch gate before a real client sees the app.
- **Broker and real estate attorney** — review of the inspection agent's
  call-narrative framing rules is a precondition before that feature is
  built (added 2026-09-12). Britton to arrange. The questions to bring are
  the legal watch list in `strategy.md`.

## Links

- Live app: https://harbour-dashboard-ten.vercel.app
- Repo: this repository (`RE-Transaction-Dash`)
