"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getCurrentProfile } from "@/lib/data/dashboard";

/**
 * These two return a result object instead of throwing, unlike the rest of
 * the agent actions. Next scrubs server action error messages in production
 * — the client only ever sees a generic "an error occurred" — and both of
 * these fail for reasons the agent has to read to act on: an address Supabase
 * rejects, an email already invited, a mail send that didn't go through.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Adding and removing a client both need the service-role key, because
 * creating and deleting an auth.users row is an Admin API operation and
 * can't be done from a SECURITY DEFINER function like the other agent
 * writes. So authorization is checked here, explicitly, before the
 * service-role client is ever constructed — this is the one place in the
 * app where RLS isn't doing that work for us.
 */
async function requireAgent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const profile = await getCurrentProfile(supabase, user.id);
  if (!profile.is_agent) throw new Error("Not authorized");

  return { supabase, profile };
}

function revalidateClientLists() {
  // Deliberately the page, not the "layout" subtree: after a removal that
  // would re-render the deleted client's own route before the browser has
  // navigated away, and every query under it would fail.
  revalidatePath("/agent/clients");
  revalidatePath("/agent");
}

function message(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong";
}

export async function inviteClient(input: {
  fullName: string;
  email: string;
  phone: string | null;
  buying: boolean;
  selling: boolean;
  buyStageKey: string | null;
  buyAddress: string | null;
  sellStageKey: string | null;
  sellAddress: string | null;
}): Promise<ActionResult<{ clientId: string }>> {
  try {
    const { supabase, profile } = await requireAgent();

    const fullName = input.fullName.trim();
    const email = input.email.trim().toLowerCase();
    if (!fullName || !email) return { ok: false, error: "Name and email are both required" };

    const admin = createServiceRoleClient();

    // Invite rather than create-with-password: the client sets their own
    // password from the email link, so no password ever passes through here.
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
    });
    if (error) return { ok: false, error: error.message };

    const { error: profileError } = await admin.from("profiles").insert({
      id: data.user.id,
      agent_id: profile.agent_id,
      full_name: fullName,
      phone: input.phone?.trim() || null,
      is_agent: false,
    });

    if (profileError) {
      // A login with no profile row can't be recovered from in the UI and
      // blocks re-inviting the same address, so undo the invite.
      await admin.auth.admin.deleteUser(data.user.id);
      return { ok: false, error: profileError.message };
    }

    // Their transactions go through the agent's own session, not the
    // service role: agent_onboard_client re-derives authorization from
    // auth.uid() like every other agent write, and creates both legs of a
    // move-up client in one transaction so they can't end up half set up.
    const { error: onboardError } = await supabase.rpc("agent_onboard_client", {
      p_client_id: data.user.id,
      p_buying: input.buying,
      p_selling: input.selling,
      p_buy_stage_key: input.buyStageKey,
      p_buy_address: input.buyAddress,
      p_sell_stage_key: input.sellStageKey,
      p_sell_address: input.sellAddress,
    });

    if (onboardError) {
      // The client exists and is invited; only their transactions failed.
      // Say so rather than implying nothing happened — re-inviting the same
      // address would fail, and the fix is to add the transaction by hand.
      revalidateClientLists();
      return {
        ok: false,
        error: `${input.fullName} was invited, but setting up their transaction failed: ${onboardError.message}. Add it from their page.`,
      };
    }

    revalidateClientLists();
    return { ok: true, data: { clientId: data.user.id } };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function removeClient(clientId: string): Promise<ActionResult<null>> {
  try {
    const { supabase } = await requireAgent();

    // App rows go first, through the RPC, so the delete is one transaction
    // and authorization is re-derived database-side rather than trusted from
    // here. The auth user has to be last: deleting it cascades the profile
    // away and would strand everything that references it.
    const { error } = await supabase.rpc("agent_delete_client_data", { p_client_id: clientId });
    if (error) return { ok: false, error: error.message };

    const admin = createServiceRoleClient();
    const { error: authError } = await admin.auth.admin.deleteUser(clientId);
    if (authError) {
      return {
        ok: false,
        error: `Client data was removed, but their login could not be deleted: ${authError.message}`,
      };
    }

    revalidateClientLists();
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}
