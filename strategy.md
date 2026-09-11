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

---

# The inspection agent

*Second strategic bet, scoped 2026-09-11. Not part of the Discovery-phase
pilot — the pilot tests the dashboard hypothesis above and shouldn't be
destabilized by this. Recorded now because the design decisions below were
argued through properly and would be expensive to re-derive.*

## Hypothesis under test

A client who receives a calm, sourced frame *at the same time* as their raw
inspection report will not spiral — and the agent who provided it will look
more like an advisor than a forwarder.

The wedge is not analysis. Britton can triage a report in ten minutes. The
wedge is that the client currently opens a sixty-page PDF containing
forty-seven flagged "deficiencies" with no frame at all, and the hour of
phone work that follows is the most expensive, least leveraged thing in the
transaction.

Unlike the dashboard hypothesis, this one is explicitly built for many
realtors from the start. Britton is the first tenant and the calibration
source, not the only intended user.

## The constraint that shapes everything: there is no window

The inspector sends the report to the client and the agent **at the same
moment** — the client usually paid for it, so they are the customer of
record. There is no period during which Britton knows something the client
doesn't and can prepare.

This kills the obvious design. A pipeline that ingests, analyzes, drafts,
and then waits for human approval delivers its brief *after* the client has
already read the PDF and panicked — often the next morning, if the report
lands at 6pm on a Friday. It would be a post-mortem sold as prevention.

The resolution is to split the response by how much judgment it requires.
A holding message carries none — "the report is in; most of what you'll see
is routine; I'm reviewing it and will walk you through it tonight" is true
of every inspection ever conducted. It can send automatically, within
seconds of arrival, with no review. It buys the window that the architecture
otherwise cannot produce. Everything substantive follows it and waits for a
human.

**The holding message is the actual intervention.** The brief is the
follow-up. This inverts the intuitive priority order and should survive
contact with implementation pressure.

## The origination rule

The agent is never the source of a fact.

