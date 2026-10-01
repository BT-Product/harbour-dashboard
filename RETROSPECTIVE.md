---
artifact: retrospective
version: "1.0"
created: 2026-10-01
status: final
---

# Retrospective: Harbour (Discovery phase, paused)

## Overview

**Period Covered:** 2026-09-07 → 2026-10-01 · Harbour v1 through pause
**Date Held:** 2026-10-01
**Facilitator:** Claude (pair), with Britton Taylor
**Duration:** One working session
**Format Used:** Start / Stop / Continue, against the pre-committed thresholds

### Attendees

- Britton Taylor — product owner, agent, sole tenant, and the only person who used the agent surface
- Claude — engineering pair and facilitator

*A solo project, so the template's team sections are adapted: "votes" become an
impact ranking, and team-health scores become project-health indicators. Padding
them with invented numbers would defeat the point of the exercise.*

### Context

Harbour is a client-facing real estate transaction dashboard, built and shipped
to production during discovery, with one real pilot client. In 16 active days it
reached 74 commits and 19 database migrations, covering a client dashboard, a
full agent management surface, outbound client email, visit instrumentation,
per-brokerage theming, and licence disclosure.

Three events shaped the period: the first real client signing in (2026-09-11), a
managing broker review that reversed two shipped features (2026-09-22), and a
business review that found Harbour serves 5–6 clients a year for ~90 days each
while the business needs to go from 6 deals a year to 10–12 (2026-10-01).
Harbour is now **paused**, and the sphere-nurture problem became the next
project (Kindling).

---

## Previous Retrospective Review

### Action Items from Last Retro

| Action | Owner | Status | Notes |
|--------|-------|--------|-------|
| — | — | — | First retrospective for this project; no prior actions to review. |

The absence is itself a finding: ten logged working days with no scheduled
reflection point. The pause was triggered by an outside question, not by the
process.

---

## What Went Well

### Team Highlights

- **Instrumentation shipped before the first user.** Visit tracking landed 2026-09-09, two days before the first client signed in. Supabase keeps only a single overwritten `last_sign_in_at`, so none of it could have been reconstructed later.
- **The instrument paid off in a way nobody planned.** Its first output was not retention but a usability finding: the client opened all six sections in 37 seconds, three to eight seconds each — the signature of someone hunting for what a menu contains. The overview was rebuilt that week.
- **A shipped feature was killed on principle, twice.** First by Britton (a derived pre-approval figure of $492,228 contradicting the lender's letter of $475,000), then by the broker (the HOA calculator, because amortisation is the lender's licensed work). Both reversals were recorded rather than quietly patched.
- **A safety defect was found by the product team, not by a client.** Preparing copy for broker review surfaced that the only mention of wiring money in the entire codebase was an instruction to do it, with no fraud warning. Fixed the same day, ahead of review.
- **Compliance was treated as design input.** Licence disclosure, Fair Housing, private-note discoverability and wire fraud were worked as product constraints, not as a legal pass at the end.

### Process Wins

- **Thresholds were pre-committed** in `strategy.md` before anyone used the product, so success could not be redefined afterwards.
- **Reversals were written down with their reasoning.** `change_log.md` runs to ten day-entries and `DECISIONS.md` to nine one-line entries, each naming the assumption and what corrected it.
- **Claims were corrected against data, including unflattering ones.** Internal docs and a document already in front of the broker said the client used the dashboard "daily"; the visit table said one day. Every instance was corrected.
- **Verification habits held.** Migrations were replayed against a local Postgres before being applied; every outbound send was tested against a throwaway address before reaching a real client.

### Individual Shoutouts

- **Britton** supplied the two best product corrections of the period, and both came from practice rather than analysis: the lender's letter is the number, and escrow *does* email clients a portal link, which invalidated the first wire-fraud wording.
- **The managing broker** contributed the single best design idea: stages should track **contingencies** — what protection the client has released and what still stands — rather than activities.

---

## What to Improve

### Challenges Faced

