// Seeds demo data for local testing: one agent (you) and three demo clients
// covering the move-up buyer, pure buyer, and pure seller cases.
//
// This uses admin.createUser with a fixed password (not the invite-by-email
// flow) because these are fake accounts for you to click through, not real
// client onboarding. For real clients, use scripts/invite-client.ts instead.
//
// Usage: npm run seed

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

process.loadEnvFile?.(".env.local");

const DEMO_PASSWORD = "harbour-demo-2026";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createDemoUser(email: string, fullName: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`Creating user ${email}: ${error.message}`);
  return data.user.id;
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

async function main() {
  console.log("Creating agent tenant row…");
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .insert({
      name: "Britton Taylor",
      email: "BT@brittontaylor.com",
      brokerage: "TBD Brokerage",
      dre_number: "TBD",
    })
    .select()
    .single();
  if (agentError) throw agentError;
  console.log(`  agent id: ${agent.id}`);

  console.log("Creating auth users…");
  const agentUserId = await createDemoUser("BT@brittontaylor.com", "Britton Taylor");
  const moveUpId = await createDemoUser("demo.moveup@example.com", "Jordan Move-Up");
  const buyerId = await createDemoUser("demo.buyer@example.com", "Sam Buyer");
  const sellerId = await createDemoUser("demo.seller@example.com", "Alex Seller");

  console.log("Creating profiles…");
  const { error: profilesError } = await supabase.from("profiles").insert([
    { id: agentUserId, agent_id: agent.id, full_name: "Britton Taylor", is_agent: true },
    { id: moveUpId, agent_id: agent.id, full_name: "Jordan Move-Up", phone: "555-0101" },
    { id: buyerId, agent_id: agent.id, full_name: "Sam Buyer", phone: "555-0102" },
    { id: sellerId, agent_id: agent.id, full_name: "Alex Seller", phone: "555-0103" },
  ]);
  if (profilesError) throw profilesError;

  console.log("Creating move-up buyer's two linked transactions…");
  const { data: sellTxn, error: sellTxnError } = await supabase
    .from("transactions")
    .insert({
      client_id: moveUpId,
      agent_id: agent.id,
      type: "sell",
      status: "active",
      current_stage_key: "listed",
      property_address: "127 Birchwood Ln",
      key_dates: { contract_date: daysFromNow(-20), coe_date: daysFromNow(38) },
    })
    .select()
    .single();
  if (sellTxnError) throw sellTxnError;

  const { data: buyTxn, error: buyTxnError } = await supabase
    .from("transactions")
    .insert({
      client_id: moveUpId,
      agent_id: agent.id,
      type: "buy",
      status: "active",
      current_stage_key: "inspection",
      property_address: "482 Willow Creek Dr",
      key_dates: { contract_date: daysFromNow(-5), coe_date: daysFromNow(30) },
      linked_transaction_id: sellTxn.id,
    })
    .select()
    .single();
  if (buyTxnError) throw buyTxnError;

  await supabase.from("transactions").update({ linked_transaction_id: buyTxn.id }).eq("id", sellTxn.id);

  console.log("Creating pure buyer's transaction…");
  const { data: buyerTxn, error: buyerTxnError } = await supabase
    .from("transactions")
    .insert({
      client_id: buyerId,
      agent_id: agent.id,
      type: "buy",
      status: "active",
      current_stage_key: "offer_accepted",
      property_address: "88 Sunset Terrace",
      key_dates: { contract_date: daysFromNow(-2), coe_date: daysFromNow(40) },
    })
    .select()
    .single();
  if (buyerTxnError) throw buyerTxnError;

  console.log("Creating pure seller's transaction…");
  const { error: sellerTxnError } = await supabase.from("transactions").insert({
    client_id: sellerId,
    agent_id: agent.id,
    type: "sell",
    status: "active",
    current_stage_key: "prep",
    property_address: "930 Ridgeline Ave",
    key_dates: {},
  });
  if (sellerTxnError) throw sellerTxnError;

  console.log("Creating homes_seen debriefs…");
  // homes_seen.Insert is typed as `never` on purpose (see database.types.ts) —
  // app code must go through agent_upsert_home_debrief, which the service
  // role can't call (it has no auth.uid()). The service role bypasses RLS
  // and grants entirely, so a direct insert here is legitimate; the `any`
  // cast just steps around the same type-level guardrail that protects the
  // real app's browser/server clients.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: homesError } = await (supabase.from("homes_seen") as any).insert([
    {
      client_id: moveUpId,
      address: "482 Willow Creek Dr",
      client_notes: "Great light in the kitchen, primary suite is a bit small but workable.",
      private_notes: "Seller relocating for work, motivated to close by end of month.",
      interest_level: "strong",
      seen_at: daysFromNow(-8),
      debriefed_at: daysFromNow(-8),
    },
    {
      client_id: moveUpId,
      address: "310 Aspen Court",
      client_notes: "Nice yard but busy street noise, backup option only.",
      private_notes: "Overpriced for the street, would need a price cut to be competitive.",
      interest_level: "pass",
      seen_at: daysFromNow(-14),
      debriefed_at: daysFromNow(-14),
    },
    {
      client_id: buyerId,
      address: "88 Sunset Terrace",
      client_notes: "Loved the layout, updated kitchen, close to schools.",
      private_notes: "Multiple offers expected, recommend coming in strong with a clean offer.",
      interest_level: "strong",
      seen_at: daysFromNow(-3),
      debriefed_at: daysFromNow(-3),
    },
    {
      client_id: buyerId,
      address: "44 Harbor View Rd",
      client_notes: "Good bones but needs a new roof — factor that into any offer.",
      private_notes: null,
      interest_level: "maybe",
      seen_at: daysFromNow(-10),
      debriefed_at: daysFromNow(-9),
    },
  ]);
  if (homesError) throw homesError;

  console.log("Creating tours…");
  const { error: toursError } = await supabase.from("tours").insert([
    { client_id: moveUpId, address: "12 Maple Row", scheduled_at: daysFromNow(3) },
    { client_id: buyerId, address: "501 Crestview Dr", scheduled_at: daysFromNow(2) },
    { client_id: buyerId, address: "88 Sunset Terrace", scheduled_at: daysFromNow(-3) },
  ]);
  if (toursError) throw toursError;

  console.log("Creating inspection items…");
  const { error: inspectionError } = await supabase.from("inspection_items").insert([
    {
      transaction_id: buyTxn.id,
      item: "Roof shows granule loss, ~15 years old",
      importance_to_client: "important",
      negotiation_note: "Requesting $4,000 credit or repair before close.",
      resolved: false,
    },
    {
      transaction_id: buyTxn.id,
      item: "Minor plumbing leak under kitchen sink",
      importance_to_client: "minor",
      negotiation_note: "Seller agreed to fix before close.",
      resolved: true,
    },
    {
      transaction_id: buyerTxn.id,
      item: "No dedicated dealbreaker items found",
      importance_to_client: "minor",
      negotiation_note: null,
      resolved: true,
    },
  ]);
  if (inspectionError) throw inspectionError;

  console.log("Creating preapproval records…");
  const { error: preapprovalError } = await supabase.from("preapproval").insert([
    {
      client_id: moveUpId,
      loan_amount: 640000,
      down_payment: 160000,
      rate: 6.375,
      lender: "Coastal Home Lending",
      hoa_monthly: 0,
    },
    {
      client_id: buyerId,
      loan_amount: 480000,
      down_payment: 120000,
      rate: 6.625,
      lender: "Anchor Mortgage",
      hoa_monthly: 0,
    },
  ]);
  if (preapprovalError) throw preapprovalError;

  console.log("\nDone. Demo login (password for all): " + DEMO_PASSWORD);
  console.log("  Agent:      BT@brittontaylor.com  -> /agent/debrief");
  console.log("  Move-up:    demo.moveup@example.com");
  console.log("  Pure buyer: demo.buyer@example.com");
  console.log("  Pure seller: demo.seller@example.com");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
