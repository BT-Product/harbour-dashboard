"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { InterestLevel } from "@/lib/supabase/database.types";

export type DebriefFormState = { error: string | null; success: boolean };

export async function saveDebrief(
  _prevState: DebriefFormState,
  formData: FormData,
): Promise<DebriefFormState> {
  const supabase = await createClient();

  const homeId = String(formData.get("home_id") || "") || null;
  const clientId = String(formData.get("client_id") || "");
  const address = String(formData.get("address") || "").trim();
  const clientNotes = String(formData.get("client_notes") || "").trim() || null;
  const privateNotes = String(formData.get("private_notes") || "").trim() || null;
  const interestLevel = (String(formData.get("interest_level") || "") || null) as
    | InterestLevel
    | null;
  const seenAtRaw = String(formData.get("seen_at") || "");

  if (!clientId || !address) {
    return { error: "Pick a client and enter an address.", success: false };
  }

  const seenAt = seenAtRaw ? new Date(seenAtRaw).toISOString() : new Date().toISOString();

  const { error } = await supabase.rpc("agent_upsert_home_debrief", {
    p_home_id: homeId,
    p_client_id: clientId,
    p_address: address,
    p_client_notes: clientNotes,
    p_private_notes: privateNotes,
    p_interest_level: interestLevel,
    p_seen_at: seenAt,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/agent/debrief");
  return { error: null, success: true };
}
