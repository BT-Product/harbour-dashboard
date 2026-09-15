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

**The first real client was invited and signed in** (the pilot client,
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
the client clicked "Accept invitation" and got an error. Their auth record
showed the token was consumed — account confirmed, session created — but
visit tracking showed they never reached the dashboard. Probing the auth
API confirmed why: the project's Site URL is still Supabase's default,
`http://localhost:3000`, and the invite carried no explicit redirect, so
Supabase verified their account and then sent their browser to an address
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
  with a throwaway address before sending anything to the client — asked for
  the production callback, got localhost back. Britton fixed Site URL
  and the allow-list; re-probed and it came back correct.
- **Then the send itself failed**, 500 on every address, not just theirs.
  The auth log had the real cause: `535 5.7.8 Username and Password not
  accepted — gsmtp`. Custom SMTP had been switched on and pointed at
  Gmail with a regular account password, which Google stopped accepting
  for SMTP years ago. An App Password fixed it.
- **the client's link went out** at 17:17 UTC — `recovery_sent_at` populated
  for the first time, confirming a real dispatch rather than another
  silent failure.

Worth keeping: **every send was verified against a throwaway address
first.** Two of the three attempts would otherwise have put a second and
third broken link in front of a real client who had already had one bad
experience. The cost of the extra step is seconds; the cost of skipping
it lands on the person you're trying to onboard.

Also worth noting how the failure was found in the first place: visit
tracking, built two days earlier for the retention metric, is what
proved they never reached the dashboard. Their auth record said the invite
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
he'd typed in the textarea were being collapsed. Both of the client's debriefs
have multi-line notes, so this was on every card, and it was the one
that mattered more: the overlap is ugly on the agent's own screen, but
the run-on text is what a client reads on theirs. Now rendered with
`whitespace-pre-line`, private notes included.

Both verified against the client's real debriefs at 1280px and 375px before
deploying, rather than against seeded data — the multi-line notes only
exist in what he actually typed.

## Day 6 — 2026-09-12 (Discovery phase)

Ran from the evening of the 11th. Two threads: Harbour became an email
sender in its own right, and the first client's login finally worked
after three separate failures.

**Day-before tour reminders.** The evening before a tour, each client
gets one email listing every stop with times and notes. One email per
client per date, not per stop — a tour is an outing of five or six
addresses, and five emails would be absurd.

This required Harbour to send email at all for the first time.
Supabase's mailer only sends its own auth templates, so anything the
product writes needs its own path; that's now Resend on
`brittontaylor.com`. Choosing it now rather than at the planned
2026-10-26 review avoided building the feature on the Gmail shortcut and
migrating it twice.

Three decisions worth keeping:

- **The reminder row is claimed before the send**, with a unique
  `(client_id, tour_date)` constraint. A cron retry, a double
  invocation, or the manual button can't double-email anyone. A failed
  send releases the claim, so failure retries rather than silently never
  sending — inserting first means a crash skips a client instead of
  re-sending them, which is the safer direction to fail when the
  recipient is a real person.
- **"Tomorrow" means tomorrow where the tour happens.** Parsing the day
  boundary in the server's timezone — UTC on Vercel — would shift the
  window by the offset and, on the Pacific coast, miss every tour before
  5pm while picking up the previous evening's.
- **A manual "Email reminder now"** exists because cron can only see
  tours that already exist when it runs. A tour booked the same day gets
  nothing otherwise, which was exactly the situation for the first real
  tour: it was booked the evening before, after the send window.

Caught before deploy: the middleware was redirecting `/api/cron` to
`/login`, so Vercel Cron would have hit a 307 and the reminder would
never have sent. Invisible from the outside — the job would simply have
done nothing every night.

**The login saga ended, three failures deep.** Getting one client into
their dashboard took three unrelated fixes, each hiding behind the last:

1. **Site URL pointed at localhost** (day 4–5). Fixed by sending an
   explicit redirect, then by correcting the project setting.
2. **SMTP rejected the password** (day 5). Gmail stopped accepting
   regular account passwords; an App Password fixed it.
3. **Their employer's scanner stripped the token.** Supabase's stock
   templates put the token after a `#`, and corporate link rewriters
   drop everything after the fragment. They got "that link didn't carry a
   sign-in token" — accurate, and completely opaque to them.

The fix for the third is to have Supabase put the token in the query
string (`?token_hash=…&type=recovery`) pointed at `/auth/callback`,
which the app already supported. Query parameters survive rewriting;
fragments don't. **Both the invite and reset templates were changed** —
the invite one matters just as much, since every future client whose
employer scans mail would hit the identical wall.

Worth recording as a pattern, not an anecdote: none of the three were
visible from the app. Every request Harbour served returned 2xx
throughout; a log query across the whole window found zero errors. What
found them was checking the layer below — the generated link's redirect
target, the auth log's SMTP error, and the shape of the URL in the
delivered email. **When a user reports a failure the application logs
deny, the bug is underneath the application.**

Also worth recording: visit tracking, built on day 3 for the retention
metric, is what proved they never reached the dashboard on each attempt.
Their auth record said the invite was accepted every time.

**A note on verification discipline.** Every send today was tested
against a throwaway address or the agent's own inbox first — and caught
a problem each time: an invalid Resend key surfaced the claim-rollback
path, an unverified sending domain (`brittontaylor.com` wasn't in the
account at all), and the template question. The one email sent without
that pre-flight is the one a client had already failed on three times.

### Also day 6 — the inspection agent's most valuable finding, from real work

Not from the design interview. Britton was sitting with a live client's
actual reports and noticed where his time was going: **figuring out which
findings in different reports are the same finding.**

A home inspection flags health and safety action items in red and gives
no repair costs. A wood pest or roof inspector often finds the same
underlying defect and *does* price it, because they'd be doing the work.
Match them and the cost arrives for free, from a licensed source, with no
contractor to chase.

**This overturned an earlier call.** Attributed cost ranges had been
deferred as a v3 business-development project requiring a contractor
network. Wrong — the prices are already arriving in the inbox, itemized
and signed by professionals who carry liability for them. Extraction, not
relationship-building, and it belongs in v1. It's also the safest
provenance tier there is: *"the pest company quotes $2,400"* rather than
*"this costs $2,400."*

It also inverted a gap. Multi-report arrival was filed as a sequencing
nuisance — reports land over days, so when do you publish? Backwards. The
correlation *is* the feature; a lone home inspection is the degraded case.
What survives as a real gap is narrower and sharper: publishing a brief
before the report that prices it lands means publishing a version about to
change, and republishing to a client who already read it is its own kind
of alarming.

Matching is **propose, never merge** — failing to match costs only what it
costs today, while wrongly merging hides one defect under another's cost,
silently. Agent proposes, realtor confirms with one tap, confirmations
become a calibration signal.

**A principle got named that had already decided two questions.** Filtering
findings, and whether costs belong in the client brief, both dissolved the
same way: *Harbour never withholds, it only frames.* The client holds every
source document, so nothing is protected by omission — the brief can only
change whether they understand what they're looking at. The useful
corollary is that "make this less scary" can only be answered honestly,
because there's no withholding option to be tempted by.

Which produced a concrete framing model for repair costs, and closed the
last of the three open questions along the way: the biggest reason a number
frightens a client is that they read "$10,700 in repairs" as *a bill I now
owe*, when at this stage it's what they're **asking the seller to cover**.
Saying so isn't spin — it's the function of the objection period, and most
first-time buyers don't know it. That reframe turned out to *be* the
"what happens next" content the brief was missing. Same question.

### Also day 6 — the client overview, rebuilt from watching a client use it

**The first real client signed in**, 9:11pm on the 11th, minutes after
the email template fix. Their session, straight out of the visit table:

```
21:11:47  /dashboard
21:12:19  /dashboard/tours          (32s on the overview)
21:12:22  /dashboard/homes          (3s)
21:12:29  /dashboard/homes/09-06    (7s)
21:12:37  /dashboard/escrow         (8s)
21:12:41  /dashboard/inspections    (4s)
21:12:56  /dashboard/financials     (15s)
21:13:52  /dashboard                (back to the start)
21:20:35  /dashboard                (returned 7 minutes later)
21:20:46  /dashboard/tours
```

They opened **every section in 37 seconds**, three to eight seconds each,
then went back where they started. That is not reading; it is opening
doors to find out what is behind them. Their own words afterwards were
that signing in was confusing.

The overview was the cause. It opened with a stage badge and an
explainer paragraph — which assumes you already know what a stage is —
and said nothing about what lived in the six menu items beside it. So
the only way to find out was to click all six.

**It is now a dashboard.** One plain sentence about where things stand
("You're house hunting. Your next tour is Sunday, September 13"), then a
card per section showing what is actually inside: the next tour with its
stops and times, homes seen with favorites marked, each transaction's
stage and step count, open inspection items, what they can spend. Every
card links into its full section, so the overview is a map rather than a
dead end.

**Two things were removed rather than added**, which is most of why it
reads more calmly:

- The move-up coordination card had been embedding a full card per
  transaction, and the grid below now shows each one too — a move-up
  client was reading the same stage and closing date twice. The
  coordination card keeps only the thing nothing else says: how the two
  timelines relate.
- A seller with no closing date got the stage explainer in the header
  and again in the card below. The same paragraph twice was the
  sparsest, most confusing version of the page.

Also fixed copy that rendered as two unlabelled numbers for a move-up
client: `closing in 34 days · closing in 25 days` became "Your sale
closes in 34 days and your purchase in 25 days."

**Worth recording as a method, not just a fix.** This is the first
change driven by watching a client rather than by our own judgment, and
the evidence was a byproduct of instrumentation built three days earlier
for a completely different purpose — the retention metric. The visit
table was meant to count visits per week; what it produced first was a
usability finding that no amount of looking at our own screens would
have surfaced, because we already knew what was in each section.

### Also day 6 — a narrative for the realtor's call

Britton worked a live inspection by hand with a general-purpose assistant
and came back with the part he actually valued: not a list of findings but
**a story about the house.** The findings had been grouped by root cause
into two clusters and a few one-offs — moisture under a raised foundation
explaining most of the damage, and an aging roof three inspectors had
independently reached. That let him explain the whole house on the call
instead of walking item by item, the way he normally does.

Recorded in `strategy.md` as a realtor-facing call narrative, with the
outline he shared treated as an illustration of the pattern rather than a
template. Details from the real deal were left out of the repo.

Two clarifications along the way worth keeping, both corrections of
over-reach: it was never meant as the client brief, and never meant to be
followed section by section. The design had started hardening one good
example into a spec.

Why it's worth building: grouping by cause changes what the client thinks
the problem *is*, which calms more than any base rate — and it's the
lowest-risk output the agent can produce, because a licensed human retells
it. Risk it adds: a cluster is a causal claim, and a compelling story is how
a misfiled finding disappears, so causal links carry provenance and cluster
membership is proposed, not asserted.

Also drafted a six-item legal watch list — stating causes outside the
license, framing that minimizes, advice beyond the role, discouraging
further investigation, implying seller concealment, and the realtor owning
what they repeat. **Broker and real estate attorney review of the framing
rules is now a precondition** before the feature is built; Britton is
arranging it.

### Also day 6 — sections unlock as the transaction earns them

The open question from the overview rebuild — whether to hide the three
sections a house hunter has no use for — resolved into a better frame
than hiding. Britton's: clients *unlock* areas as they move through the
journey, and nothing is taken away once it appears.

What a buyer starts with is Overview, Upcoming Tours and Timeline. Homes
Seen appears with the first debrief, Inspections with the first item,
Financials with the pre-approval. Every gate is a condition that only
ever becomes true, so the menu grows through the transaction and never
shrinks — which is what makes this progressive disclosure rather than
conditional hiding.

**Financials is the case worth recording, because the first instinct was
wrong.** It looks like an escrow-stage concern, and the first draft
gated it accordingly. Britton corrected it: a house hunter is exactly
who needs it, because they are comparing homes right now and HOA dues
move what they can afford against a fixed approved payment. So the gate
is the pre-approval existing, not the stage. (Checked afterwards: the pilot client's pre-approval
was already on file, entered the morning before their first sign-in, so
Financials was never locked for them — an assumption stated here as fact
before it was verified.)

**"Escrow" became "Timeline."** The page covers the whole journey
including the stages before a contract exists, and a house hunter is not
in escrow. The route is unchanged, so the visit data stays comparable
across the rename.

**The "new" badge needed a sharper definition than it first got.** The
first version badged any unlocked section the client had never opened —
which lit up Tours and Timeline, both present since their first login.
Unopened is not new. It now compares when a section came into existence
(from when its underlying data was created) against when that client
first signed in, so only genuinely new areas are flagged, and a
first-ever sign-in gets none at all: when everything is new, marking
everything new says nothing.

No new state was needed for any of it. The visit data already recorded
for the retention metric answers both halves — what they have opened,
and when they first arrived — so the badge follows a client across
devices and is switched off by the page view that gets recorded when
they open the section. That is the third distinct job `client_page_views`
has done since it was built three days ago for a metric that still
cannot be read.

The badge pulses under `motion-safe` only. A blinking element shown to
someone who has asked their device to reduce motion is an accessibility
problem, not a delight.

### Also day 6 — the inspection agent's publication timing

Closed the last question left over from the original design: when to
publish while reports are still arriving, given that republishing a brief a
client has already read is its own kind of alarming.

The reframe that dissolved most of it: **updating a brief isn't what alarms
a client, changing it without warning is.** A brief that names what's still
coming makes the update something they were told to expect.

Britton's answer on how reports actually arrive settled the rest. They come
in **two waves**: the inspection reports within a day or two, then contractor
bids ordered because of what the inspections found. That gives two
publication points, matching the orientation call and the recommendation
call, instead of a stream of updates. Within wave 1, a holding message per
report names what's still coming; no partial brief.

- **What's expected is tracked, not guessed.** The realtor lists the
  inspections they ordered; the agent proposes the wave-2 bids from the
  reports' own "recommend evaluation by a licensed…" lines. That also makes
  every recommended follow-up a tracked item, so none can quietly fall off —
  one of the legal watch items, now enforced by structure.
- **Additions and revisions are treated differently.** A bid that prices a
  finding the client already saw updates the brief. A bid that changes the
  story goes to the realtor first, so the client hears it from a person.
- **One notification per wave, not per bid.** A drip of emails would
  recreate the anxiety one bid at a time.
- **The deadline is watched.** When bids won't arrive before the objection
  deadline, Britton's practice is to ask for an extension and prepare a
  fallback ask on what's already quoted. The agent alerts, drafts both, and
  leaves sending the extension request to the realtor, since it goes to the
  other side of the deal.

This moved two rows above the line in the workflow model — sending the
extension request, and revising a brief the client has already read — so
the model now has two always-human steps and two conditional ones rather
than one of each. The README's autonomy summary was corrected to match. The
one remaining gap is the seller's response round.

### Also day 6 — the inspection agent's triggers

Britton asked whether triggers had been decided. Only partly: the design
named the events that should start work but not how they're detected, and
it had places where nothing would start at all. Those silent non-starts
were the real finding — nothing errors, the flow just never happens, and a
client sits alone with a report.

- **Kickoff:** entering the wave 1 list (with inspection dates) starts a
  deal's flow. A report arriving for an in-contract client with no list is
  the safety net: the flow starts anyway with a generic holding message and
  a prompt for the list. Moving to the Inspection stage only prompts.
- **A stalled wave** — a listed report 48 hours past its inspection date —
  alerts the realtor, who chases it or presses publish now. The agent never
  publishes a partial set itself, since only the realtor can judge whether
  the missing report changes the story. The deadline watch was widened to
  cover wave 1 as well as the bids.
- **Unmatched reports** halt and alert immediately; assigning one is above
  the line. **Cancelled inspections** can be removed from the expected list,
  or a cancelled roof inspection would hold wave 1 open forever.
- **Mail arrives by push, not polling.** The `inspections@` mailbox forwards
  to an inbound email service that posts each message to Harbour, so the
  agent has no mailbox access at all — a stronger boundary than the
  dedicated mailbox it replaces. Britton asked whether that meant no
  heartbeat on the email; right, but push fails silently, so the *pipeline*
  gets one: a daily test email through the real path, the same idea as
  `/api/health`. Receiving is idempotent by message ID, and the endpoint has
  to verify the inbound service's signature or anyone could post a fake
  report.

Step 1 of the workflow model had justified itself with "Britton received
the same email, so a miss is visible anyway." With forwarding, that's no
longer something to assume, so the pipeline test was added as step 0 to
carry that guarantee instead.

### Also day 6 — the pre-approval shows the lender's letter, not our model of it

Started as "enter the pilot client's pre-approval," became three
corrections in a row, and the corrections are the useful part.

The table had quietly become a small mortgage model: loan amount, cash
down, rate, and — added during this session — a down payment assistance
percentage and a deferred flag, from which the app *derived* a purchase
price. The arithmetic was correct. Adding assistance to the loan
understates the answer, because the assistance is a percentage of the
price it is helping to buy, so the price has to be solved rather than
summed:

```
price = (loan + cash) / (1 - assistancePct)
```

That produced $492,228 for a client whose pre-approval letter says
$475,000. Britton's correction: **the letter is the number.** A lender
hands an agent three facts — purchase price, percent down, loan type —
and a figure this app calculated instead of that price is wrong by
definition, however good the derivation. Correct arithmetic on the wrong
premise is still the wrong answer, and a client comparing their dashboard
to their letter would find the dashboard inflating what they can offer by
seventeen thousand dollars.

Two earlier corrections in the same thread pointed the same way. The
client view had grown a breakdown of loan amount, down payment, rate and
lender, and then a paragraph explaining how assistance factors in —
detail that helps a client decide nothing and invites questions a realtor
is not licensed to answer. **Let the lender own the mechanics.**

So the model is now the letter: `purchase_price`, `percent_down`,
`loan_type`, plus the lender's name. The client sees those four and one
estimate — how a home's HOA dues change what they could offer — because
that is the number that actually shapes a search. At $400/month of dues
this client's ceiling moves by $64,000, which is the difference between
browsing listings they can offer on and listings they cannot.

**The property that makes the estimate honest:** it can only ever reduce
from the stated price, and at zero dues it returns the lender's number
unchanged. Any future calculator on a client-facing figure should pass
that same test — the authoritative document is the floor of what we
display, and our arithmetic is only allowed to qualify it downward, never
to restate it.

One deliberate exception survives. The HOA estimate cannot convert
monthly dues into a price without a rate, so `rate` stays as an
agent-only field, labelled for exactly that purpose, never shown to the
client, and blank simply hides the calculator rather than assuming a
number. Britton kept it on the grounds that the HOA adjustment matters
most while a buyer is still searching — which is the same reasoning that
puts Financials in front of a house hunter in the first place.

Worth carrying into the inspection agent, where the same temptation
appears with higher stakes: the inspector's report is the authoritative
document, and anything the product computes about it can qualify a
finding but must not restate one.

## Day 7 — 2026-09-13 (Discovery phase)

### The compliance review packet — scoping what only a broker can answer

Worked through what in Harbour actually needs a broker or a real estate
attorney to sign off, reading the client-facing copy rather than
recalling it. The review had been an open item since day 1 phrased as
"stage-explainer copy needs broker review," which turned out to
understate it in one direction and overstate it in another: the
explainers are the bulk of the work, but they are not the most urgent
thing, and several surfaces nobody had flagged carry more risk.

**The finding that changed the priority.** Searching the codebase for
"wire" returns exactly one line — `supabase/seed.sql:13`, the Clear to
Close explainer, instructing the client to *"schedule a final walkthrough
and wire your closing funds."* The only time the product mentions wiring
money, it is telling the client to do it, with no fraud warning anywhere
in the app. That is the precise setup a wire-fraud attempt exploits: a
client told by a channel they trust that wiring is the next step, then
sent instructions that appear to come from escrow. It is going in as a
fix regardless of the review; what the broker owns is the wording, not
the decision.

**Six items, not five.** Assembled as a reviewable packet rather than a
repo link, since the broker is not going to read source:

1. The wire instruction above — marked urgent, with proposed interim
   copy for them to correct rather than a blank box.
2. All fourteen stage explainers, buy and sell, quoted in full. Two make
   affirmative all-clears (*"no action needed from you"*) — a statement a
   client can rely on, sitting in a database row nobody re-reads. Folded
   in the key-dates question: `transaction-card.tsx` renders contract
   dates as bare fact with nothing saying the contract governs.
3. `coordination.ts:56` names loan products — *"bridge financing or a
   contingency-backed loan"* — then refers to the lender second.
4. The HOA affordability estimate. Defensible framing already (never
   restates the letter, names the lender, says it is not a second
   pre-approval), but it models principal and interest only — no taxes,
   insurance, or MIP, and the pilot client is on an FHA loan.
5. The debrief note fields. `private_notes` is genuinely unreachable to
   clients at the database level, but *private* in that sense is not
   *privileged* in the legal sense — those notes are producible. The form
   is optimized for speed, typed on a phone between showings, which is
   exactly when a careless phrase gets written down.
6. No license number or brokerage name appears anywhere a client can
   see. `scripts/seed.ts:53–54` hold "TBD Brokerage" and "TBD", and
   neither field is read by any client-facing code. The automated tour
   reminder emails are the stronger case of the two surfaces.

Packet: https://claude.ai/artifact/6onJiwsEC9gBCc1HcV7Sq1 (originally published at
https://claude.ai/code/artifact/2f05d3c8-08ee-45ab-a6cb-ecb2f51637f4)

Attorney-side items (discoverability and retention of agent notes, no
terms or privacy policy while `client_page_views` records every client
page view undisclosed, data ownership if the brokerage changes, and
whether the E&O carrier knows a client-facing app exists) were
deliberately kept out of the broker packet and left for a separate
conversation once the pilot is past one client.

### A finished tour had nowhere to go

Britton got back from a tour with the pilot client, opened the dashboard
to write the debriefs, and the tour was gone.

`tours/page.tsx` filtered to `scheduled_at >= now` and dropped everything
older on the floor. A past tour did not move anywhere — it disappeared
from the only tab that had ever shown it. The addresses then had to be
retyped into a fresh debrief from memory, hours after the showing, which
is both the worst time to recall them and the exact moment the product is
supposed to be earning its keep.

The schema had anticipated this and then never used it: `tours.home_seen_id`
has existed since migration `0001` and nothing has ever written to it. It
was on this list as an open item.

**Which tours still need a debrief is derived at read time**, not
materialised by a scheduled job. `homes_seen` is client-readable, so
auto-creating a row the moment a tour's start time passed would put a
blank entry on the *client's* own Homes Seen page for a showing that may
have been cancelled, rescheduled, or never reached — the same reasoning
that keeps `client_page_views` collapsing into visits at read time
instead of being stored as visits.

- Past tours with no debrief now appear at the top of the agent's Homes
  Seen tab under "Toured — needs a debrief", grouped by day, newest
  first, each carrying its address and time straight into the debrief
  form. The Tours tab stays upcoming-only but now says where they went.
- Saving a debrief from a tour links the two rows through
  `agent_link_tour_to_home` (migration `0014`), finally populating the
  column from `0001`.
- Matching address and day is a **fallback**, not the mechanism. It
  covers the two cases the link cannot: tours from before the link
  existed — including the one Britton had just got back from — and
  debriefs typed from scratch with "Add debrief" instead of from the
  tour. The link is what survives the agent editing an address while
  writing it up.
- The link call deliberately does not throw on failure. The debrief is
  already saved at that point; an unlinked tour simply stays on the list,
  where address matching settles it anyway. Throwing would report a write
  that succeeded as a failure — and it means the feature degrades
  correctly on a database where `0014` has not been applied yet.
- Added "Didn't happen" to clear a tour that was cancelled or never
  reached. Without it, past tours appear nowhere else, so there would be
  no way left to remove one.

## Day 8 — 2026-09-14 (Discovery phase)

### The packet went to the managing broker

Sent, with a cover note that leads on the wire-fraud finding rather than on
the product. The reasoning is that an email opening "I built a tool, would
you take a look" reads as a favour request and waits; one opening "I audited
something my client reads daily and found an exposure" reads as an agent
taking supervision seriously. The rest of the packet rides in behind it.

Worth recording that this email is also a disclosure: the broker is learning
for the first time that one of their agents has been running a client-facing
app with a live client. Handled by saying so in the first sentence rather
than letting them find it in item 06.

### The wire-fraud warning shipped without waiting for an answer

The packet argued this shouldn't wait on the review, and the cover email
committed to it in writing, so it went in the same day.

Two separate changes, and the split is the point:

- **The explainer no longer instructs anyone to wire anything.** Escrow sends
  the instructions; the client is told to call escrow at a number they
  already have and confirm by voice before sending. Migration `0015` updates
  the live row, `seed.sql` updates fresh databases.
- **The warning a client actually reads is a component, not prose.**
  `WireFraudNotice` renders on both the overview and the timeline, outside
  the stage narration, with its own visual treatment. Explainer text is
  narration and gets skimmed — which is exactly what this cannot afford to
  be. Burying the warning in the paragraph would have been a gesture rather
  than a fix.

It shows **from Offer Accepted onward, not only at Clear to Close**. The
earnest money deposit is wired right after acceptance, well before the
closing funds everyone pictures. The broker was asked which boundary they
want; until they answer, warning too early costs a client nothing and
warning too late costs them everything.

All of it is marked interim in the code, the migration, and the packet
itself. The brokerage's wording replaces it verbatim when it arrives rather
than being merged with it.

### A correction to a document already in front of a broker

While placing the warning, found that `TransactionCard` is **dead code** —
nothing imports it. It renders contract date, contingency removal date and
close of escrow, which is where the packet's claim that "the dashboard
displays contract dates as plain facts" came from.

What the client actually sees is narrower: the closing date only, on the
overview card. Contract date and contingency removal date are recorded by
the agent and shown to nobody.

The underlying question survives — a date displayed as bare fact with
nothing saying the contract governs — but it was overstated, in a document
someone is reviewing right now. Corrected in the packet at the same URL,
along with a note that item 01 has shipped. Republishing rather than
emailing a correction keeps one version in front of them.

A second lesson, cheaper: this is twice now that reading the code beat
recalling it. The first was asserting a pre-approval didn't exist when it
had since September 11.

### The migrations didn't run the first time, and nothing said so

Both `0014` and `0015` were reported applied and neither had been. The
check that caught it was routine — query the function, read the row back —
and it cost nothing, which is the argument for doing it every time rather
than when something feels wrong.

Ruling out the boring explanations first turned out to matter. Production
and local `.env.local` were compared and both point at the same Supabase
project, so the checks weren't aimed at the wrong database; both
`clear_to_close` rows were read, buy and sell, in case the update had hit
the other one. Only after that did "the SQL didn't run" become the answer
rather than a guess. A schema-cache lag could have explained the missing
function on its own — but not the explainer, which is an ordinary row
read, and it was the two failing *together* that ruled that out.

The cause is worth recording because it will recur: **the Supabase CLI is
linked to the project but not authenticated, so `supabase db push` exits
without applying anything and without an error loud enough to notice.**
Migrations are therefore pasted into the dashboard SQL editor by hand,
which means they can land in the wrong project, or not land at all, with
the same silence either way.

Applied on the second attempt from a project-scoped SQL editor link, with
a verification `select` appended to the same paste so the editor itself
reported `migration_0014_ok` and `migration_0015_ok` rather than leaving
it to be checked afterwards. Both confirmed independently against the API:
the link function now exists and raises its own `tour or home not found`
guard, and the explainer no longer instructs anyone to wire anything.

The generated paste file was deliberately not kept. `supabase/migrations/`
is the authoritative copy; a saved query in the Supabase dashboard would
be a second one with nothing keeping the two in sync.

### Also day 8 — the inspection agent's seller response round

Closed the last design gap. The round differs from everything before it
because the other side is now a participant: the input is the seller's
decision, and every output is a move in a negotiation. It's also where
client anxiety peaks.

Asked how the round usually goes, Britton's answer was that it varies by
market. That turned out to simplify things: the design can't assume a round
count, so it's a loop, and the market shapes the realtor's advice rather than
the mechanics.

- **Every response is reconciled item by item** against the ask — agreed,
  credit, refused, countered, or not addressed. The last is the dangerous
  one, so every item must get a status.
- **Responses go to the realtor first**, a refused or unaddressed safety item
  is flagged as a possible deal-at-risk, and the agent prepares the decision
  call. Unlike the orientation call, this is where the realtor recommends.
- **Counters are drafted by the agent and sent by the realtor.**
- **The client sees status during the round and the record after** the
  realtor has talked it through. Silence during a seller's window is where
  the anxiety lives, so the waiting is made visible; the outcome waits for a
  person.
- **Agreed items are verified through close.** Receipts are matched to agreed
  repairs (proposed, then confirmed), credits are checked against the closing
  statement, and anything unverified as closing approaches alerts the
  realtor — a missed repair or credit can't be fixed after close.

One principle needed a footnote. "Harbour never withholds" rested on the
client already holding every document. Here the seller's response goes to
the realtor, so telling the client first is sequencing, not withholding —
but the premise changes in this round.

The workflow model gained a negotiation phase and a through-close phase
(steps 17–26), and the always-human set is now "telling a client their deal
is at risk" plus "anything sent to the other side of the deal." The README
now describes the design as complete.

### The packet couldn't be completed by the person it was built for

The managing broker reported they could neither save their answers nor
enter their name and date. Two separate faults, and only one was a slip.

**The slip:** the "Reviewed by" and "Date" lines were built as ruled lines
for a printed copy, with no input behind them. On screen they looked
fillable and weren't. A print-first detail that nobody checked on screen.

**The design error:** answers were kept in browser storage, and the page
promised they'd "save in this browser as you go." Shared views frequently
block browser storage outright, and even where it works it saves only on the
reviewer's own machine — so in the best case the answers still never reached
Britton unless the reviewer thought to copy them into an email.

The obvious repair turned out to be unavailable, which is the part worth
keeping. Both of the page's server-side persistence options exclude exactly
this reader: shared storage makes a page organization-internal (a broker is
not a member of Britton's Claude organization, so they'd have lost access to
the page entirely), and letting a page save itself requires edit access and
is disabled on shared links. **A page meant for someone outside the
organization cannot depend on any of it.** That should have been the first
question asked when building the packet — who opens this, and with what
access — rather than discovered from the reviewer's report.

The rebuilt page assumes no storage at all:

- Name and date are real fields.
- The instructions state plainly that the page can't save or send anything,
  instead of promising it does, and say that replying to the email directly
  is equally fine.
- Everything entered, name and date included, gathers live into one text box
  at the bottom. Getting it out needs only the reviewer's own select-and-copy,
  which no browser policy can block. The Copy button remains as a convenience
  but claims "Copied" only when the browser confirms it — a false success
  message is the most reliable way to lose someone's answers.
- The Print button was removed: printing from inside a shared view is as
  unreliable as the clipboard, and it was one more control that could silently
  do nothing.
- Browser storage survives only as a best-effort draft under the original
  key, so anything that did manage to save carries over.

Anything the broker typed before the fix was most likely lost. Britton was
advised to say so up front rather than let them reopen the page expecting
their answers, and to make an inline email reply an explicit, equal option —
a reviewer who has already hit one broken form may reasonably not try again.

Checked that the script parses; not seen rendered in the broker's own view,
so their next attempt is the real test.

Republished to the same artifact. Its link now displays in a newer format
(https://claude.ai/artifact/6onJiwsEC9gBCc1HcV7Sq1); the original link format may still resolve, but the
current one is what to send.

### Also day 8 — stop conditions and a separate critic for the inspection agent

With the design otherwise complete, Britton asked for two guarantees: that
no goal-driven trigger can run away without a stop condition, and that the
inspection agent is never the critic of its own work.

**Stop conditions.** A loop can fail by running away or by stopping
silently, so every loop got both a ceiling and a halt someone can see.
Four rules apply everywhere: a deal's end state stops all its watches, every
retry has a maximum that halts to the realtor, every alert fires once per
condition with at most one reminder, and every agent run has a step, time and
token budget with a per-deal spending ceiling. Each loop was then listed with
its own stop. Two were real runaway risks rather than theoretical ones: the
wave-2 expected list can grow indefinitely because each bid recommends
another evaluation (every addition now needs the realtor's confirmation), and
match proposals could be re-proposed after being rejected (rejections are
now remembered).

The audit also found a loop the design had missed completely: **email
loops.** Harbour sends mail and receives it from a mailbox, so an
out-of-office reply to a holding message could flow back into
`inspections@` and generate more mail. Harbour now never sends from or with
a reply-to of that address, drops automatic replies and its own messages on
receipt, and caps intake per sender and per client.

**The critic.** Nothing independent sat between the mechanical gates and the
realtor's review. And the trust ladder's "exceptions only" mode had defined
an exception as anything the agent flagged itself as unsure about — the
agent grading its own work, and exactly what Britton wanted ruled out.

The critic is a separate subagent, ideally on a different model, that sees
the output and the source documents but never the drafting agent's
reasoning. It is read-only; the drafting agent cannot dismiss its findings,
only the realtor can. It verifies against the sources rather than the
extraction, since checking the extraction would inherit its mistakes, and
its most valuable job is hunting for findings that never made it into the
output. Britton agreed to the recommended split on what it can do: it **blocks**
anything bound for the client or the other side of the deal, and **annotates**
realtor-only artifacts. Revision is capped at two rounds before halting to
the realtor, which is itself one of the loops the stop-condition audit
covers. "Exceptions only" now means critic findings, gate trips and category
rules, and the critic's own misses and false alarms are measured from the
review edits already recorded.

### Also day 8 — two sessions, one checkout

Two Claude sessions have been working on this repo at the same time — one on
the app and the broker packet, one on the inspection agent design — and it
surfaced through a wrong status report rather than a collision.

The app session reported its commits as unpushed for a day, and attributed it
to a push block from a single denied `git push` it never re-tested. When
asked directly, the push ran fine — and there was nothing to push. The
commits were already on GitHub, along with one it hadn't made. It then
claimed the local copy was a commit behind; a pull showed that was wrong too.
**The other session wasn't in a separate clone. It was committing into the
same working directory.**

That changes what can go wrong. Two clones produce merge conflicts, which
are loud. Two sessions in one folder produce silent overwrites: whichever
writes a file last wins, and the other's uncommitted edit disappears with no
warning to either. It hadn't happened yet only because the two sessions had
mostly stayed in different files — and the shared ones are exactly the
tracking docs, this file included. The other session's latest commit had
just added two sections to this log, interleaved with the app session's.

Recorded in `CLAUDE.md` as rules for any session:

- Only one session edits the tracking docs at a time; an uncommitted change
  to one in `git status` means another session is mid-edit.
- Re-read a file immediately before changing it.
- Stage by path, never `git add -A` — which the app session had used for most
  of its commits and got away with only because the tree was otherwise clean
  each time.
- Commit small and soon, since only uncommitted work can be overwritten.
- Fetch and look before claiming anything about the remote.

This entry was written that way: status checked, the other session's commit
inspected, the end of this file re-read before appending, and staged by path.

### Also day 8 — a review page for the inspection agent

Britton is meeting the managing broker about the dashboard on 2026-09-15
and will use the time to cover the inspection agent too. Built a review page
for it, linked from `project.md`, styled as a sibling of the dashboard
packet so the two read as a set.

It explains the design in three short sections — what the agent would do,
where the realtor stays in control, and the safeguards — then asks twelve
questions. The middle section matters most for a broker: it separates what
always waits for the realtor, what stops and comes to them, and the three
things that reach a client **without** review, which is where a broker's
duty to supervise bites.

Preparing the questions widened the precondition review. The legal watch
list covered what the narrative says; it didn't cover the brokerage's own
concerns — AI-use policy, supervision, telling clients AI is involved, E&O
coverage, record keeping, and routing documents through an outside email
service. Those six went to the broker along with the two watch-list items
that are practice standards. The other four watch-list items went on the page
as questions expected to need an attorney. Recorded in `strategy.md` under
the narrative's precondition.

**Built with the packet's lesson in mind, but not fully free of it.** The
dashboard packet failed because it assumed a reader who could save. This
page saves answers to itself, which works for Britton as its owner recording
answers in the meeting. A broker opening a shared link on their own is
outside the organization, where saving is unavailable: the page falls back to
gathering their answers as text to copy into an email, but only after a save
attempt is refused. If the broker is going to fill it in alone rather than in
the meeting, the page should say up front that saving may not work for them.

Not seen rendered before publishing — the browser pane can't display a local
file — so Britton opening it once before the meeting is the first real look.

### Also day 8 — the wire warning names escrow and a number to call

Britton caught a flaw from practice that no amount of reading the code would
have: the warning said "we will never email you wiring instructions," and
escrow *does* email clients — a link to a secure portal where the instructions
are. A client told those emails don't exist either distrusts the real one and
closing slips, or learns the warning is wrong and discounts the rest.

His proposed fix — show the escrow company and officer so the client knows
what to look for — was right but incomplete. A name protects no one on its
own: attackers reuse real officers' names and lookalike domains, and a fake
portal link is one of the most common lures. **What protects the client is a
phone number they didn't get from email**, and the dashboard is unusually well
placed to supply one: it's behind a login on a channel separate from the
client's inbox, so someone who has broken into that inbox can't change what it
shows.

Migration `0016` adds escrow company, officer and phone to `transactions`, set
through `agent_update_escrow_contact`. There is **deliberately no escrow email
column** — the warning tells clients to verify by phone, and showing an
address would invite verifying by email, the channel being attacked. The agent
form says to take the number from escrow's website or known contacts, never
from an email, since a number copied from a spoofed message relays the fraud.
Without an escrow phone the client sees a general version, never a blank or
placeholder number. Both versions close on the line that catches the classic
attack: wiring instructions don't change once they're sent.

Building it surfaced that **the agent's own phone was empty in production**,
so tour reminders had been going out signed without a number. It also lived
only on the agent's profile, which clients can't read. `agents.phone` now
holds it (clients can read their agent's row), set through
`agent_update_my_phone`, which takes no agent id so one agent can never set
another's number. Reminders read it, falling back to the profile field.

The client-side lookup of the agent's contact fails soft rather than
throwing. It only personalises the warning, which has a general version for
exactly that case; throwing would take a client's whole dashboard down over a
missing phone number — including in the window where this code is deployed
before its migration.

**The migration failed on the first paste, and nothing said why.** It rolled
back cleanly, so the database was untouched. Rather than guess between "the
SQL is wrong" and "the paste was wrong," every migration from `0001` was
replayed against a throwaway local Postgres 17 — the production major version
— with a stubbed `auth` schema, then the exact paste file on top. It ran and
returned all four checks true, which settled it: the SQL was fine, and the
clipboard most likely held the terminal command rather than its output. The
migration was put on the clipboard directly, and the second run succeeded.
Replaying the migration chain locally took about a minute and is worth
reaching for whenever a production run fails without a readable error.

Deployed after both sides were confirmed: the columns and functions from the
API, and production pointing at the new build by deployment id rather than by
a status poll that had come back blank.

### Also day 8 — a demo buyer for the meeting, and a published password

Britton had removed the pure-buyer demo account because the client now covered that
case — then realised he can't sign in as the client, so there was nothing to show
the broker. Recreated **Sam Buyer** as a plain buyer at Offer Accepted, so the
wire warning shows: two debriefed homes, a Conventional pre-approval, and tours
dated only in the past. A future tour would have made the nightly reminder job
email `demo.buyer@example.com` from the real sending domain, and bounces cost
sender reputation. It uses a random password that isn't in the repo, verified
with the admin API rather than by signing in with it.

Two things turned up while doing it. The request's premise was only partly
right — the move-up demo, Jordan, was still there with a purchase at Loan
Approval, so a buyer demo existed, just not a plain one. And **the repository
is public, and `scripts/seed.ts` contains the demo password** used by Jordan's
and Alex's accounts on the production app. Row-level security keeps anyone
using them to fake data — the client's rows are unreachable — but it is still a
signed-in session inside the live tenant, able to do what a client can, such as
setting a partner email that tour reminders would then be sent to.

### Also day 8 — a run sheet for the meeting, and an overstatement caught writing it

The meeting on 2026-09-15 now covers both review pages: the dashboard packet
and the inspection agent review the other session built. That is eighteen
questions, which won't fit, so the run sheet orders them by what only the
broker can decide and what it unblocks:

- A five-minute live demo first, on Sam Buyer — the warning shown both ways.
- What clients see today, since it's live: wire wording and showing escrow's
  number, then license and brokerage disclosure (the fields exist, so it can
  ship days after an answer), then note fields and Fair Housing.
- The inspection agent, starting with the brokerage's AI-use policy, because
  a "no" there makes the questions after it moot.
- Overlaps asked once: E&O for both products together, and discoverability of
  private notes (packet 05) with that of saved call prep (inspection 12).
- Stage copy, coordination copy, the HOA estimate and two practice-standard
  questions handed over for review afterward; attorney questions reduced to
  asking whether the brokerage has counsel.
- A 20-minute version of five core asks, and a note on capture: the packet
  can't save, so its text box gets copied before the tab closes, while the
  inspection page saves for its owner and can be read back.

Run sheet: https://claude.ai/artifact/Sw4dV4ngrWRfbVozfg2Qxy

**Writing the opening line surfaced a claim nobody had checked.** The packet
said the pilot client "signs into it most days" and had been reading the stage
copy "for weeks"; the docs said "daily." The visit tracking built to answer
exactly this question says otherwise: the client opened the dashboard on **one day,
September 11** — ten page views — and not since, with one further sign-in on
the 12th that recorded no views. And because a client only sees the explainer
for their current stage, a house-hunting client has seen one of the fourteen,
and no real client ever reached the wire-funds line.

Every one of those overstatements made the exposure sound worse than it was,
which is a comfortable direction to be wrong in and still wrong — and one of
them was in the document the broker opens tomorrow. Corrected in the packet,
in `project.md`, and in the open items below; the Day 8 description of the
email's framing is left as written, as a record of how it was pitched.

Claims about what clients do should be read from `client_page_views`, not
recalled. It is also the pilot's retention signal, and one visit in four days
is worth watching — though a buyer between tours may simply have had no reason
to look.

### Not yet done

- Pilot cohort is one client deep (the pilot client, onboarded 2026-09-10) and
  still has no move-up buyer — the case the hypothesis actually turns on.
  Two more clients needed before the thresholds mean anything.
- **The packet is with the managing broker (sent 2026-09-14), awaiting a
  response** — on its second attempt, after the first failed to save or
  take their name. Watch whether the fixed page gets used or the answers
  come back as an email reply; either is fine, but it says something about
  whether a form was the right shape for this at all. Item 01 is fixed on our side and needs only their wording.
  The other five genuinely block on them. Actual exposure is small — one
  client, house hunting, one visit (2026-09-11) — but it grows the day a
  client goes under contract. Being covered in the 2026-09-15 meeting.
- **Demo passwords are published.** The repo is public and
  `scripts/seed.ts` holds the password for Jordan's and Alex's production
  logins. Rotate both and move the seed password out of source. Sam Buyer's
  is random and not in the repo.
- Three demo profiles (Jordan, Alex, Sam) live in production next to the real
  client, and their page views land in the same visit data. Exclude them by
  name when reading retention.
- The agent phone is still empty until Britton enters it on the Escrow &
  wiring card; until then the warning says "call Britton directly" with no
  number, and reminders stay unsigned.
- `TransactionCard` (`src/components/transaction-card.tsx`) is dead code —
  nothing imports it. Either delete it or wire it up; leaving it invites
  exactly the mistake it already caused, which was reasoning about client-
  facing behaviour from a component no client can reach.
- The `preapproval` table still carries the columns from when it modelled
  the loan (`loan_amount`, `down_payment`, `assistance_percent`,
  `assistance_deferred`). Nothing client-facing reads them; they were left
  in place rather than dropping columns on a live table with a real client
  on it. Worth a cleanup once it is clear nothing is wanted back.
- Brokerage name/DRE number in the `agents` row are still placeholders.
- **Email now comes from two places, which clients will notice.** Tour
  reminders go through Resend as `updates@brittontaylor.com`; Supabase's
  auth email (invites, password resets) still goes through the personal
  Gmail App Password, so those arrive from a gmail.com address with a
  "via" header. Pointing Supabase's SMTP at Resend as well would put one
  consistent sender in front of clients — same settings page, small
  change. The 2026-10-26 reminder now covers only this half.
- A tour edited *after* its reminder has gone out doesn't re-send —
  the idempotency guard treats it as already sent. Deliberate for now
  (it's what stops double-emails); revisit if plans change often enough
  in practice to matter.
- An auth user with no `profiles` row crashes the client dashboard with
  a raw server error instead of anything useful. Can't happen through
  normal onboarding — `inviteClient` rolls back a failed profile insert
  — and it was only reachable by constructing it during debugging, but
  it's an ugly failure for a cheap fix.
- Visit data is collected per client but there's no cohort view — the
  median across clients is a manual read for now.
- The inspection agent is **designed but not started** — see
  `strategy.md`. No open design questions. Deferred: independent
  contractor cost ranges and the standalone brief. Precondition: broker
  and real estate attorney review of the call narrative's framing rules —
  broker half scheduled for 2026-09-15, attorney half not yet arranged.
- The inspection agent review page has not been seen rendered, and has not
  been tried from a shared link by someone outside Britton's organization.
- **Applying a migration is a manual paste, and it has now failed
  silently once.** The Supabase CLI is linked to the project but not
  logged in, so `supabase db push` does nothing rather than erroring in a
  way anyone would notice. `supabase login` once would make pushes real
  and tracked; until then every migration is copied into the dashboard
  SQL editor by hand, with no record of what has run.
- The "recent tours — got a debrief written?" nudge on `/agent` is still
  date-based rather than a real gap calculation. Now that pending
  debriefs are computed properly, that nudge could use the same helper
  instead of its own heuristic.
- Dark mode colors are defined but not wired up (nothing sets the `.dark`
  class), so the app is light-only.
