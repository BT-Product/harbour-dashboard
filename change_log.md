# Harbour — Change Log

## Day 1 — 2026-09-07 (Discovery phase)

- Interviewed to confirm scope and a handful of build-time judgment calls
  before writing code: build the seller status strip and coordination view
  (not cut them), shadcn/ui for the interface, seed realistic demo data,
  and settled the HOA-adjusted affordability calculation (treat the
  preapproved loan at its rate as a fixed 30-year P&I budget, back-solve
  the max loan/price after a given HOA payment).
- Scaffolded the app: Next.js (App Router, TypeScript, Tailwind),
  shadcn/ui, Supabase client libraries.
- Designed and wrote the full Postgres schema and RLS policy set
  (`supabase/migrations/`), including two corrections to the original
  data model surfaced during implementation:
  - `stage_definitions` needed a composite primary key
    `(transaction_type, stage_key)` — the buy and sell stage sequences
    reuse key names (`offer_accepted`, `inspection`, etc.), which collide
    under a single-column key.
  - `homes_seen.private_notes` needed a database-level guarantee, not just
    an RLS policy, to be unreachable to clients — solved with a revoked
    column grant plus `SECURITY DEFINER` functions for agent access.
- Verified the RLS/column-grant design against a local Postgres instance
  with a stubbed `auth` schema before trusting it: confirmed a client
  session gets `permission denied` on both `select *` and an explicit
  `select private_notes`, and that the agent's debrief/stage-advance
  functions work end to end.
- Built the full v1 surface: client dashboard (overview with move-up
  coordination view and seller status strip, homes seen, tours, escrow
  stage stepper, inspections, financials with the affordability
  calculator), the two agent-facing surfaces (`/agent/debrief`,
  `/agent/transactions`), Supabase auth, and `/api/health`.