- **The product was never tied to a business outcome.** The hypothesis was about felt care. Nobody asked which number in Taylor & Associates it moved until 2026-10-01. The answer, once asked, paused the project.
- **The pilot could never have validated anything.** A cohort of one produces a median of one person's habits. Thresholds were set in terms a cohort of one cannot satisfy.
- **The headline metric is unread, and the signal is not encouraging.** Target: a median of 2+ visits per week. Actual: 11 page views across **two days** (2026-09-11 and 2026-09-15) in three weeks.
- **Features shipped before their compliance question was asked.** The HOA calculator is the clearest case: built, polished, deployed, then ruled out by the broker on the first ask.
- **The second product was scoped partly for the portfolio.** The inspection agent was designed in part to showcase AI-agent skills. Good design work, but "it would demonstrate a skill" is not a product reason.
- **Built-first, learned-second was the default.** 74 commits and 19 migrations preceded the first business-level question.

### Process Pain Points

- **No reflection point was scheduled.** No retro, no checkpoint, no "is this still the right thing" gate between 2026-09-07 and the pause.
- **Documentation outran validation.** A 1,779-line change log and a 1,447-line strategy document describe a product with one user who visited twice.
- **The pilot cohort never grew.** "Two more clients, including a move-up buyer" sat in the open items for the entire period while feature work continued.
- **Two sessions shared one checkout**, which silently overwrites rather than conflicting. Caught and documented, but only after a wrong status report.
- **Client data went into a public repository.** The pilot client's name appeared 14 times alongside their pre-approval amount and loan type, and a live demo password sat in the seed script. Found during portfolio prep, not during a security review — and the repo had been public the whole time.

### Themes Identified

| Theme | Items | Impact rank |
|-------|-------|-------------|
| **No line from product to business outcome** | No business metric; hypothesis about feeling; 90-day surface for a years-long relationship; pause triggered externally | 1 |
| **Validation deferred behind build** | Cohort of one; thresholds unread; cohort growth never actioned; docs outran evidence | 2 |
| **Constraints discovered after shipping** | HOA calculator; wire wording; licence disclosure; notes belonging to the broker file | 3 |
| **Craft habits were strong** | Instrumented early; reversals logged; claims corrected; migrations replayed | — (keep) |

---

## Discussion Notes

### Topic 1 — Why a well-built product got paused

**What was discussed:**
Harbour does what it was designed to do. The client dashboard works, the agent
surface removed Supabase Studio from daily work, and the reasoning behind each
decision is documented to a standard most funded products never reach. It was
still the wrong thing to build *first*.

**Root cause identified:**
It began with an observation — "this process is hard for clients and agents" —
rather than with evidence about the business. Harbour serves clients who already
signed. The business constraint is that only 5–6 people sign a year, and the
relationships that produce them are built over years, in the 90% of time Harbour
does not touch. A product serving in-transaction clients cannot move that number
no matter how good it is.

**Proposed solution:**
Every future product idea starts with the business number it moves and what
happens to that number without it. Kindling was scoped that way from the first
question, and the problem statement is the first artifact rather than the last.

---

### Topic 2 — The broker review as a cheap test that was run late

**What was discussed:**
One conversation reversed two shipped features, redesigned the stage model, and
revealed that Harbour is a system of record that must hand over to the broker's
file. Every one of those findings was available before any code was written.

**Root cause identified:**
Domain constraints were treated as a review step rather than as discovery input.
The reviewer was engaged after the product existed, so her feedback could only
ever arrive as rework.

**Proposed solution:**
In a licensed industry, the practitioner interview comes before the build. The
cost asymmetry is severe: one hour of her time against a feature that shipped,
deployed, and now has to be removed.

---

### Topic 3 — What the instrumentation actually proved

**What was discussed:**
The visit tracking was built for a retention curve it will never produce — one
client, two visit days. Yet it was the most valuable thing built, because it
caught the 37-second scan that triggered the overview rebuild, and later caught
the team overstating usage in a document already with the broker.

**Root cause identified:**
Behavioural instrumentation earns its keep as evidence long before it has enough
data to be a metric. The error was expecting it to validate the hypothesis, not
building it.

**Proposed solution:**
Keep instrumenting first. Separate "evidence we can act on now" from "metric that
needs a cohort," and never let the second one's absence hide the first one's
findings.

---

## Action Items

| Priority | Action | Owner | Due Date | Status |
|----------|--------|-------|----------|--------|
| 1 | Write Kindling's problem statement and hypothesis before any Kindling code | Britton | 2026-10-08 | Not Started |
| 2 | Interview the practitioner before building, in the new project | Britton | 2026-10-15 | Not Started |
| 3 | Ask GitHub Support to garbage-collect the old Harbour objects | Britton | 2026-10-03 | Not Started |
| 4 | Set a standing checkpoint: every 2 weeks, ask what business number this moves | Britton | 2026-10-08 | Not Started |
| 5 | Decide Harbour's end state — archive, finish the broker's list, or mothball with a written closing note | Britton | 2026-11-01 | Not Started |

