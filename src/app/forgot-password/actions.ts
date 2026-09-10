"use server";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export async function sendResetLink(email: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Enter your email address." };

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: `${siteUrl}/auth/callback`,
  });

  // Deliberately not reporting "no account with that email" — that would let
  // anyone test whether a given person is a client of Britton's.
  if (error && !/user not found/i.test(error.message)) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
