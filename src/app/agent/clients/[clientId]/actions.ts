"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getCurrentProfile } from "@/lib/data/dashboard";
import { getSiteUrl } from "@/lib/site-url";
import { sendTourReminder } from "@/lib/email/send-tour-reminder";
import { sendTourRecap } from "@/lib/email/send-tour-recap";
import type {
  InterestLevel,
  ItemImportance,
  KeyDates,
  TransactionType,
} from "@/lib/supabase/database.types";

function ok(clientId: string) {
  // 'layout' revalidates every sub-route (overview, tours, homes, inspections)
  // sharing this client's layout, not just the overview page itself.
  revalidatePath(`/agent/clients/${clientId}`, "layout");
  revalidatePath("/agent");
}

export async function updateStage(clientId: string, transactionId: string, stageKey: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("agent_advance_stage", {
    p_transaction_id: transactionId,
    p_stage_key: stageKey,
  });
  if (error) throw new Error(error.message);
  ok(clientId);
}

/**
 * Sends the day-before reminder by hand. The nightly cron covers the normal
 * case, but a tour booked after that run would otherwise get no reminder at
 * all — which is exactly the situation the evening before a tour booked
 * today.
 */
export async function sendReminderNow(
  clientId: string,
  tourDate: string,
): Promise<{ ok: true; recipients: string[] } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const profile = await getCurrentProfile(supabase, user.id);
  if (!profile.is_agent) return { ok: false, error: "Not authorized" };

  // RLS decides whether this client is theirs before the service-role client
  // is used to read the client's email address and write the reminder row.
  const { error: ownership } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", clientId)
    .single();
  if (ownership) return { ok: false, error: "Not your client" };

  const admin = createServiceRoleClient();
  const siteUrl = await getSiteUrl();
  const outcome = await sendTourReminder(admin, { clientId, tourDate, siteUrl });

  if (outcome.status === "skipped") return { ok: false, error: outcome.reason };

  ok(clientId);
  return { ok: true, recipients: outcome.recipients };
}

/**
 * Emails the client the recap of one tour day, once every home from it is
 * written up. Always the agent's click — see sendTourRecap for why it never
 * fires on its own.
 */
export async function sendRecapNow(
  clientId: string,
  tourDate: string,
): Promise<{ ok: true; recipients: string[] } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const profile = await getCurrentProfile(supabase, user.id);
  if (!profile.is_agent) return { ok: false, error: "Not authorized" };

  // RLS decides whether this client is the caller's before the service-role
  // client is used to read their email address and write the recap row.
  const { error: ownership } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", clientId)
    .single();
  if (ownership) return { ok: false, error: "Not your client" };

  const outcome = await sendTourRecap(createServiceRoleClient(), {
    clientId,
    tourDate,
    siteUrl: await getSiteUrl(),
  });
  if (outcome.status === "skipped") return { ok: false, error: outcome.reason };

  ok(clientId);
  return { ok: true, recipients: outcome.recipients };
}

export async function createTransaction(
  clientId: string,
  transaction: {
    type: TransactionType;
    propertyAddress: string | null;
    stageKey: string | null;
    linkToTransactionId: string | null;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("agent_create_transaction", {
    p_client_id: clientId,
    p_type: transaction.type,
    p_property_address: transaction.propertyAddress,
    p_stage_key: transaction.stageKey,
    p_link_to_transaction_id: transaction.linkToTransactionId,
  });
  if (error) throw new Error(error.message);
  // The client's own dashboard nav changes shape once a transaction exists
  // (a buy leg adds Tours/Homes Seen), so revalidate their tree too.
  revalidatePath("/dashboard", "layout");
  ok(clientId);
}

export async function updateKeyDates(clientId: string, transactionId: string, keyDates: KeyDates) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("agent_update_key_dates", {
    p_transaction_id: transactionId,
    p_key_dates: keyDates,
  });
  if (error) throw new Error(error.message);
  ok(clientId);
}

/**
 * Escrow contact for one transaction, plus the agent's own number, saved
 * together because they're entered together — both feed the wire-fraud
 * warning the client sees.
 */
