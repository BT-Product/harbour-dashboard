"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PartnerFormState = { error: string | null; success: boolean };

export async function savePartner(
  _prevState: PartnerFormState,
  formData: FormData,
): Promise<PartnerFormState> {
  const name = String(formData.get("partner_name") || "").trim();
  const email = String(formData.get("partner_email") || "").trim();

  if (!name || !email) {
    return { error: "Enter both a name and an email.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_partner", {
    p_partner_name: name,
    p_partner_email: email,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/dashboard", "layout");
  return { error: null, success: true };
}
