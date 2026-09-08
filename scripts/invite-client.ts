// Invites a real client: creates their auth user via Supabase's invite-by-email
// flow (they set their own password from the email link) and their profiles row.
// Transactions, homes_seen, tours, inspection_items, and preapproval still go
// through Supabase Studio for v1 (see spec section 4a).
//
// Usage: npm run invite-client -- "client@example.com" "Jane Client" "555-0100"

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

process.loadEnvFile?.(".env.local");

const [, , email, fullName, phone] = process.argv;

if (!email || !fullName) {
  console.error('Usage: npm run invite-client -- "client@example.com" "Jane Client" "555-0100"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id")
    .limit(1)
    .single();
  if (agentError || !agent) {
    throw new Error("No agent row found — run `npm run seed` first or create one in Studio.");
  }

  const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    email,
    { data: { full_name: fullName } },
  );
  if (inviteError) throw inviteError;

  const { error: profileError } = await supabase.from("profiles").insert({
    id: invited.user.id,
    agent_id: agent.id,
    full_name: fullName,
    phone: phone ?? null,
  });
  if (profileError) throw profileError;

  console.log(`Invited ${fullName} <${email}>. They'll get an email to set their password.`);
  console.log("Now add their transaction(s) in Supabase Studio.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