- Created the live Supabase project and Vercel project (Britton generated
  scoped credentials — a narrowly-permissioned personal access token and
  the project's DB connection string — rather than a full-access token).
  Pushed migrations and seed data to the live database.
- Seeded a demo cohort: one move-up buyer (linked buy + sell
  transactions), one pure buyer, one pure seller.
- Found and fixed three real bugs via live browser testing against the
  deployed app (not just typecheck/lint): agents landed on the empty
  client dashboard after login instead of their own tools; `/api/health`
  always reported failure due to a timestamp string-format mismatch
  between JS and Postgres; the seed script's batch insert sent an
  explicit `NULL` for `is_agent` on rows that omitted it (a PostgREST
  batch-insert quirk).
- Deployed to production: https://harbour-dashboard-ten.vercel.app.
  Verified login, the coordination view, the seller status strip, all
  client pages, agent debrief entry, stage advance, and the pure-seller
  reduced nav directly against the live deployment.
- Created `project.md`, `strategy.md`, and this file to start tracking the
  project going forward.

## Day 2 — 2026-09-08 (Discovery phase)

Pushed the repo to GitHub (private: `BT-Product/harbour-dashboard`), then
spent the day on design and on reworking the agent side, which didn't
survive contact with how the work actually happens.

**Look and feel.** Redesigned the client dashboard around a left sidebar
with a warm, calm palette and a serif display face (Lora) for headings,
using the Perplexity Health dashboard as a reference point. Later did a
density pass against HoneyBook and Buffer — a unified stat bar with
internal dividers, icon-led list rows, a time-of-day greeting — because
the first version read as unfinished: too much dead space and a bordered
box around every row. Then removed the `max-w-3xl`/`max-w-4xl` centering
so content uses the full width, with multi-column layouts where a single
column would otherwise stretch.

**The agent side got rebuilt around clients, not properties.** The flat
`/agent/transactions` list was replaced by `/agent/clients`, which drills
into a per-client page split across tabs (overview, upcoming tours, homes
seen, inspections) rather than one long scroll. Stage editing became a
real select over any stage rather than one-tap-forward-only, and key
dates, tours, and inspection items all became editable from the UI. Added
an `/agent` home page (active clients, tours this week, tours last week,
plus a nudge listing recent tours to check they got debriefed) and made
it the post-login landing.

This is a deliberate departure from the build spec's section 4a, which
scoped the agent to exactly two surfaces and left everything else in
Supabase Studio. The reasoning still stands for *entry friction* — the
debrief form is still its own fast standalone page — but managing a
client's transaction turned out to need a real UI, so we revisited it.

**Two structural decisions worth remembering:**

- Tours are now **upcoming-only**. A real tour outing is 5–6 addresses on
  one day, so both sections were flooding after a couple of weekends.
  Tours and Homes Seen are now grouped into one card per date, and once a
  tour date passes it drops off Tours entirely — the debrief under Homes
  Seen becomes the record of it. That also removed the duplication where
  the same home showed up in both places.
- **Top Contenders** on Homes Seen shows every home marked "strong," with
  no fixed cap. A hard top-2 was considered and rejected: an arbitrary
  cutoff could hide a home the agent actually flagged.

**Bugs found by clicking through the app, not by typecheck or lint:**

- Dialog triggers nested a `<button>` inside a `<button>`, a real
  hydration error, from passing a full `<Button>` through Base UI's
  `render` prop.
- Select dropdowns displayed raw values (`loan_approval`) instead of
  labels — masked for a while because single-word stages like "listed"
  happen to look presentable.
- Server actions only revalidated the overview route, so edits made from
  the new tab sub-routes could show stale data.
- The sidebar's bottom block wasn't pinned to the bottom because the
  shell used `min-h-screen` rather than `h-screen`.

**The app was unusable on a phone**, and had been since the sidebar was
introduced. Both sidebars were a fixed 256px with no responsive handling,
leaving ~119px of content on a 375px screen. This never showed up on
desktop because the old narrow container constrained the content, not the
sidebar. Fixed with a drawer: below `lg` the sidebar hides behind a
hamburger in a top bar; at `lg`+ nothing changed. This mattered more than
a normal layout bug — the debrief flow is explicitly designed for phone
use between showings, and clients are likely to open their dashboard on a
phone first.

**Grouped the client list by type.** Clients are now bucketed into
move-up buyers, buyers, and sellers, derived from what they're carrying
rather than a field anyone has to maintain — both a buy and a sell makes
a move-up buyer. Filter pills carry counts, and filtering goes through a
URL search param (`?group=buyer`) so a filtered view survives a refresh
and can be linked. A client with no transactions gets their own group
instead of dropping off the list; that's the state every real client sits
in between being invited and having their transaction created, so they
need to stay findable.

**Transactions can be created from the agent UI.** This was the last
piece of the normal client lifecycle still stuck in Supabase Studio, and
it sat directly in front of onboarding a pilot client — a newly invited
client has no transaction, so there was nothing for them to log into.
Now it's a dialog on the client's Overview tab, through a new
`agent_create_transaction` function following the same SECURITY DEFINER
pattern as every other agent write.

Two decisions inside it:

- **The starting stage is a field, not always the first stage.** Real
  clients get onboarded onto Harbour mid-transaction — often already in
  escrow — so forcing them to start at "Offer Accepted"/"Prep" and then
  immediately click forward would be busywork and would briefly show the
  client a wrong status.
- **Linking the two legs of a move-up buyer is offered inline, checked
  by default,** whenever an unlinked opposite-side transaction exists.
  The link is what turns on the coordination view — the feature the
  product is built around — and it's invisible if you forget it: you'd
  get two transactions that look right individually and a client whose
  dashboard is quietly missing the thing they most need. Better to make
  it the default and let it be unchecked.

Verified beyond the happy path: a client session calling the function
gets "not authorized", and linking to another client's transaction is
rejected.

**Pre-approvals and client add/remove — Studio is now out of the loop.**
With transactions already moved into the UI, the remaining gaps were
pre-approvals and creating clients at all. Pre-approval editing lives on
a new Financials tab on the client page (buy-side only, matching the
client's own nav) with a side panel showing exactly what the client will
see — their approved monthly budget and the max price at the HOA on
file — because those numbers are derived, not typed, and it's easy to
enter a plausible-looking loan and rate that produce a number you didn't
intend. Adding a client sends a Supabase invite email from **Clients →
Add client**; removing one deletes their login and their whole history
behind a type-the-name confirmation that lists what's about to go.

**Add/remove is the one place the app uses the service-role key.**
Creating and deleting an auth user is an Admin API call, so it can't go
through a SECURITY DEFINER function like every other agent write. The
action checks `is_agent` on the caller's own profile before the
service-role client is constructed, and removal still routes the data
delete through an RPC so that cascade stays transactional and
authorized database-side. Two guards worth noting: the delete function
refuses to touch an agent profile (`is_agent_of()` is true for the
agent's own row, so an agent could otherwise delete themselves), and it
unlinks a move-up buyer's paired transactions before deleting them,
since they point at each other.

**Three things only clicking through found:**

- A server action that threw took the app to a full page reload instead
  of showing the error. Worse, Next scrubs those messages in production,
  so an agent would never learn *why* an invite failed. Both actions now
  return `{ ok, error }` instead of throwing.
- The invite form reset itself on a failed submit — React resets an
  uncontrolled form once the action resolves — so a rejected address
  meant retyping everything. Now controlled.
- Removing a client revalidated the deleted client's own route before
  the browser navigated away, throwing "Client not found" twice.
  Narrowed the revalidation to the list, and a missing client is now a
  404 rather than a crash, since a stale link to a removed client is
  ordinary.

**Known constraint for the pilot:** Supabase's built-in email service is
a testing service — rate-limited and unreliable for arbitrary addresses.
Custom SMTP needs to be configured in Supabase before inviting real
clients. A failed send does surface as an error rather than a silent
non-delivery, but the first real invite should be confirmed received.

Deployed to production after each change and verified live, including at
a 375px viewport.

## Day 3 — 2026-09-09 (Discovery phase)

**Visit tracking, built the day before real clients arrive.** The
primary metric in `strategy.md` — median 2+ visits per week per client —
had no data behind it, and Supabase keeps only a single overwritten
`last_sign_in_at`, so a week of pilot usage would have been permanently
unmeasurable. Every client dashboard page view now writes a row.

Three decisions worth keeping:

- **The table stores page views; a visit is defined at read time** as a
  run with no gap over 30 minutes. Baking the threshold into the write
  path would freeze a number that's currently a guess — this way it can
  be re-argued against data already collected.
- **The write fires from the browser after mount, not during the server
  render.** Next prefetches routes on link hover and in viewport, and
  those prefetch renders would have counted as visits nobody made.
  Verified by hovering a nav link and confirming no row was written.
- **The agent is excluded in the database**, not in the app, so Britton
  opening a client's dashboard can never inflate their numbers.

Per-client counts show on the agent's client page: last visit, visits
this week, the week before, and pages opened. Verified end to end by
signing in as a demo client, walking five pages, and watching them
collapse into one visit; the test rows were then deleted so the pilot
starts from zero.

## Day 4 — 2026-09-10 (Discovery phase)

**The first real client was invited and signed in** (Tara Taylor,
invited 9:30am, password set and first login by 9:59am). The invite
email delivered on Supabase's built-in service — the SMTP worry didn't
block the first one, though nothing about volume or deliverability at
scale is proven by a single send.

**Buyers exist before properties do — the data model didn't allow it.**
Onboarding a real buyer surfaced the gap immediately: the buy sequence
started at "Offer Accepted", so the only way to give a touring buyer a
dashboard was to invent an address and a stage that hadn't happened.
That's backwards — touring *is* the window this product is about, and a
buyer typically spends weeks there before any contract exists.

- Added **House Hunting** as the first buy stage, and made
  `property_address` nullable. Which stages need a property is now a
  column (`stage_definitions.requires_property`) rather than a rule
  written into the form, so the create-transaction UI and the database
  function agree by reading the same flag.
- A transaction with no address renders as **"Home search"** everywhere
  via a single `transactionLabel()` helper, rather than a blank or a
  dash that reads like missing data.
- The client's own stepper now shows House Hunting as step 1 with the
  whole journey ahead of it, and the header says "Purchase timeline"
  rather than "Purchase escrow" until there's actually a contract.

**Add client now asks what they're doing.** Buying, selling, or both —
then collects what that answer implies: the address of the home they're
selling and where it is in the sale; where the buyer is in their search
(defaulting to House Hunting, no address needed). Both creates two
linked transactions in one database call, so a move-up client can't end
up half set up. Their page then shows a "Get their dashboard started"
card with three things: schedule an upcoming tour, log homes they've
**already** toured (with a backdated seen-on date — agents often tour
with someone for weeks before they're officially a client), and add a
pre-approval.

**Also:** page views now collapse repeats of the same path inside 30
seconds. React Strict Mode remounts a component once in dev and was
writing two rows a second apart; production doesn't, but a refresh or a
double-tapped link would. Visit counts were never affected — only the
finer-grained "pages opened" number.

**The first real client's invite link dead-ended, and it was our bug.**
Tara clicked "Accept invitation" and got an error. Her auth record
showed the token was consumed — account confirmed, session created — but
visit tracking showed she never reached the dashboard. Probing the auth
API confirmed why: the project's Site URL is still Supabase's default,
`http://localhost:3000`, and the invite carried no explicit redirect, so
Supabase verified her account and then sent her browser to an address
that only exists on a developer's laptop.

Two things were wrong, and both are fixed:

- **Links now name their own destination.** Invites and resets pass an
  explicit `redirectTo` derived from the request origin, so they no
  longer depend on a dashboard setting nobody had changed.
- **There was nowhere to land even if the redirect had worked.** An
  invited client has no password yet, and the app had no page to set
  one — only a login form they couldn't use. Added `/auth/callback`
  (reads the tokens Supabase returns in the URL fragment) and
  `/set-password`.

Also added, because this will happen again: **"Send them a sign-in
link"** on the client's page, surfaced as a banner when they've never
opened their dashboard, and a **"Forgot your password, or never set
one?"** link on sign-in. Both send a fresh link. Auth links are
single-use, and mail security scanners routinely prefetch links in
external email — which burns the token before the recipient clicks — so
"invalid or expired" needs a self-serve way out rather than a support
conversation.

**Still needs doing in the Supabase dashboard** (no API access with the
current token): set Site URL to the production URL and add it to the
redirect allow-list; configure custom SMTP; and fix the invite email
itself, which arrives from "Supabase Auth" at a supabase.io address with
`You\'ve been invited` — a literal backslash — as its subject line. None
of that is what a client should get from their agent.

## Day 5 — 2026-09-11 (Discovery phase)

**Spent the day getting one email to one client.** Yesterday's fix made
Harbour ask for the right redirect; today was everything downstream of
that still being wrong.

- **The redirect was being thrown away.** Supabase only honours a
  redirect that's on the project's allow-list, and ours wasn't, so it
  silently substituted `http://localhost:3000` again. Caught by probing
  with a throwaway address before sending anything to Tara — asked for
  the production callback, got localhost back. Britton fixed Site URL
  and the allow-list; re-probed and it came back correct.
- **Then the send itself failed**, 500 on every address, not just hers.
  The auth log had the real cause: `535 5.7.8 Username and Password not
  accepted — gsmtp`. Custom SMTP had been switched on and pointed at
  Gmail with a regular account password, which Google stopped accepting
  for SMTP years ago. An App Password fixed it.
- **Tara's link went out** at 17:17 UTC — `recovery_sent_at` populated
  for the first time, confirming a real dispatch rather than another
  silent failure.

Worth keeping: **every send was verified against a throwaway address
first.** Two of the three attempts would otherwise have put a second and
third broken link in front of a real client who had already had one bad
experience. The cost of the extra step is seconds; the cost of skipping
it lands on the person you're trying to onboard.

Also worth noting how the failure was found in the first place: visit
tracking, built two days earlier for the retention metric, is what
proved she never reached the dashboard. Her auth record said the invite
was accepted; only the absence of page views showed the flow died after
the token was consumed.

**Email is on a personal Gmail on purpose, for the pilot only.** Clients
currently receive their invites from a gmail.com address with Gmail's
"via" header, capped near 500/day. A reminder to move to a transactional
provider (Resend, Postmark, SendGrid, SES) on a real sending domain is
set for **2026-10-26**.

### Also day 5 — scoped the inspection agent (design only, no code)

Interviewed through a second strategic bet: an agent that turns an
inspection report into a client-facing brief. Written up in full in
`strategy.md`; nothing built, and deliberately not started, so the
Discovery pilot isn't destabilized.

Three things changed shape during the interview and are worth recording
as reasoning, not just conclusions:

- **The pain isn't triage, it's panic.** Britton can read a report in ten
  minutes. The expensive part is the hour on the phone after the client
  opens a sixty-page PDF alone. That reframed the deliverable from
  "summary" to "frame delivered before the spiral starts."
- **There is no window to deliver it in.** The inspector sends to client
  and agent simultaneously, so any design with a human approval gate
  arrives after the damage. Resolved by splitting on judgment: a
  judgment-free holding message auto-sends on arrival; everything
  substantive still waits for review. The holding message ended up being
  the actual intervention, which inverts the obvious priority order.
- **An early liability constraint was wrong and got reversed.** The
  design initially forbade the agent from dropping any finding, on
  failure-to-disclose grounds. Britton pushed back correctly: the client
  receives the raw report directly, so disclosure is already complete and
  filtering can't undo it — and a 47-card list *is* the overload the
  product exists to prevent. The constraint was working against the
  primary goal. What replaced it is a collapsed-but-expandable list,
  kept mainly so the agent's de-prioritizations stay auditable without
  re-reading the PDF. That safety argument is contingent on the client
  getting the raw report independently, and is flagged in `strategy.md`
  to be revisited if Harbour ever becomes the inspection's front door.

Also settled: the agent never originates a fact (every client-visible
claim carries provenance), calibration is asymmetric by category rather
than one caution dial, autonomy is per-tenant state so a realtor
arriving later still starts at the bottom of the trust ladder, and
intake is a separate `inspections@` mailbox rather than a filter on
Britton's main inbox — Gmail API access can't be scoped to a label, so an
alias would be a cosmetic boundary rather than a real one.

**Then labeled all 17 workflow steps above or below the autonomy line**,
scored against Britton's own test: reversibility, blast radius, and
whether failure is observable or silent. Three results worth keeping:

- **Blast radius has to include the effect on a person.** An initial
  recommendation to let publishing go below the line was wrong because it
  scored reversibility of the *artifact* — a brief can be edited, but a
  client's confidence can't be un-shaken, and the brief's whole job is to
  be credible at the client's worst moment. What rescued it was noticing
  the damage concentrates in *coherence* errors (wrong address, a finding
  absent from the source) rather than judgment errors: the first kind
  reads as unattended, and is mechanically checkable. Publish went below
  behind a coherence gate, with a client's first brief still above.
- **Escalation turned out to be two steps, not one.** Deciding how
  urgently to ping Britton is cheap and reversible; telling a *client*
  their deal may be at risk is irreversible, deal-sized, and silent when
  missed. Only the second is above the line — and it is the only
  unconditionally above-the-line step in the whole workflow.
- **Matching a report to the right client is the highest-risk step**, and
  it had been overlooked because it looks like plumbing. Publishing one
  client's inspection to another's dashboard is a cross-client breach
  neither party necessarily reports. It stays below the line because it's
  verification rather than judgment — a hard exact-match gate beats a
  human skimming addresses at 9pm.

The general principle that fell out, now the spine of the autonomy model:
**a step moves below the line because a detector was built for its failure
mode, not because the agent earned trust.** Graduation is built, not
waited for — an ungated step sits above the line however well the agent
has been performing.

**Closed the first of the three open questions: the client cannot ask the
agent questions.** Permanent, not a v1 scoping call. The decisive reason
isn't the obvious one — a chat surface would quietly contradict the
riskiest assumption the pilot is currently measuring, that self-serve
visibility *increases* felt care rather than substituting for the human
contact that earns referrals. Answering questions is the purest form of
that substitution, arriving at the moment the call matters most. The
origination rule couldn't survive it either: *"is this crack serious?"*
has no answer that is both useful and licensed.

Logged one candidate against it, wanted rather than shelved: a **"flag
this for our call"** control on each item, to revisit when the
client-facing brief UI is designed. It answers nothing and originates
nothing, so it sits outside the decision. The argument for it is a
measurement one — Britton's review edits show whether the agent graded an
item *correctly*, while client flags would show whether it graded the
item the way a frightened non-expert experiences it. Those are different
models, and the second one is the actual product.

**Closed the second open question: where calibration comes from.** It was
three questions wearing one name, and separating them dissolved most of
it.

- **Severity is read, not derived.** Inspection reports already carry a
  rubric — "Safety Hazard," "Major Concern," "Monitor" — assigned by the
  licensed professional who wrote them. Taking it turns the largest part
  of calibration from a judgment problem into an extraction problem, and
  it's the only treatment consistent with the origination rule. Britton
  confirmed his inspectors grade consistently enough to lean on.
- **Salience is uniform across clients.** Harbour knows their pre-approval
  and down payment, and reordering findings by what they can absorb was
  tempting — but a pre-approval says what a lender would lend, not what's
  in savings, and `project.md` already flags client-varying copy for Fair
  Housing review. The narrative may carry personal context; the order may
  not.
- **Framing is a base rate**, not calibration — which is why it's the
  piece that transfers to a new realtor for free.

Floor is the inspector's safety flag alone, with no category list to
maintain: if an inspector soft-pedals something, that miss belongs to the
licensed and insured party who made it, and declining to originate a
competing opinion is the entire point of the origination rule. Default
ordering is that grade plus general construction knowledge, enough to
carry v1 with no history. Refinement comes from Britton's review edits,
already captured by the measurement plan. **No written rules for the
middle layer** — tacit expertise doesn't survive articulation, and rules
work for the floor precisely because the floor isn't judgment.

One new gate fell out: defining the floor by the inspector's rubric
defines it by a field that may not exist. Britton's inspectors grade
well; another realtor's may not, and no client is obliged to hire a good
one. **A report with no parseable rubric halts and goes above the line
for that deal.**

### Also day 5 — two display bugs on the homes-seen card

Britton spotted the Edit button sitting on top of the interest badge on
the agent side. Both agent-side homes views were absolutely positioning
Edit at `top-3 right-3`, which is exactly where `HomeSeenCard` draws its
badge — two components independently claiming the same corner, neither
aware of the other. Fixed by giving the card an optional `action` slot
rendered in the header row beside the badge, so the two sit in normal
flow instead of stacking. The client-side views never overlaid anything
and were unaffected, which is why it only showed on the agent dash.

The screenshot he sent contained a second bug he hadn't flagged: the
debrief notes were rendering as one run-on sentence — "Great backyard
Front room for entertaining Needs a bit of work" — because the newlines
he'd typed in the textarea were being collapsed. Both of Tara's debriefs
have multi-line notes, so this was on every card, and it was the one
that mattered more: the overlap is ugly on the agent's own screen, but
the run-on text is what a client reads on hers. Now rendered with
`whitespace-pre-line`, private notes included.

Both verified against Tara's real debriefs at 1280px and 375px before
deploying, rather than against seeded data — the multi-line notes only
exist in what he actually typed.

### Not yet done

- Pilot cohort is one client deep (Tara Taylor, onboarded 2026-09-10) and
  still has no move-up buyer — the case the hypothesis actually turns on.
  Two more clients needed before the thresholds mean anything.
- Stage-explainer copy is a first draft — needs broker review and a Fair
  Housing check before any real client sees it.
- Brokerage name/DRE number in the `agents` row are still placeholders.
- Auth email goes out through a personal Gmail account (App Password),
  which is a deliberate pilot-stage shortcut, not a finished setup:
  clients see a gmail.com sender with a "via" header and the account is
  capped near 500/day. **Move to a transactional provider on a real
  sending domain — reminder set for 2026-10-26.**
- Visit data is collected per client but there's no cohort view — the
  median across clients is a manual read for now.
- The inspection agent is **designed but not started** as of day 5 — see
  `strategy.md` for the full scoping, including the deferred pieces
  (contractor cost ranges, the standalone brief) and the open questions
  (where calibration comes from, multi-report arrivals, the seller
  response round).
- `tours.home_seen_id` exists in the schema but nothing populates it, so
  a tour and its debrief aren't actually linked. The "recent tours — got
  a debrief written?" nudge is date-based, not a real gap calculation.
- Dark mode colors are defined but not wired up (nothing sets the `.dark`
  class), so the app is light-only.
