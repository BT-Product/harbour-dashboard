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

## Harbour never withholds, it only frames

Stated 2026-09-12, after the same reasoning decided two unrelated questions
— whether the agent may filter findings, and whether repair costs belong in
the client brief. Both dissolved the same way:

> **The client holds every source document. Nothing is protected by
> omission. The only thing the brief can change is whether they understand
> what they are looking at.**

The inspector sends them the full report; the specialists send them their
own. Withholding a finding or a dollar figure from the brief does not spare
the client anything — it only makes Harbour less useful than the PDFs
already sitting in their inbox, while creating the impression of curation
that would be doing work it isn't.

The corollary is a useful constraint: **"make this less frightening" can
only ever be answered honestly here.** There is no withholding option to be
tempted by, so every available move — context, reframing, sequencing,
attribution — is one that survives the client reading the source. Design
against the version of the client who read everything, because that is the
client.

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

## Where calibration comes from

Settled 2026-09-11. The question turned out to be three questions wearing
one name, and separating them dissolved most of it.

**Severity is read, not derived.** Most inspection reports carry their own
rubric — "Safety Hazard," "Major Concern," "Recommend Repair," "Monitor,"
"Maintenance." That is a licensed professional's own classification, already
in the document. Taking it converts the largest part of calibration from a
judgment problem into an extraction problem, and it is the only treatment
consistent with the origination rule: the agent reads severity rather than
competing with the person qualified to assign it.

**Salience is uniform across clients.** Every client sees the same ranking.
Harbour knows their pre-approval, down payment and HOA load, and it is
tempting to reorder on what they can absorb — a $15k roof means something
different to a client with nothing left after closing. Rejected: a
pre-approval describes what a lender would lend, not what is in their
savings, and `project.md` already flags client-varying copy for Fair Housing
review. The *narrative* may carry personal context; the *order* may not.
This removes the circumstance-varying treatment almost entirely.

**Framing is a base rate, not calibration at all.** "Forty-seven findings is
normal for a house this age" generalizes across realtors and markets, which
is why it is the piece that transfers to a new tenant for free.

What remains as genuine judgment is narrow: which of several equally-graded
items leads, what gets collapsed despite being flagged, and the negotiation
angle — and the last of those is internal-only, so it carries the least
risk.

### Three layers, in order of authority

- **Floor — the inspector's own safety flag.** Anything they designate a
  safety hazard always surfaces, whatever the model ranked it. No category
  list to maintain and no second opinion originated. If an inspector
  soft-pedals a gas issue and the agent passes it through as routine, that
  miss belongs to the licensed, insured party who made it. Declining to
  originate a competing opinion is the whole point of the origination rule.
- **Default ordering — the inspector's grade plus general construction
  knowledge.** Enough to carry v1 with no history at all.
- **Refinement — learned from Britton's review edits**, which the
  measurement plan already captures. Overrides the default as it
  accumulates.

**No written rules for the middle layer.** Tacit expertise does not survive
articulation — a week spent writing thresholds produces rules that get
contradicted on the first real report. Rules are right for the floor
precisely because the floor is not judgment.

### The gate this creates

Defining the floor in terms of the inspector's rubric defines it in terms of
a field that may not exist. Britton's inspectors grade consistently; another
realtor's may not, and no client is obliged to hire a good one. A report
with no parseable rubric would otherwise have **no floor at all**, which is
exactly the catastrophic case.

So: **a report with no usable severity rubric halts and goes above the line
for that deal.** The realtor grades it themselves, that once. Consistent
with the general principle — an ungated step sits above the line until its
gate exists — and it costs nothing in the normal case.

## The same finding appears in several reports, and only one of them prices it

Observed 2026-09-12 from live client work, and it is the highest-value thing
identified so far — not from the design interview but from Britton actually
sitting with a real set of reports and noticing where his time went.

A home inspection flags health and safety action items in red and **gives no
repair costs**. A wood pest or roof inspector often finds the *same
underlying defect* and does give a price, because they are the ones who
would do the work. Matching them means the cost arrives for free, from a
licensed source, without anyone chasing a contractor for a number.

**This overturns an earlier call in this document.** Attributed cost ranges
were filed under *Deferred deliberately* as a v3 business-development
project requiring a contractor network. That was wrong. The prices are
already arriving in the inbox, itemized, signed by professionals who carry
liability for them. It is an extraction problem, not a relationship-building
one, and it belongs in v1.

