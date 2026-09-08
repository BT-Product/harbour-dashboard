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

V1 build (client dashboard, the two agent-facing surfaces, auth, health
check) shipped to production during discovery — see `change_log.md` for
day 1.

## Key stakeholders

- **Britton Taylor** — agent, product owner, sole tenant, and the person
  the pilot cohort's experience runs through day to day.
- **Pilot cohort clients** — 2–3 active clients, prioritizing at least one
  move-up buyer (the primary persona the product is designed around).
  Not yet selected/onboarded as of day 1.
- **Brokerage** — not yet engaged; broker review of the stage-explainer
  copy (and a Fair Housing check on any copy that varies by client
  circumstance) is a pre-launch gate before a real client sees the app.

## Links

- Live app: https://harbour-dashboard-ten.vercel.app
- Repo: this repository (`RE-Transaction-Dash`)
