"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/dashboard";

export type SetPasswordResult = { ok: true; redirectTo: string } | { ok: false; error: string };

const MIN_LENGTH = 8;

export async function setPassword(password: string): Promise<SetPasswordResult> {
  if (password.length < MIN_LENGTH) {
    return { ok: false, error: `Use at least ${MIN_LENGTH} characters.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "That link has expired. Ask for a new one." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };

  // Agents and clients have different homes, same as after a normal login.
  try {
    const profile = await getCurrentProfile(supabase, user.id);
    return { ok: true, redirectTo: profile.is_agent ? "/agent" : "/dashboard" };
  } catch {
    return { ok: true, redirectTo: "/dashboard" };
  }
}