### Action Item Details

**Action 1: Problem statement and hypothesis first**
- What: Run `define-problem-statement` then `define-hypothesis` for Kindling, committed before any product code.
- Why: Addresses theme 1. Harbour's first commit was a feature; Kindling's first commit is the discovery handoff, and the next should be the problem.
- Success criteria: Both artifacts committed to `/Users/britton/kindling` with no application code in the repository.

**Action 2: Practitioner interview before build**
- What: For Kindling, put the compliance and practice questions to the broker *before* the first feature, not after — particularly anything touching client communication, record-keeping, and the broker file.
- Why: Addresses theme 3. The HOA calculator is the price of getting this backwards once.
- Success criteria: A written answer set exists before the first feature ships.

**Action 3: Purge the rewritten Harbour history**
- What: Request garbage collection from GitHub Support so pre-rewrite commits stop resolving by SHA.
- Why: The client's name and finances were in a public repository; the rewrite removed them from branches but old objects remain reachable by direct SHA.
- Success criteria: A known old SHA no longer fetches.

**Action 4: A standing business checkpoint**
- What: Every two weeks, in writing: what business number does this move, and what has it moved so far?
- Why: Addresses the absence of any reflection point in 16 active days.
- Success criteria: Four consecutive entries by 2026-12-01.

**Action 5: Decide Harbour's end state**
- What: Choose explicitly — archive as a portfolio artifact, finish the broker's required changes for the live client, or write a closing note explaining the pause.
- Why: One real client is still using a product with known defects: a wire warning the broker wants reworded, a financial calculator she ruled out, and client data that is deleted rather than filed on removal.
- Success criteria: A decision recorded in `DECISIONS.md`, and the pilot client told what to expect.

---

## Parking Lot

- **The contingency stage model** — the broker's best idea, fully specified in `change_log.md` day 10. Deferred because Harbour is paused, not because it's wrong; it would be the first thing to build if Harbour resumes.
- **The inspection agent** — complete design, unbuilt, with an attorney's warning attached ("don't look like you outsourced the job"). Deferred as a design artifact.
- **The 68 non-homeowners** — Kindling's hardest unanswered question. Deferred to that project's discovery.
- **Gamification (60 Daily Points of Rhythm)** — deferred until content exists; it failed before for the same reason the calls stopped.

---

## Metrics and Trends

### Project Health Indicators

| Indicator | This Retro | Last Retro | Trend |
|-----------|------------|------------|-------|
| Shipping velocity | 74 commits · 19 migrations · 16 active days | — | — |
| Pilot cohort size | 1 of 3 target clients | — | → |
| Pilot engagement | 2 visit days in 3 weeks (target: 2+/week) | — | ↓ |
| Thresholds readable | No — cohort of one | — | → |
| Decisions logged | 9 | — | — |
| Features reversed after shipping | 3 (pre-approval model, HOA calculator, coordination financing copy) | — | — |
| Business metric moved | None identified | — | — |

### Recurring Themes

- **Build quality consistently outran problem validation.** It shows up in the pre-approval model, the HOA calculator, and the inspection agent alike — each well-reasoned internally, none grounded in a business number first.
- **The best inputs came from practice, not analysis.** Every significant correction originated with a practitioner: Britton on the lender's letter and escrow portals, the broker on calculations, notes, and contingencies.

---

## Facilitator Notes

- Running the retro against **pre-committed thresholds** made the uncomfortable finding unavoidable. Without them, "one client visited twice" could have been narrated as early traction.
- Pulling the numbers live rather than from memory mattered: the recollection in the room was "daily use," and the table said two days. The same gap had already reached a document in front of the broker.
- The strong-craft column is not consolation. It is the diagnosis: this was a product built by someone who could execute, aimed at a problem nobody had sized.
- Next time, hold a checkpoint at first-user contact. The 37-second session on day 5 contained everything needed to ask the business question three weeks earlier.

---

## Next Retrospective

**Scheduled:** 2026-11-01, covering Kindling's first build-and-test cycle
**Focus areas:** Did the problem statement precede the code? Did the practitioner interview happen before the build? Did weekly high-impact contacts actually move from the 0.5 baseline?

---

*Retrospective documented by Claude with Britton Taylor on 2026-10-01.*