It is also the safest provenance tier in the taxonomy — *"the pest company
quotes $2,400"* rather than *"this costs $2,400"* — which is exactly the
distinction the origination rule was written to preserve.

And it reframes what was filed as a gap. Multi-report arrival was recorded
as a sequencing nuisance: reports land over several days, so when do you
publish? That is backwards. **The correlation across reports is the
feature.** A lone home inspection is the degraded case.

### Propose, never merge

The error asymmetry is favorable, and the design should lean on it:

- **Failing to match** costs exactly what it costs today — Britton chases
  the price himself. Cheap, visible, status quo.
- **Wrongly merging** two different findings hides one defect underneath
  another's cost. Silent, and it is a false negative.

So the agent proposes matches and never asserts them. Two quoted lines
shown side by side, confirmed with one tap — a second's work, because the
judgment is "same thing or not," not a re-read. Confirmation is also a
calibration signal, the same way review edits are.

**Corroboration is half the value, separately from cost.** A finding that
appears in the home inspection *and* independently in the pest report, with
a licensed price attached, is a far stronger ask than the same item
mentioned once. Independent professionals agreeing is what makes a repair
request stick, so the internal brief should surface the corroboration
explicitly, not just the number it carried in with.

**One caution:** a specialist's figure is often a *bid* from a company that
wants the job, not a neutral market estimate. Legitimate for negotiation and
fully documented, but the framing has to stay attributive — which provenance
already enforces.

### Making a number less frightening without misleading

Five things make a repair figure frightening. All five are honestly
fixable, and none requires softening anything:

1. **No denominator.** "$10,700" against nothing. Against the purchase
   price it is under two percent. Context shrinks a number without changing
   it.
2. **No sense of who pays.** The largest one. A client reads "$10,700 in
   repairs" and hears *a bill I now owe*. It is not — at this stage it is
   what they are **asking the seller to cover**, which is the entire
   function of the objection period. Most first-time buyers do not know
   this. Saying so is not spin; it is what the number is for.
3. **No sense of normal.** Is $10,700 a lot for a 1978 house? They have no
   idea. The same base-rate framing that works on finding counts works on
   dollars.
4. **Undifferentiated urgency.** A termite item due before close reads
   identically to a roof with eight years left. Splitting *now* from
   *eventually* turns one frightening number into one manageable number and
   one future thing — and **that split is already in the documents**: a
   California pest report separates Section 1 (active damage) from Section 2
   (conditions likely to lead to it), assigned by the licensed professional.
   Free structure, nothing originated.
5. **Presented as settled.** "$2,400" sounds like something that must be
   accepted. "The pest company quotes $2,400, and we can get a second bid"
   is equally true and materially less trapping.

The same three findings, unframed and framed:

> Subfloor damage — $2,400. Roof — $6,500. Panel — $1,800. **Total
> $10,700.**

> Three findings came back with licensed repair quotes attached, totaling
> $10,700 — about 1.6% of the purchase price. **That is what we will be
> asking the seller to address or credit, not a bill you are facing.** Two
> need resolving before closing. The roof has years of life left and is on
> the list as leverage, not urgency.

Nothing withheld, nothing softened, no number altered.

**This closes a second gap.** The client brief saying nothing about *what
happens next* was recorded separately, on the grounds that a good share of
inspection panic is process ignorance rather than defect severity.
Reframing the total as an ask rather than a bill **is** the what-happens-next
content. They were the same question.

## A narrative for the realtor's call

Added 2026-09-12, from Britton working a live inspection by hand with a
general-purpose assistant and noticing which part of its output he actually
valued: not a list, but **a story about the house** to tell on the call.

Normally he walks a client through findings one by one. This time the
findings were grouped by root cause into two clusters and a handful of
one-offs. One cluster was moisture beneath a raised foundation, with
fungus damage, wood-destroying insects, earth-to-wood contact and the
ductwork lying on wet soil all flowing from it. The other was an aging roof
that three separate inspectors had independently reached. Fourteen items
that read as fourteen crises became one problem with one fix, plus a roof
decision, plus a short list of safety items.

**What he shared was an illustration, not a template.** The pattern is what
carries over; the section order, time budgets and headings of that one
outline do not need to be followed.

### Why it's worth having

- **It explains the house instead of listing it.** Line-by-line review makes
  the client do the synthesis themselves, and they can't. Grouping by cause
  is the strongest panic reducer found so far — stronger than base rates,
  because "volume is not the signal, pattern is" changes what the client
  thinks the problem *is*.
