-- Stage definitions for both transaction types. Cheap to seed now even though
-- only buy-side UI ships in v1 (spec section 3).
--
-- NOTE: explainer copy below is a first draft for internal testing only.
-- Needs broker review before any real client sees it (spec section 8).

insert into stage_definitions (stage_key, transaction_type, sort_order, label, explainer) values
  ('offer_accepted', 'buy', 1, 'Offer Accepted', 'Your offer has been accepted. Next, the home will be inspected and your lender will begin final underwriting. No action needed from you yet beyond staying reachable.'),
  ('inspection', 'buy', 2, 'Inspection', 'A licensed inspector is examining the property for issues. Once the report is in, we will review it together and decide what, if anything, to negotiate with the seller.'),
  ('appraisal', 'buy', 3, 'Appraisal', 'Your lender is having the home independently valued to confirm it supports the loan amount. This is handled by the lender; no action needed from you.'),
  ('loan_approval', 'buy', 4, 'Loan Approval', 'Your lender is finalizing full underwriting approval on your loan. You may be asked for a few more documents during this window — respond quickly to keep things on schedule.'),
  ('clear_to_close', 'buy', 5, 'Clear to Close', 'All conditions have been met. Closing documents are being prepared. You will need to schedule a final walkthrough and wire your closing funds.'),
  ('closed', 'buy', 6, 'Closed', 'The purchase is complete and recorded. Keys are yours.'),

  ('prep', 'sell', 1, 'Prep', 'Getting the home ready to list — repairs, staging, and photography. We will confirm a target list date together.'),
  ('listed', 'sell', 2, 'Listed', 'Your home is live on the market. We are tracking showings and buyer interest.'),
  ('offer_accepted', 'sell', 3, 'Offer Accepted', 'You have accepted a buyer''s offer. Next, the buyer''s inspection and lender process begin.'),
  ('inspection', 'sell', 4, 'Inspection', 'The buyer is having the home inspected. We may receive repair requests to negotiate.'),
  ('appraisal', 'sell', 5, 'Appraisal', 'The buyer''s lender is confirming the home''s value supports their loan.'),
  ('clear_to_close', 'sell', 6, 'Clear to Close', 'All conditions are met on the buyer''s side. Closing documents are being prepared.'),
  ('closed', 'sell', 7, 'Closed', 'The sale is complete and recorded.')
on conflict (transaction_type, stage_key) do nothing;
