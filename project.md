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

**Discovery** — validating the core hypothesis (see `strategy.md`) with a
small pilot cohort before any decision on broader rollout or the B2B2C
path. Pre-committed success thresholds are set; nothing about "launch" is
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

## Key stakeholders

- **Britton Taylor** — agent, product owner, sole tenant, and the person
  the pilot cohort's experience runs through day to day.
- **Pilot cohort clients** — 2–3 active clients, prioritizing at least one
  move-up buyer (the primary persona the product is designed around).
  Britton plans to invite the first real clients on 2026-09-09; as of
  2026-09-08 the only accounts are the seeded demo cohort.
- **Brokerage** — not yet engaged; broker review of the stage-explainer
  copy (and a Fair Housing check on any copy that varies by client
  circumstance) is a pre-launch gate before a real client sees the app.

## Links

- Live app: https://harbour-dashboard-ten.vercel.app
- Repo: this repository (`RE-Transaction-Dash`)