export async function saveEscrowContact(
  clientId: string,
  transactionId: string,
  contact: {
    company: string | null;
    officer: string | null;
    phone: string | null;
    agentPhone: string | null;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("agent_update_escrow_contact", {
    p_transaction_id: transactionId,
    p_company: contact.company,
    p_officer: contact.officer,
    p_phone: contact.phone,
  });
  if (error) throw new Error(error.message);

  const { error: phoneError } = await supabase.rpc("agent_update_my_phone", {
    p_phone: contact.agentPhone,
  });
  if (phoneError) throw new Error(phoneError.message);

  revalidatePath("/dashboard", "layout");
  // The agent's number is shown to every client, not just this one.
  revalidatePath("/agent", "layout");
  ok(clientId);
}

export async function savePreapproval(
  clientId: string,
  preapproval: {
    purchasePrice: number;
    percentDown: number;
    loanType: string | null;
    rate: number;
    lender: string | null;
    hoaMonthly: number;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("agent_upsert_preapproval", {
    p_client_id: clientId,
    p_purchase_price: preapproval.purchasePrice,
    p_percent_down: preapproval.percentDown,
    p_loan_type: preapproval.loanType,
    p_rate: preapproval.rate,
    p_lender: preapproval.lender,
    p_hoa_monthly: preapproval.hoaMonthly,
  });
  if (error) throw new Error(error.message);
  // The client's Financials page and affordability calculator read this.
  revalidatePath("/dashboard", "layout");
  ok(clientId);
}

export async function deletePreapproval(clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("agent_delete_preapproval", { p_client_id: clientId });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "layout");
  ok(clientId);
}

export async function saveTour(
  clientId: string,
  tour: { id: string | null; address: string; scheduledAt: string; notes: string | null },
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("agent_upsert_tour", {
    p_tour_id: tour.id,
    p_client_id: clientId,
    p_address: tour.address,
    p_scheduled_at: tour.scheduledAt,
    p_notes: tour.notes,
  });
  if (error) throw new Error(error.message);
  ok(clientId);
}

export async function deleteTour(clientId: string, tourId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("agent_delete_tour", { p_tour_id: tourId });
  if (error) throw new Error(error.message);
  ok(clientId);
}

export async function saveInspectionItem(
  clientId: string,
  item: {
    id: string | null;
    transactionId: string;
    item: string;
    importance: ItemImportance;
    negotiationNote: string | null;
    resolved: boolean;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("agent_upsert_inspection_item", {
    p_item_id: item.id,
    p_transaction_id: item.transactionId,
    p_item: item.item,
    p_importance: item.importance,
    p_negotiation_note: item.negotiationNote,
    p_resolved: item.resolved,
  });
  if (error) throw new Error(error.message);
  ok(clientId);
}

export async function deleteInspectionItem(clientId: string, itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("agent_delete_inspection_item", { p_item_id: itemId });
  if (error) throw new Error(error.message);
  ok(clientId);
}

export async function saveDebriefInterest(
  clientId: string,
  home: {
    id: string | null;
    address: string;
    clientNotes: string | null;
    privateNotes: string | null;
    interestLevel: InterestLevel | null;
    seenAt: string;
    /** Set when this debrief is being written from a tour that has happened. */
    tourId?: string | null;
  },
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("agent_upsert_home_debrief", {
    p_home_id: home.id,
    p_client_id: clientId,
    p_address: home.address,
    p_client_notes: home.clientNotes,
    p_private_notes: home.privateNotes,
    p_interest_level: home.interestLevel,
    p_seen_at: home.seenAt,
  });
  if (error) throw new Error(error.message);

  // Linking is a second call rather than another parameter on the upsert, and
  // a failure here is deliberately not thrown: the debrief itself is already
  // saved, and an unlinked tour just stays on the needs-a-debrief list, where
  // matching address and date will settle it anyway. Throwing would report a
  // write that actually succeeded as a failure.
  if (home.tourId && data?.id) {
    await supabase.rpc("agent_link_tour_to_home", {
      p_tour_id: home.tourId,
      p_home_id: data.id,
    });
  }

  ok(clientId);
}
