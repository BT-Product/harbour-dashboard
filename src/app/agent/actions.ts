"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/dashboard";
import { normalizeDreNumber } from "@/lib/license";

type Result = { ok: true } | { ok: false; error: string };

const OFFICE_ADDRESS_MAX = 300;

async function requireAgent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "Not signed in" as const };
  const profile = await getCurrentProfile(supabase, user.id);
  if (!profile.is_agent) return { supabase, error: "Not authorized" as const };
  return { supabase, error: null };
}

function revalidateEverywhereAgentIsShown() {
  // The license line is on every client page; the sidebar and banner are on
  // every agent page.
  revalidatePath("/agent", "layout");
  revalidatePath("/dashboard", "layout");
}

/**
 * The agent's own profile fields. Returns `{ ok, error }` rather than
 * throwing: Next scrubs thrown server action messages in production, and
 * "that isn't a valid DRE number" is one the agent has to read to fix.
 */
export async function saveMyProfile(details: {
  phone: string;
  dreNumber: string;
  officeAddress: string;
}): Promise<Result> {
  const { supabase, error } = await requireAgent();
  if (error) return { ok: false, error };

  const license = normalizeDreNumber(details.dreNumber);
  if (!license.ok) return { ok: false, error: license.error };

  const officeAddress = details.officeAddress.trim();
  if (officeAddress.length > OFFICE_ADDRESS_MAX) {
    return { ok: false, error: `Keep the office address under ${OFFICE_ADDRESS_MAX} characters.` };
  }

  const { error: rpcError } = await supabase.rpc("agent_update_my_profile", {
    p_phone: details.phone.trim() || null,
    p_dre_number: license.value,
    p_office_address: officeAddress || null,
  });
  if (rpcError) return { ok: false, error: rpcError.message };

  revalidateEverywhereAgentIsShown();
  return { ok: true };
}

/**
 * Records the photo just uploaded to the agent's own storage folder, or clears
 * it. The database checks the URL points into that folder.
 */
export async function saveMyPhoto(photoUrl: string | null): Promise<Result> {
  const { supabase, error } = await requireAgent();
  if (error) return { ok: false, error };

  const { error: rpcError } = await supabase.rpc("agent_update_my_photo", {
    p_photo_url: photoUrl,
  });
  if (rpcError) return { ok: false, error: rpcError.message };

  revalidateEverywhereAgentIsShown();
  return { ok: true };
}