- **It is the proof-of-competence goal made audible.** The client hears an
  advisor who understands their house, not someone reading a report aloud.
- **It is the lowest-risk output the agent produces.** Everything else it
  writes reaches the client directly. This passes through a licensed human
  who retells it in their own words, with judgment. That filter is the
  strongest safeguard in the whole design, so call prep sits below the line.

This is distinct from matching (step 4b). Matching finds *the same finding*
in two reports. Clustering groups *different findings that share a cause*.

Things the illustration did well that are worth keeping as instincts rather
than rules: it named what is still unknown out loud (disclaimed areas, a
partially viewed attic, a disclosure that did not mention documented
stains, an unverified addition), and presented that as where trust gets
built. It flagged repair dependencies — fumigation crews walk the roof, so
sequence the work or pay for it twice. It pre-briefed the likely next
surprise before the bid that would deliver it. It stated every option
plainly without steering, and held the recommendation until bids were in.
And it named the bids still pending, which is most of the answer to the
publication-timing gap: later numbers arrive as confirmations, not
revisions.

### The risk narrative introduces

A cluster is a causal claim, which is where origination can slip back in.
And a compelling story is exactly how a misfiled finding disappears — a
termite problem with an unrelated source, absorbed into "moisture under the
house," vanishes inside a good narrative. It is the step-4b asymmetry again:

- Every causal link carries provenance. A link no inspector stated is marked
  as inference.
- The agent proposes cluster membership; it does not assert it.
- A finding that doesn't fit stays a one-off rather than being forced in.

### Legal watch list

Not legal advice — these were identified in design and are to be confirmed
by Britton's broker and a real estate attorney. None of them blocks the
idea; all are addressable by extending the origination rule from the
written brief to **the spoken narrative.**

1. **Stating causes outside the realtor's license.** "Moisture caused the
   subfloor damage" is a structural and pest opinion. Relayed from an
   inspector, it is theirs; inferred by the narrative, it becomes the
   realtor's. Provenance has to survive into the words said aloud — "the
   inspectors tie these together," not "the cause is."
2. **Framing that minimizes.** "Pattern, not volume" is fine. Implying that
   findings outside a cluster don't matter, or that fixing a root cause
   resolves everything downstream, gives a client who relied on a tidy story
   a misrepresentation argument. Predictions must be an inspector's.
3. **Advice outside the realtor's role.** Negotiation strategy is the job.
   Construction recommendations stay attributed to whoever made them. The
   legal consequences of exiting under a contingency belong to an attorney.
4. **Discouraging further investigation.** Where an inspector disclaimed an
   area, the narrative always recommends follow-up. Smoothing over a
   disclaimed area is a well-known source of agent liability.
5. **Seller disclosure discrepancies.** Flagging a gap between the
   disclosure and the evidence is duty-aligned. Implying concealment is a
   separate claim. "We're asking" is the phrasing.
6. **The realtor owns what they say.** A repeated wrong narrative is the
   realtor's error; "the software said so" is not a defense. Call prep saved
   in Harbour is also a written record that may be discoverable, which
   argues for provenance on every causal link and for considering whether
   call prep is kept as working notes rather than a permanent record.

### Precondition

**Broker and real estate attorney review of the narrative's framing rules
before this is built.** Same shape as the existing gate on the
stage-explainer copy, and reviewed once as rules rather than per deal.

## The client cannot ask the agent questions

Decided 2026-09-11, and not a v1 scoping call — a permanent property of the
product. There is no chat surface, no question box, no "ask about this item."

Three reasons, in ascending order of how much they matter:

The origination rule could not survive it. *"Is this foundation crack
serious?"* has no safe answer — anything useful is an unlicensed opinion and
anything safe is useless. A free-text surface cannot be held inside the
provenance taxonomy the rest of the design depends on.

The realtor calls the client to walk through the report anyway. Questions
have a natural home, staffed by a licensed human who knows the deal. The
brief's job is to make that call shorter and better, not to pre-empt it.

And most importantly, it would contradict the hypothesis this whole product
is being tested against. The riskiest assumption recorded at the top of this
document is that self-serve visibility *increases* felt care rather than
substituting for the human contact that actually earns referrals. A
dashboard that answers questions is the purest form of that substitution,
arriving at the moment in the transaction when the call matters most. Had
this gone the other way it would have quietly falsified the thing the pilot
is measuring.

