# Decisions

One line per decision: the date, what we assumed, what actually happened, and
what changed because of it. Added as things land, not retroactively.

- **2026-09-12** — Assumed a client should see what their pre-approval means after down payment assistance; the derived figure ($492,228) contradicted the lender's letter ($475,000); Harbour now shows the letter's number verbatim and never recomputes it.
- **2026-09-12** — Assumed visit tracking would first pay off as a retention metric; its first output was a usability finding (six sections opened in 37 seconds); the client overview was rebuilt as a dashboard.
- **2026-09-14** — Assumed the stage copy's biggest risk was tone; a codebase search found the only mention of wiring money was an instruction to do it, with no fraud warning; a warning shipped that day, ahead of the broker review.
- **2026-09-14** — Assumed escrow never emails wiring instructions; the agent corrected that they email a portal link; the warning now names the escrow officer and gives a verified phone number instead of claiming such emails don't exist.
- **2026-09-14** — Assumed the review packet's readers could record answers in it; the broker could neither save nor type their name, and in the end replied by pasted email; pages built for outside readers now assume no saving at all.
- **2026-09-15** — Assumed the pilot client used the dashboard daily; visit data showed one day; every document was corrected, and behaviour claims now come from `client_page_views`.
- **2026-09-22** — Assumed an HOA-adjusted affordability estimate helped buyers, since it only ever lowered the lender's number; the broker ruled out any agent-side money calculation, because amortisation is the lender's licensed job; the calculator is being removed, and the same figures will be requested from the lender instead.
- **2026-09-22** — Assumed agent notes were Harbour's to keep; the broker's answer is that every note carries a DRE obligation to file it with the broker, who owns the file; Harbour becomes a source of record that must export, and client removal can no longer delete data silently.
- **2026-09-22** — Assumed clients want to know which activity is underway (inspection, appraisal, loan approval); the broker's view is that they need to know which contingencies are released and which still protect them; the stage model is being rebuilt around the CAR contingency removal form.
