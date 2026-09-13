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
with nothing left in Supabase Studio.

**The first real client used the dashboard on 2026-09-11.** Getting her
there took three days and three unrelated failures (a redirect pointing
at localhost, SMTP credentials Gmail rejected, and an email template
whose token her employer's mail scanner stripped — see `change_log.md`
days 4–6). Her first session then produced the first real product
finding: she opened all six sections in 37 seconds looking for what was
in them, which is what prompted rebuilding the overview into a
dashboard.

Two things that gating made load-bearing are now partly settled: client
email runs through Resend on Britton's own domain, while Supabase's auth
email still goes through a personal Gmail account. The stage-explainer
copy still has **not** had broker or Fair Housing review, and a real
client is reading it today.

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
  **First real client onboarded 2026-09-10, first actually signed in
  2026-09-11** (Tara Taylor). The gap is not a typo: her invite link
  verified her account and then dead-ended, and it took three fixes
  before she could set a password. Still short of a move-up buyer, which
  is the case the hypothesis actually turns on — with one client, no
  threshold in `strategy.md` can be read yet.
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
