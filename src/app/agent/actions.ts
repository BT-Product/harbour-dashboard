"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/dashboard";
import { normalizeDreNumber } from "@/lib/license";

/**
 * The agent's own phone and license number. Returns `{ ok, error }` rather
 * than throwing: Next scrubs thrown server action messages in production, and
 * "that isn't a valid DRE number" is one the agent has to read to fix.
 */
export async function saveMyDetails(details: {
  phone: string;
  dreNumber: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const profile = await getCurrentProfile(supabase, user.id);
  if (!profile.is_agent) return { ok: false, error: "Not authorized" };

  const license = normalizeDreNumber(details.dreNumber);
  if (!license.ok) return { ok: false, error: license.error };

  const { error: licenseError } = await supabase.rpc("agent_update_my_license", {
    p_dre_number: license.value,
  });
  if (licenseError) return { ok: false, error: licenseError.message };

  const { error: phoneError } = await supabase.rpc("agent_update_my_phone", {
    p_phone: details.phone.trim() || null,
  });
  if (phoneError) return { ok: false, error: phoneError.message };

  // Shown on every client page and every agent page's banner.
  revalidatePath("/agent", "layout");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