Realtor liability on inspections comes from three places: unauthorized
practice (rendering opinions requiring a license you don't hold), negligent
misrepresentation (stating something as fact that proves wrong and was
relied upon), and failure to disclose. The instinct that "more information
means more liability" is wrong — it points at volume when the real axis is
*origination*. A thorough brief where every claim is attributed is safer
than a short one saying "minor, don't worry about it," because the second
is an unlicensed structural opinion offered in Britton's own voice.

So every client-visible claim carries provenance, and the safe set is
narrow:

- **Inspector-stated**, with citation — safe. He carries that liability and
  insures against it.
- **Base-rate context** ("homes of this age typically show 40–60 findings")
  — safe. Context, not assessment.
- **Specialist-required** ("a licensed roofer should price this") — safe,
  and it is the correct realtor behavior anyway.
- **Britton's own judgment** — allowed, but marked as such, and never
  applied to anything requiring a license.

Originating a cost figure or a severity verdict falls outside all four and
is prohibited. This also defuses the false-positive risk: *"this warrants a
structural engineer's look"* costs the client five hundred dollars and three
days if wrong, where *"the foundation is failing"* costs the deal.

Provenance should be enforced in the schema rather than promised in a
prompt — the same reasoning that revoked the column grant on
`homes_seen.private_notes` instead of trusting app code to respect it.

## Filtering is safe here, and the reason is contingent

An earlier version of this design forbade the agent from ever dropping a
finding, on failure-to-disclose grounds. That was wrong, and the correction
matters enough to record.

Failure to disclose requires that the withholding party be the channel.
Britton is not: the inspector delivers the full report to the client
directly, so disclosure is complete before the agent runs. Filtering cannot
undo it. And a forty-seven-card list is itself the overload the product
exists to prevent — the constraint was working against the primary goal.

What survives is weaker and differently shaped: **reliance on the ranking.**
A brief saying "these four matter" implies the other forty-three don't, and
a misgraded item invites "I relied on you to tell me what mattered." Note
that the discarded never-drop rule did not fix this either — an item buried
at position forty-four under "routine" is as invisible as an omitted one.

Two cheap mitigations, and one caveat:

- Surface the few that matter; collapse the rest behind a single expandable
  line ("43 other routine findings"), not forty-three cards. The client sees
  four things.
- State non-completeness in the brief: *"this isn't the full report — read
  it, and tell me if anything in it concerns you."*
- **The caveat, which is load-bearing:** all of this holds *because* the
  client independently receives the raw report. If Harbour ever becomes
  their primary view of it — a plausible and arguably desirable evolution —
  the analysis inverts and the never-drop rule comes back. Revisit this
  section before making Harbour the inspection's front door.

The collapsed-but-present list is kept for a second reason that is stronger
than the liability one: it is the only way Britton can audit what the agent
de-prioritized without re-reading the PDF. See the measurement plan below.

## Calibration is asymmetric by category

Not one confidence dial. Health/safety and structural findings must never be
under-called; cosmetic and routine-maintenance findings must never be
over-called. The cost of error flips sign depending on the category, so the
agent needs a real taxonomy rather than a tunable caution level.

The stated goal of "100% accuracy" is not achievable and should not be
designed toward — inspectors miss things constantly, which is why they carry
E&O. The achievable goal is an architecture where **being wrong is
survivable**, which is what the origination rule and the collapsed list
together buy.

## Autonomy is a per-tenant setting, not a build stage

Every realtor starts at *show me the reasoning with citations* and graduates
to *show me only the exceptions* on a measured track record. This is
per-tenant state from the first migration, not something retrofitted once
Britton personally gets comfortable — a new realtor arriving in month
eighteen has extended the agent exactly zero trust and must start at the
bottom of the same ladder.

**It is also per-client, which is less obvious.** Relational damage is
time-dependent: the same error is close to fatal in week one and a shrug at
month six, because trust is a buffer that hasn't been accrued yet. A realtor
who has fully graduated the agent still has a client who hasn't. The first
brief for any given client stays above the line regardless of the tenant's
standing.

## What decides the line

The test is reversibility, blast radius, and observability — can the effect
be seen immediately, or does it fail silently?

Two refinements came out of applying it, and both change answers:

**Blast radius includes the effect on a person, not just on data.** A
published brief is a reversible artifact; the client's confidence in their
realtor is not. This matters more here than it would elsewhere, because the
brief's entire job is to be the credible voice at the client's moment of
maximum anxiety. An error there doesn't cost a correction — it costs the
thing the feature exists to produce, and it runs directly into the riskiest
assumption recorded at the top of this document. The client's read of a
visible error is not "the software slipped." It is *"he didn't read this."*

**But the damage concentrates in one kind of error.** Judgment errors — an
item graded "important" that Britton would have called "minor" — read as
human, and correcting one reads as attentive. Coherence errors — wrong
address, wrong client, a finding that isn't in the source report, a number
with no provenance — read as *unattended*, and those are what reveal the
machine. The relational risk lives almost entirely in the second category,
which is mechanically checkable rather than a matter of judgment.

That produces the general principle, which is the most useful thing on this
page:

> **A step doesn't move below the line because the agent earned trust. It
> moves below because a detector was built for its failure mode.**

Graduation is something to build, not something to wait for. An ungated step
sits above the line until its gate exists, however well the agent has been
performing.

## The line, step by step

At full autonomy. A "gate" is a mechanical check that halts or escalates —
never a human review step.

**Intake**

1. **Detect arrival** — *below.* Trivially reversible, tiny radius, and
   Britton received the same email, so a miss is visible anyway.
2. **Match report to client and transaction** — *below, behind a hard gate.*
   The worst outcome in the pipeline: publishing one client's report to
   another's dashboard is a cross-client confidentiality breach that neither
   of them necessarily reports. But it is verification, not judgment —
   require an exact address and name match against the transaction record
   and halt otherwise. A human eyeballing this at 9pm is *less* reliable,
   not more.
3. **Send the holding message** — *below.* No judgment; the text is true of
   every inspection ever conducted. The design depends on it not waiting.

**Analysis**

4. **Extract findings** — *below, behind a reconciliation gate.* A missed
   finding is a silent false negative, so reconcile the extracted count
   against the report's own summary and flag disagreement.
5. **Classify findings** — *below.* Judgment, but pre-publish and
   reversible; the damage from misclassification lands downstream where the
   gates are.
6. **Rank and collapse** — *below.* Silent by nature *except* that the
   collapsed-but-present list makes it auditable. Nothing may be dropped,
   only collapsed — which is what earns this row its place below the line.
7. **Assign provenance** — *below, behind a schema gate.* Silent if wrong
   but mechanically checkable: refuse to publish any untagged claim.

**Drafting**

8. **Draft the client brief** — *below.* Drafting is never the risk;
   publishing is.
9. **Draft the internal brief** — *below.* Britton is the only reader.
10. **Recommend specialists** — *below.* Over-referral costs the client $500
    and three days; under-referral is caught at 12b. The safe direction is
    built into the step.

**Escalation**

11. **Flag anomalies to Britton** — *below.* Flagging generously is free,
    and a human cannot notice what was never surfaced, so a review gate here
    adds nothing.
12. **Escalation splits in two, and the split is the point.**
    - 12a. **Decide how urgently to alert Britton** — *below.* Worst case is
      a needless 8pm ping.
    - 12b. **Tell the client their deal may be at risk** — **above.**
      Irreversible (the objection window closes), deal-sized radius, and the
      failure mode is silent — nobody calls to say you missed it. The only
      unconditionally above-the-line step in the workflow.

**Review and publish**

13. **Package for review** — *below.* Assembly, no decision in it.
14. **Apply Britton's edits** — *below, with a confirmation diff.* A
    silently dropped edit is the bad case.
15. **Publish** — *below, behind a coherence gate; **above** for a client's
    first brief.* The gate checks the machine-legible failures listed above,
    not the judgment calls. The first-brief exception exists because no
    trust buffer has accrued yet.
16. **Notify the client** — *below.* Coupled to 15 and gated with it.

**Learn**

17. **Record Britton's disagreements** — *below, and non-optional.* No risk
    in doing it; the trust ladder is unmeasurable without it. Alarm if it
    ever stops recording.

Worth noticing how small the above-the-line set is: one unconditional step
and one conditional one. That is only defensible because of the gates —
every qualified "below" above is below *because* a specific detector exists.
Build the gate or move the row up.

## Measurement plan

The trust ladder above has no rungs unless disagreement is captured. **Every
edit Britton makes during review is the signal**: a re-graded item, a
reworded recommendation, an item promoted out of the collapsed list. Without
recording these, graduation happens on feeling rather than evidence, and the
central safety claim of the whole design goes unverified.

- Rate of items Britton re-grades during review, by category — the accuracy
  curve, and the graduation criterion.
- Promotions out of the collapsed list — the direct false-negative count,
  and the reason the list stays visible.
- Time from report arrival to client-visible brief; separately, time to the
  auto-sent holding message.
- Whether inspection-week visit frequency departs from the baseline the
  dashboard hypothesis is already collecting.
- Qualitative, at close: did the client mention the inspection as a moment
  of stress or of reassurance?

## Deferred deliberately

**Attributed contractor cost ranges.** *"Miller Roofing quotes $9–12k for a
re-roof of this age in this zip"* is both a genuine moat — locally sourced,
compounding with every deal, not scrapeable — and a liability *reduction*,
since it replaces an originated number with a sourced one. It is deferred
because it is a contractor-relationship project rather than an engineering
one, and building the moat before the product is the classic version of this
mistake.

**The full standalone brief** with sections and cost ranges. The narrative
frame plus graded list is the v1 artifact; the standalone document is the
destination. The architecture should not foreclose it.

## Known gaps, not yet resolved

- Reports arrive in pieces — general, roof, sewer, pest — over several days.
  The current design assumes one PDF and one brief.
- The seller's response round is unmodeled, and client anxiety peaks there
  rather than at the initial report.
- The client-facing brief says nothing about *what happens next*, though a
  good share of inspection panic is process ignorance rather than defect
  severity.
- Where calibration comes from — general model knowledge, rules written down
  once, or learned from Britton's graded history in Harbour — is open.
- Whether the client can ask questions back, and whether the agent answers
  or routes to Britton, is open.

## Security posture

The intake is a dedicated mailbox (`inspections@brittontaylor.com`) that
inspectors send to directly, not a filter or alias on Britton's main inbox.
This is a real boundary rather than a cosmetic one: Gmail API access cannot
be scoped to a label, so an alias would grant the agent read access to the
entire mailbox — including other clients' confidential positions, which
raises fiduciary problems, and regulated financial data, which raises
compliance ones. The separate mailbox is worth its monthly cost for that
reason alone.

Inspection reports are **untrusted input**. Real estate is the most targeted
sector for business-email-compromise fraud, and a PDF arriving from an
outside party can carry text addressed to the agent rather than to the
reader. The agent treats document contents as data and never as
instructions, and never acts on directives found inside a report. The narrow
mailbox reduces this exposure but does not eliminate it — the reports
themselves are the vector.