**What this does not foreclose is capture without answer** — see the flag
control under *Deferred deliberately*. Letting a client mark an item as
worrying is a different act from answering them, and it does not weaken any
of the three reasons above.

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
4b. **Correlate findings across reports** — *proposing is below the line;
   merging is above.* Matching a home inspection's uncosted action item to
   the pest or roof report that prices it is where the realtor's time
   currently goes. Failing to match costs only what it costs today;
   wrongly merging hides one defect under another's cost, silently. So the
   agent proposes and the realtor confirms with one tap — and the
   confirmations are a calibration signal.
5. **Classify findings** — *below, behind a rubric gate.* Severity is read
   from the inspector's own grading rather than derived, so this is mostly
   extraction; remaining judgment is pre-publish and reversible. But a
   report arriving with no parseable rubric has no floor, so that case
   halts and goes above the line for that deal.
6. **Rank and collapse** — *below.* Silent by nature *except* that the
   collapsed-but-present list makes it auditable. Nothing may be dropped,
   only collapsed — which is what earns this row its place below the line.
7. **Assign provenance** — *below, behind a schema gate.* Silent if wrong
   but mechanically checkable: refuse to publish any untagged claim.

**Drafting**

8. **Draft the client brief** — *below.* Drafting is never the risk;
   publishing is.
9. **Draft the internal brief and call narrative** — *below.* Only the
   realtor reads them, and reading the narrative before the call is its
   review. Cluster membership is proposed with provenance on each causal
   link; see "A narrative for the realtor's call."
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

**A contractor network for independent cost ranges** — *substantially
narrowed on 2026-09-12.* This entry originally deferred all attributed cost
data as a v3 relationship-building project. That was wrong for the common
case: the specialists' own reports already carry itemized prices, so the
usual cost question is answered by extraction rather than by recruiting
anyone. See "The same finding appears in several reports" above; that part
is v1.

What remains genuinely deferred is narrower: independent second opinions,
and market ranges for defects *no* report priced. Still a relationship
project, still not worth building before the product — but it is now an
enhancement at the edges rather than the only route to cost data.

**The full standalone brief** with sections and cost ranges. The narrative
frame plus graded list is the v1 artifact; the standalone document is the
destination. The architecture should not foreclose it.

**A "flag this for our call" control on each item — wanted, not merely
shelved.** Revisit trigger: when the client-facing brief UI is designed.
Britton liked this on first hearing (2026-09-11) and it should not be lost
in the gap between design and build.

It answers nothing and originates nothing, so it sits outside the decision
above. The client reads the brief at 9pm; the call is at noon tomorrow.
Today their questions go one of two places — into the anxiety this feature
exists to prevent, or into a 9pm text that is the interruption it exists to
reduce. A flag gives them a third.

Three things it buys, the last being the real argument:

- The client feels registered immediately. Anxiety relief does not require
  an answer; being heard is most of it.
- Britton enters the call already knowing the four items they are worried
  about. That is less preparation, not more.
- **It is a calibration signal available no other way.** Britton's review
  edits measure whether the agent graded items *correctly*. Client flags
  measure whether it graded them the way a frightened non-expert
  experiences them — and that second model is the actual product. If
  clients keep flagging items graded "minor," the ranking is wrong about
  fear even when it is right about severity.

One edge case to handle at build time: a genuinely urgent flag sitting
unseen until noon. Route the flag to Britton as a notification on arrival,
which is already a below-the-line step in the workflow.

## Known gaps, not yet resolved

- **Publication timing across a multi-report deal.** The correlation itself
  is now a designed feature rather than a gap, but the sequencing question
  survives it and is sharper for it: if the pest report is what prices the
  home inspection's finding, publishing a brief before it lands means
  publishing a version that is about to change. Republishing a brief a
  client has already read is its own kind of alarming. Unresolved.
- The seller's response round is unmodeled, and client anxiety peaks there
  rather than at the initial report.
- **Precondition, not a gap:** broker and real estate attorney review of the
  call narrative's framing rules before it is built. See the legal watch
  list under "A narrative for the realtor's call."
*Resolved 2026-09-11: whether the client can ask the agent questions. No —
see "The client cannot ask the agent questions" above. And where calibration
comes from — see "Where calibration comes from" above.*

*Resolved 2026-09-12: the brief saying nothing about what happens next. It
turned out to be the same question as how to frame repair costs — telling
the client the total is an ask rather than a bill is itself the
what-happens-next content. See "Making a number less frightening without
misleading" above.*

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
