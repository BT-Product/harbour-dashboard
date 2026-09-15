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
  - **First real data 2026-09-11**: one client, two visits in one
    evening. Nothing about the threshold can be read from that, and it
    shouldn't be — a cohort of one produces a median of one client's
    habits. The instrument works; the sample doesn't exist yet.

**What the instrument produced first was not the metric.** Its first
useful output was a usability finding: the visit trace showed the client
opening all six sections in 37 seconds, three to eight seconds each, then
returning to where they started. That is the signature of someone hunting
for what a menu contains, and it prompted rebuilding the overview (day
6). Worth noting for its own sake — per-page visit data turns out to earn
its keep as behavioural evidence long before there are enough clients for
the retention curve it was built for. It also means the honest read on
early visit counts is ambiguous: a client clicking everywhere may be
engaged, or may be lost, and only the path distinguishes them.
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

## Bringing clients back during the home search

*Added 2026-09-15. Scoped to house hunting; escrow has its own reasons to
return.*

The pilot client was asked what would bring them back, and pointed at Zillow:
its emails about new homes are what send them back to the site, and an update
like "your favourite home dropped its price" would do the same here. The
evidence behind the question: that client opened the dashboard on one day,
2026-09-11, and not after the tour that followed two days later — nothing
told them anything new was there.

Three principles decide which mechanisms are worth building:

- **The 2+ visits a week threshold is a proxy, not the goal.** The riskiest
  assumption is that self-serve status *adds* to felt care rather than
  replacing contact with Britton. Notifications can raise visits while the
  relationship thins — a pass on the metric and a fail on the hypothesis. So
  every mechanism here routes the client back through the agent's judgment,
  not just back to a screen.
- **Don't out-Zillow Zillow.** Zillow owns the listing data and already emails
  this client. A second stream of similar alerts duplicates what they get and
  trains them to ignore Harbour's emails. What Zillow cannot send is the
  agent's read on *this* client's search.
- **Every email must point at something genuinely new.** The measurement plan
  already says it: a client who checks twice and finds nothing new stops
  checking. The email states its fact plainly — "Harbour never withholds"
  applies — and the dashboard holds what an email can't: the client's own
  notes, the comparison to their pre-approval, the agent's take.

A home search alternates **tour weeks** and **quiet weeks**, and quiet weeks
are where checking stops. The plan covers both:

| Week | Return 1 | Return 2 |
|---|---|---|
| Tour week | Evening-before reminder (built) | Tour recap |
| Quiet week | The agent's weekly picks | A change to a home they liked |

### 1. The tour recap — building first

When the agent has written up every home from a tour day, the client gets an
email: those homes, the agent's read on each, and a question — "Which one
stayed with you?" — answered by replying to the agent. Built first because
everything it needs exists (tours, debriefs, the reminder infrastructure, and
past tours moving into Homes Seen), and because it closes the exact gap in the
evidence above.

The agent sends it, prompted, rather than it firing on its own: a recap sent
the moment the last debrief saves would go out before the agent had reread
their notes. Once a day's homes are all written up, the client's Homes Seen tab
offers the send. That also makes debrief speed visible — the staleness metric
this plan leans on.

### 2. Changes to a home they've already seen

Price drops, back on market, gone pending — only for homes in the client's
Homes Seen marked Strong or Maybe, never all listings. What makes it more than
a Zillow alert is context only Harbour has: "now $15,000 under your
pre-approval, and still under it with the $220 HOA", beside the client's notes
from the tour. First version is agent-triggered — Britton already sees these in
MLS alerts, so one tap sends it with no data feed or licensing. An automatic
MLS/IDX feed is a later step governed by MLS and brokerage rules. The HOA
figure is the existing estimate, which only ever qualifies the lender's number
downward.

### 3. The agent's weekly picks

Two or three new listings on a set day each week, each with one line on why the
agent thinks it fits, and "Tour it" / "Pass" on the dashboard — the first way a
client answers back inside Harbour. Its cost is agent time, so it stays small or
it becomes the chore that lapses. The "why it fits" line is agent judgment,
marked as such, and needs the same Fair Housing care as debrief notes.

### Constraints on all three

