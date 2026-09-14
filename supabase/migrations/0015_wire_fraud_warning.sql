-- The product told clients to wire money and never warned them about fraud.
--
-- Searching the codebase for "wire" returned exactly one line: the buy-side
-- Clear to Close explainer, instructing the client to "schedule a final
-- walkthrough and wire your closing funds". The only time Harbour mentioned
-- moving money, it was telling a client to do it — with no warning anywhere
-- in the app.
--
-- That is the exact setup a wire-fraud attempt exploits: a buyer told by a
-- channel they trust that wiring is the next step, then sent instructions
-- that appear to come from escrow. It is the largest single consumer loss in
-- a residential purchase.
--
-- This is interim wording. The brokerage's own required language was asked
-- for in the broker review packet (item 01, sent 2026-09-14) and should
-- replace this verbatim rather than being merged with it. Shipping ahead of
-- that answer is deliberate: the gap is open while a real client uses the
-- app, and a warning is additive and strictly protective.
--
-- The explainer carries the safe version of the instruction. The standalone
-- warning a client actually reads is a component (WireFraudNotice), shown
-- from Offer Accepted onward — explainer text is narration and gets skimmed,
-- and the earnest money deposit is wired long before closing funds.

update stage_definitions
set explainer = 'All conditions have been met and closing documents are being prepared. You''ll schedule a final walkthrough, and escrow will send you wiring instructions for your closing funds. Before you send any money, call escrow at a number you already have — not one from an email or text — and confirm the details by voice.'
where transaction_type = 'buy' and stage_key = 'clear_to_close';