- **License disclosure on every client-facing surface.** Britton's California
  DRE number must appear on marketing and client-facing material, emails and
  the dashboard included, and the same will hold for every future agent. A
  client email is not sent without the sending agent's license number.
- **Picks are marketing email**, which brings an unsubscribe link and a
  physical address, and possibly MLS rules on sending listing information.
  Brokerage brand standards apply to all three.
- **Measurement needs attribution.** Page views record where a client went, not
  what brought them. Links in these emails should be tagged so returns can be
  credited to the mechanism that caused them — otherwise there's no telling
  which of the three works.

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

**Status, 2026-09-14:** the broker half is on the agenda for Britton's
meeting with the managing broker on 2026-09-15, using a review page linked
from `project.md`. The attorney half is not yet arranged.

**Status, 2026-09-15:** the attorney half is an email to Britton's real
estate attorney, drafted to go out on 2026-09-15 (not yet confirmed sent). It
asks ten questions, leaving brokerage policy, supervision and E&O to the
broker:

- *The client summary:* whether ranking and collapsing findings invites a
  misrepresentation or failure-to-disclose claim when the client also holds
  the reports; whether attributing a cause to the inspectors keeps grouping
  findings by cause inside the realtor's license; the "an ask, not a bill"
  cost framing and quoting contractor bids; and liability for the three
  messages that reach a client without review.
- *The negotiation:* whether talking a seller's response through before its
  record reaches the dashboard conflicts with a duty to deliver it
  promptly; what may be said about cancelling under the contingency and when
  to refer out; phrasing a seller disclosure discrepancy without implying
  concealment; and whether reporting "3 of 5 agreed repairs confirmed"
  creates a duty for the repairs themselves.
- *Records and data:* discoverability and retention of AI drafts, call
  notes, critic findings and review edits; and whether California law
  requires client consent, or disclosure that AI is involved, when documents
  pass through an email-forwarding service and an AI provider.

Four of the ten are the attorney questions from the broker review page. The
other six came from reading the design for legal exposure rather than
brokerage policy, and one of them is a gap the design never checked: the
seller's response round deliberately holds the written record until after
the realtor's call, which is only sound if no duty requires the response to
be delivered sooner.

The email carries no link to the review page. That page addresses its
questions to the broker, and like the dashboard packet it cannot save
answers for a reader outside Britton's organization; a reply in the email
thread avoids both. If the attorney wants background, the plan is a short PDF
written for them rather than the broker's page.

Preparing that page widened the review beyond this watch list. Six questions
belong to the brokerage rather than to law, and none of them were on the
list:

- whether the brokerage has an AI-use policy the design must fit
- how the broker's duty to supervise applies to client messages an AI drafts
  under the realtor's name — in particular the three things that reach the
  client without review: the holding message, a licensed quote added to a
  finding the client has seen, and negotiation status
- whether clients must be told an AI helps prepare their brief
- whether errors-and-omissions coverage extends to AI-assisted communication
- whether AI drafts, call prep and critic findings are transaction records
  the brokerage must keep
- whether confidential transaction documents may pass through the outside
  inbound email service

The watch list itself was split by who can answer it. Items 4 (discouraging
further investigation) and 5 (seller disclosure discrepancies) are practice
standards, so they went to the broker. Items 1 (stating causes), 2 (framing
that minimizes), 3 (advice about cancelling) and 6 (discoverability) went on
the page as questions expected to need an attorney, with room for the broker
to answer or redirect them.

## Publication timing: two waves, two publication points

Settled 2026-09-12. The worry was that reports arrive over several days, so
a brief published early is a version about to change, and republishing to a
client who already read it is its own kind of alarming.

**The reframe: updating a brief is not what alarms a client. Changing it
without warning is.** A brief that says up front "the roof and pest reports
are still coming, expected Thursday" makes the update something the client
was told to expect. So the design question was never "publish once or many
times." It was what may change between publications, and how the change is
announced.

### How reports actually arrive

In two waves. **Wave 1** is the inspection reports (home, pest, roof),
landing within a day or two of each other. **Wave 2** is contractor bids
(HVAC, electrical, plumbing) ordered *because* of what wave 1 found, arriving
over the following days.

The waves line up with the two calls the call-narrative illustration already
implied: an orientation call once the inspections are in, and a
recommendation once the bids are. That gives two publication points instead
of a stream of updates:

- **After wave 1:** the client brief and the orientation call prep.
  Waiting for wave 2 would leave the client alone with the raw reports for
  days, which is the exact failure this feature exists to prevent.
- **After wave 2:** the negotiation brief and the realtor's recommendation.

**Within wave 1**, a holding message goes out as each report lands and names
what is still coming ("the roof report is in, the pest report is still on its
way, I'll put it together when both are here"). No partial brief.

### Knowing what is still expected

Harbour cannot tell when a wave is complete, or name what is pending, unless
it knows what was ordered.

- **Wave 1 is entered by the realtor**, who scheduled those inspections
  anyway.
- **Wave 2 is proposed by the agent** from the reports' own "recommend
  evaluation by a licensed…" lines, and the realtor confirms.

A side effect worth more than the convenience: every recommended follow-up
becomes a tracked pending item, so none can quietly fall off. That is legal
watch item 4 (never discourage further investigation) enforced structurally
rather than by care.

**Bid intake** uses the same `inspections@` mailbox. The realtor orders the
bids and can tell contractors where to send them.

### Between the waves: additions and revisions

A wave-2 bid does one of two things, and they are treated differently:

- **An addition** puts a price on a finding the client has already seen. It
  updates the brief, behind the coherence gate. Calm, provided it was
  announced as pending.
- **A revision** changes the story — the HVAC contractor recommends a whole
  new system rather than duct replacement. It goes to the realtor first, so
  the client hears it from a person before reading it. This is the
  relational blast-radius point: a surprise revision read alone at 9pm does
  real damage.

The wave-1 brief should **pre-brief likely revisions** where the reports
point to them ("the furnace is near the end of its life, so the HVAC bid may
recommend replacing the system"). Warned in advance, a revision arrives as a
confirmation.

**The client is not notified bid by bid.** The brief shows every item as
pending or priced, with new items marked, and one notification goes out when
wave 2 is complete. A drip of emails would recreate the anxiety one bid at a
time.

### When the deadline won't wait

Britton's practice when bids won't all arrive before the inspection
objection deadline: **ask the seller for an extension, and prepare a fallback
ask built on what is already quoted** in case it is refused.

- The agent watches pending items from **both waves** against the objection
  deadline, which Harbour already stores as a key date, and alerts the
  realtor when they won't arrive with enough margin. The margin is a
  per-tenant setting. (Originally wave 2 only; widened when triggers were
  settled, since a stalled wave 1 near the deadline is the worse case.)
- The agent drafts the extension request, and in parallel prepares the
  fallback negotiation brief, with every unpriced item named plainly rather
  than estimated.
- **Sending the extension request is above the line.** It goes to the other
  side of the deal.

Under the reversibility, blast-radius and observability test, a missed
objection deadline is irreversible, deal-sized, and silent until it is too
late. **The deadline watch is therefore the gate that makes the rest of this
section safe to automate**, and it is non-optional in the same way that
recording review edits is.

## Triggers

Settled 2026-09-12. The design had named most of the events that should
start work without deciding how they are detected, and it had places where
nothing would start at all. Silent non-starts are the dangerous kind: nothing
errors, the flow just never happens, and a client sits alone with a report.

### What starts a deal's inspection flow

**Entering the wave 1 list is the normal start**, with each inspection's
scheduled date. The realtor is scheduling those inspections anyway, and it
happens before any report can arrive, so the first holding message can name
what is still coming.

**A report arriving is the safety net.** If a report matches an in-contract
transaction and no list exists, the flow starts anyway: a generic holding
message goes out and the realtor is prompted for the list. Wave 1 cannot be
judged complete without the list, so publishing waits until it is entered.

**Moving a transaction to the Inspection stage prompts the realtor for the
list.** A nudge, not a trigger, because stage changes are manual and only as
reliable as the realtor's updates.

### A wave that never completes

If one listed inspector never sends a report, wave 1 never completes and
nothing publishes. So: **when a listed report is a set window past its
inspection date (default 48 hours, per-tenant), the realtor is alerted.**
They chase the inspector or press **publish now**, and the brief goes out
naming the missing report as still to come. The agent never publishes a
partial set on its own, because only the realtor can judge whether the
missing report is likely to change the story.

The deadline watch covers **both** waves, not only wave 2's bids. A stalled
wave 1 close to the objection deadline is the worse case.

### Derived from existing rules

- **A report that matches no client** halts and alerts the realtor
  immediately, with the report and the likeliest matches. The agent proposes;
  the realtor assigns, above the line, because a wrong match is the
  cross-client breach. No holding message goes out until then — a delayed
  holding message is a far smaller harm than one sent to the wrong client.
- **The expected list stays editable.** Besides publish now, the realtor can
  remove a cancelled inspection; otherwise a cancelled roof inspection would
  hold wave 1 open forever. A realtor-triggered publish still passes the
  coherence gate, which is a mechanical check, not a review.
- **A late or unlisted report** is proposed as an addition to the expected
  list and confirmed by the realtor. If its wave has already published, it is
  handled like a bid: an added price updates the brief, a changed story goes
  to the realtor first.

### How mail gets in: push, not polling

The holding message is meant to go out within seconds, so receiving has to be
push. **Inspectors send to `inspections@brittontaylor.com`, which
automatically forwards each message to an inbound email service, which posts
it — attachments included — to Harbour.** No timer checks a mailbox, and
Harbour holds no mailbox access at all.

Push trades a visible cost for a silent failure. If the forwarding rule is
switched off, the inbound service changes, or Harbour's receiving endpoint
breaks, reports stop arriving and nothing errors. So the email needs no
heartbeat, but **the pipeline does:**

- **A daily test email through the real path.** Harbour sends a test message
  to `inspections@` and expects it back at its receiving endpoint, alerting
  the realtor if it doesn't arrive. The same pattern as `/api/health`, which
  proves a real round trip rather than reporting "up."
- **The stall alert is a second backstop, but only mid-deal.** It would not
  catch a broken pipeline between deals, or the first report of a deal that
  started without a list. The daily test covers those.
- **Receiving is idempotent.** Inbound services retry failed deliveries, so
  each message is stored by its ID before processing, and a retry cannot send
  a second holding message. The same claim-before-act rule as tour reminders.

### The full set

| Trigger | What starts |
|---|---|
| Realtor enters the wave 1 list, with dates | The deal's inspection flow |
| Report arrives for an in-contract client, no list | The flow anyway; generic holding message; prompt for the list |
| Transaction moves to the Inspection stage | Prompt for the list |
| Report arrives, matched | Holding message, extraction, wave 2 proposals |
| Report arrives, unmatched | Halt; immediate alert; proposed matches; realtor assigns |
| Every listed wave 1 report received | Client brief and call prep publish |
| Listed report past its window (48h default) | Alert; realtor chases it or presses publish now |
| Bid or late report arrives | Added price updates the brief; changed story goes to the realtor |
| Every confirmed wave 2 bid received | Negotiation brief; one client notification |
| Nightly | Deadline watch across both waves |
| Daily | Pipeline test email; alert if it doesn't come back |

## The seller's response round

Settled 2026-09-14. The round differs from everything before it in one way:
**the other side is now a participant.** The inputs were documents from
inspectors and contractors; now the input is the seller's decision, through
the listing agent, and every output is a move in a negotiation. It is also
where client anxiety peaks — a refusal feels like conflict, it arrives with a
deadline, and the client's question changes from "what's wrong with the
house" to "am I going to lose it."

### A loop, not a fixed number of rounds

How the round goes varies by market: in a hot market sellers refuse and
buyers take it, in a slow one sellers give a lot. So the design assumes no
round count. It is a loop — request, response, client decision, possibly a
counter that restarts it. **The market shapes the realtor's advice, which
stays their judgment; it does not change the mechanics.**

The seller's response reaches the realtor, not the client. The realtor
forwards it to `inspections@`, the same pipeline, so Harbour still never
reads the realtor's main inbox.

### Every response

- **Reconciled item by item against the current ask.** Each item comes back
  agreed, credit offered, refused, countered, or **not addressed**. Every
  item in the ask must receive a status; a response that quietly skips an
  item is caught by the same kind of gate as extraction's count
  reconciliation.
- **Goes to the realtor first**, because it changes the story.
- **A refused or unaddressed health or safety item is flagged as a possible
  deal-at-risk** (step 12b). The realtor decides whether it is.
- **Prepares the decision call:** what was asked, what the seller answered
  item by item, the dollar gap, what was left unaddressed, and the client's
  options with their deadlines. Unlike the orientation call, **this is the
  call where the realtor recommends.** Legal watch item 3 still applies: the
  deposit consequences of cancelling belong to an attorney.
- **Counters are drafted by the agent and sent by the realtor.** Sending goes
  to the other side of the deal, so it is above the line, like the extension
  request.
- **Each round's deadlines** — the seller's response window, the client's
  reply window — go on the deadline watch.

### What the client sees

- **During the round: status and deadlines only.** "Request sent Tuesday;
  the seller has until Friday to respond." Silence during a seller's window
  is where the anxiety lives, so the waiting is made visible.
- **After the realtor has talked it through: the record.** An item-by-item
  account of what was asked, what was agreed, and what is still open. The
  realtor publishes it after the call, which puts that publish above the
  line, as with any revision to a brief the client has read.

**A note on "Harbour never withholds."** That principle rests on the client
already holding every source document. It holds for inspection reports; it
does not hold here, because the seller's response goes to the realtor. The
realtor telling the client first is *sequencing*, not withholding — the
record always follows — but the premise changes in this round, and anything
built on the principle should account for it.

### Through close: verifying what was agreed

The negotiation ends in something like "the seller repairs three items and
credits $4,000." That agreement then has to actually happen before closing.
A repair that was never done, or a credit missing from the closing
statement, cannot be fixed after close and is silent until the final
walkthrough or the signing table. Under the reversibility, blast-radius and
observability test, that is exactly what needs a detector.

- **Each agreed item becomes something to verify.** Repair receipts and the
  closing statement come in through the same forwarding path.
- **The agent proposes which receipt covers which agreed repair; the realtor
  confirms.** Propose, never merge. A receipt that doesn't show a licensed
  contractor is flagged, not judged.
- **Credits are checked against the closing statement.** A missing or
  different amount alerts the realtor.
- **Anything unverified as closing approaches alerts the realtor.**
  Non-optional, in the same way as the deadline watch.
- **The client sees progress** — "3 of 5 agreed repairs confirmed done." A
  confirmation is an addition and updates on its own; a repair that won't
  happen is a revision and goes to the realtor first.

This connects to something the schema already has: `inspection_items.resolved`.

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
to *show me only the exceptions* on a measured track record. An exception is
a critic finding, a gate trip or a category rule — never the drafting agent's
own confidence (see "The critic"). This is
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

0. **Prove the pipeline works** — *below, and non-optional.* A daily test
   email through the real forwarding path, alerting if it doesn't arrive.
   Push delivery fails silently, so this is what makes step 1 trustworthy.
0b. **Drop mail that would loop** — *below, and non-optional.* Automatic
   replies, Harbour's own outbound messages and pipeline test emails are
   dropped on receipt, and a per-sender and per-client daily cap halts intake
   and alerts. See "Stop conditions."
1. **Detect arrival** — *below.* Trivially reversible and tiny radius. A miss
   is made visible by the pipeline test (step 0) and, mid-deal, the stall
   alert — not by assuming the realtor also received the email.
2. **Match report to client and transaction** — *below, behind a hard gate.*
   The worst outcome in the pipeline: publishing one client's report to
   another's dashboard is a cross-client confidentiality breach that neither
   of them necessarily reports. But it is verification, not judgment —
   require an exact address and name match against the transaction record
   and halt otherwise. A human eyeballing this at 9pm is *less* reliable,
   not more. On a halt, the realtor is alerted immediately with proposed
   matches, and assigning the report is above the line.
3. **Send the holding message** — *below.* No judgment; the text is true of
   every inspection ever conducted. The design depends on it not waiting.
   Sent per report during wave 1, naming what is still coming.
3b. **Track what is still expected** — *wave 1 entered by the realtor; wave 2
   proposed below the line, confirmed by the realtor.* The list is what makes
   "wave complete" and "pending" checkable, so it is the gate for publishing
   and notifying, and it keeps every recommended follow-up from quietly
   falling off. See "Publication timing."

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
10b. **Critic review** — *below, as a gate run by a separate subagent.* Every
    judgment-bearing draft is checked against the source documents by an
    agent that did not write it. It blocks anything bound for the client or
    the other side of the deal and annotates realtor-only artifacts. At most
    two revision rounds, then halt to the realtor. See "The critic."

**Escalation**

11. **Flag anomalies to Britton** — *below.* Flagging generously is free,
    and a human cannot notice what was never surfaced, so a review gate here
    adds nothing.
12. **Escalation splits in two, and the split is the point.**
    - 12a. **Decide how urgently to alert Britton** — *below.* Worst case is
      a needless 8pm ping.
    - 12b. **Tell the client their deal may be at risk** — **above.**
      Irreversible (the objection window closes), deal-sized radius, and the
      failure mode is silent — nobody calls to say you missed it.
    - 12c. **Watch pending items against the objection deadline** — *below,
      and non-optional.* Covers both waves. Alerts the realtor when reports
      or bids won't arrive with enough margin. A missed deadline is irreversible and silent, so this
      watch is the gate that lets the rest of the timing design run
      unattended.
    - 12d. **Draft the extension request and the fallback ask** — *below.*
      Drafting, and the fallback names unpriced items rather than estimating
      them.
    - 12e. **Send the extension request** — **above.** It goes to the other
      side of the deal.

**Review and publish**

13. **Package for review** — *below.* Assembly, no decision in it.
14. **Apply Britton's edits** — *below, with a confirmation diff.* A
    silently dropped edit is the bad case.
15. **Publish** — *below, behind a coherence gate; **above** for a client's
    first brief, and for a revision.* Publication happens at two points:
    after wave 1 and after wave 2. The gate checks the machine-legible
    failures listed above, not the judgment calls. The first-brief exception
    exists because no trust buffer has accrued yet. A bid that adds a price
    updates the brief; a bid that changes the story goes to the realtor
    first, so the client hears it from a person.
16. **Notify the client** — *below.* Coupled to 15 and gated with it. Once
    per completed wave, never once per bid.

**Negotiation** (repeats for each round)

17. **Reconcile the seller's response against the ask** — *below, behind a
    completeness gate.* Every item in the ask must receive a status; an
    unaddressed item is flagged rather than passed over.
18. **Flag a possible deal-at-risk** — *below.* A refused or unaddressed
    health or safety item alerts the realtor. Telling the client remains
    12b, above.
19. **Prepare the decision call** — *below.* Realtor-only, and read before
    the call.
20. **Draft a counter** — *below.* Drafting is never the risk.
21. **Send a counter** — **above.** It goes to the other side of the deal.
22. **Show round status to the client** — *below.* Dates and deadlines
    only, which are additions.
23. **Publish the round's record** — **above.** Published by the realtor
    after the call; a revision to what the client has read.

**Through close**

24. **Match receipts to agreed repairs** — *proposing is below the line;
    confirming is above.* Same asymmetry as 4b. A receipt without a licensed
    contractor is flagged.
25. **Check credits against the closing statement** — *below, behind a
    gate.* A missing or different amount alerts the realtor.
26. **Watch unverified agreed items against closing** — *below, and
    non-optional.* A missed repair or credit cannot be fixed after close.

**Learn**

27. **Record Britton's disagreements** — *below, and non-optional.* No risk
    in doing it; the trust ladder is unmeasurable without it. Alarm if it
    ever stops recording. (Numbered 17 before the negotiation phase was
    added.)

Worth noticing how small the above-the-line set is: three unconditional
steps (telling a client their deal is at risk, and sending anything to the
other side of the deal — an extension request or a counter) and two
conditional ones (a client's first brief, and a revision to a brief the
client has already read, which includes publishing a round's record). That
is only defensible because of the gates —
every qualified "below" above is below *because* a specific detector exists.
Build the gate or move the row up.

## Stop conditions

Added 2026-09-14 at Britton's request: no goal-driven trigger may run away
with no stop condition.

A loop can fail two ways. It can **run away** — repeat forever, spam a
client, spend money — or it can **stop silently**, which is the failure this
design already treats as the dangerous kind. So every loop needs both a
ceiling and a halt that someone can see.

### Rules that apply to every loop

- **Every deal has an end state.** When a transaction is closed or falls
  through (`transactions.status` already records this), every watch and
  alert for that deal stops.
- **Every retry has a maximum.** Exceeding it halts the work and alerts the
  realtor. A loop never quietly gives up.
- **Every alert fires once per condition.** It re-arms only when the
  underlying state changes, with at most one follow-up reminder — never on a
  schedule indefinitely.
- **Every agent run has a budget:** maximum steps, wall-clock time and tokens
  per run, and a spending ceiling per deal. Hitting a budget halts to the
  realtor rather than retrying.

### Each loop and what stops it

| Loop | Runaway risk | Stop condition |
|---|---|---|
| Waiting for wave 1 | Waits forever | Complete, publish now, a cancelled item removed, or the stall alert; the deadline watch takes over after that |
| Waiting for wave 2 | Each bid recommends another evaluation, so the expected list keeps growing | Every addition needs the realtor's confirmation; the deadline is the backstop |
| Negotiation rounds | Endless back-and-forth | Every new round needs the realtor to send something, so the agent cannot loop on its own. Ends at agreement, cancellation, contingency removal, or a passed deadline |
| Deadline, stall and through-close watches | Nightly alerts forever | Once per condition plus one reminder; end at the deadline, at close, or when the deal ends |
| Match and cluster proposals | Re-proposing something already rejected | Rejections are remembered; a rejected pairing returns only if a new report adds evidence |
| Extraction reconciliation | Re-extracting indefinitely | One retry, then halt to the realtor |
| Critic revisions | Drafter and critic trading drafts forever | Two revision rounds, then halt to the realtor with the unresolved objections |
| Daily pipeline test | Alerting daily through one outage | Once per outage, cleared by the next success; test emails are recognized and never processed as reports |
| Inbound delivery retries | Duplicate processing | The provider's retry limit, plus storing each message by ID before acting |

### Email loops

A risk the earlier design missed entirely. Harbour both sends mail (holding
messages, alerts) and receives it from a mailbox. An inspector's
out-of-office reply to a holding message, or a client hitting reply, could
flow back into `inspections@`, trigger an unmatched-report alert, and
generate more mail. Guards:

- Harbour never sends *from* `inspections@`, and never sets it as a
  reply-to address.
- Automatic replies (identified by standard auto-reply headers) and
  Harbour's own outbound messages are dropped on receipt.
- A per-sender and per-client daily cap halts intake for that sender or
  client and alerts the realtor when exceeded.

## The critic

Added 2026-09-14 at Britton's request: **the inspection agent must not
validate or critique its own work.**

Before this, the design had mechanical gates and the realtor's review, and
no independent check between them. Worse, the trust ladder's *exceptions
only* mode defined an exception as anything the agent flagged itself as
unsure about — which is the agent grading its own work.

### Design

- **A separate subagent with its own instructions**, ideally running on a
  different model, so the two do not share blind spots. It sees the output
  and the **source documents**, never the drafting agent's reasoning, so it
  cannot be argued into agreement.
- **Read-only.** It returns findings and never edits. The drafting agent
  cannot dismiss a finding; only the realtor can.
- **It verifies against the sources, not against the agent's extraction** —
  otherwise it would inherit the extraction's mistakes. It checks:
  - every finding in the source appears in the output (the missed-finding
    hunt, its most valuable job)
  - quotes and costs match the cited page
  - every causal link is attributed to an inspector
  - no finding has been folded into a cluster whose cause does not fit it
  - the legal watch list: minimizing, unattributed causation, steering
  - seller-response statuses match the actual response

### Three layers, each doing what the others cannot

- **Gates** check what is mechanical: counts, provenance tags, exact matches.
- **The critic** checks what takes reading comprehension but is still
  verification against a source.
- **The realtor** checks judgment.

### What it reviews, and what it can do

- **It blocks** anything leaving to the client or the other side of the
  deal: client briefs, round records, counters, extension requests.
- **It annotates** artifacts only the realtor reads — call prep and the
  negotiation brief — because the realtor reads those before using them.
  Call prep is still reviewed because the realtor repeats it aloud (legal
  watch item 6).
- **It skips the holding message**, a fixed template with no judgment that
  has to go out within seconds.
- **Revision is bounded:** critic rejects, agent revises, at most two
  rounds. If objections remain, the work halts and goes to the realtor with
  the draft and the unresolved objections.

### Consequences elsewhere

- **"Exceptions only" is redefined** as critic findings, gate trips and
  category rules. The drafting agent's self-reported confidence never
  defines an exception.
- **The critic is measured too.** Realtor edits the critic didn't flag are
  its misses; findings the realtor dismisses are its false alarms. Both come
  from the review edits the measurement plan already records.

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
- **Critic accuracy:** realtor edits on work the critic passed (misses) and
  critic findings the realtor dismissed (false alarms). The critic is what
  "exceptions only" trusts, so its misses are the number that decides
  whether graduation is safe.

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

*No open design gaps as of 2026-09-14.*

- **Precondition, not a gap:** broker and real estate attorney review of the
  call narrative's framing rules before it is built. See the legal watch
  list under "A narrative for the realtor's call." The broker half is
  scheduled for 2026-09-15; the attorney half is a ten-question email
  drafted to go out the same day.

*Resolved 2026-09-11: whether the client can ask the agent questions. No —
see "The client cannot ask the agent questions" above. And where calibration
comes from — see "Where calibration comes from" above.*

*Resolved 2026-09-12: the brief saying nothing about what happens next. It
turned out to be the same question as how to frame repair costs — telling
the client the total is an ask rather than a bill is itself the
what-happens-next content. See "Making a number less frightening without
misleading" above.*

*Resolved 2026-09-12: publication timing across a multi-report deal. Reports
arrive in two waves, so there are two publication points, with additions
updating the brief and revisions going to the realtor first. See
"Publication timing: two waves, two publication points" above.*

*Resolved 2026-09-12: triggers — what starts a deal's flow, what happens when
a wave stalls or a report matches no one, and how mail reaches Harbour. See
"Triggers" above.*

*Resolved 2026-09-14: the seller's response round — a loop rather than a
fixed round count, with status shown during and the record published after
the realtor's call, and agreed items verified through close. See "The
seller's response round" above.*

*Added 2026-09-14, at Britton's request after the design was otherwise
complete: a stop condition for every loop, including email loops the design
had missed, and a separate critic so the agent never validates its own work.
See "Stop conditions" and "The critic" above.*

## Security posture

The intake address is a dedicated mailbox (`inspections@brittontaylor.com`)
that inspectors send to directly, never a filter or alias on Britton's main
inbox. The original reason still holds: Gmail API access cannot be scoped to
a label, so an alias would expose the entire mailbox — other clients'
confidential positions, a fiduciary problem, and regulated financial data, a
compliance one.

**Revised 2026-09-12: Harbour does not read that mailbox either.** The
mailbox forwards each message to an inbound email service, which posts it to
Harbour. The agent holds no mailbox credentials or API access of any kind,
which is a stronger boundary than the dedicated mailbox alone. Two
consequences to build for:

- **The receiving endpoint must verify the inbound service's signature** on
  every post. An unauthenticated endpoint would let anyone submit a fake
  "report" straight into the pipeline.
- **The inbound service becomes a processor of client documents.** Choose one
  with controllable retention, and keep it to receiving and passing on.

Inspection reports are **untrusted input**. Real estate is the most targeted
sector for business-email-compromise fraud, and a PDF arriving from an
outside party can carry text addressed to the agent rather than to the
reader. The agent treats document contents as data and never as
instructions, and never acts on directives found inside a report. The narrow
intake reduces this exposure but does not eliminate it — the reports
themselves are the vector.
