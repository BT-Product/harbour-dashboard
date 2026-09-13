"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getCurrentProfile } from "@/lib/data/dashboard";
import { getSiteUrl } from "@/lib/site-url";
import { sendTourReminder } from "@/lib/email/send-tour-reminder";
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

export async function savePreapproval(
  clientId: string,
  preapproval: {
    loanAmount: number;
    downPayment: number;
    rate: number;
    lender: string | null;
    hoaMonthly: number;
    assistancePercent: number;
    assistanceDeferred: boolean;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("agent_upsert_preapproval", {
    p_client_id: clientId,
    p_loan_amount: preapproval.loanAmount,
    p_down_payment: preapproval.downPayment,
    p_rate: preapproval.rate,
    p_lender: preapproval.lender,
    p_hoa_monthly: preapproval.hoaMonthly,
    p_assistance_percent: preapproval.assistancePercent,
    p_assistance_deferred: preapproval.assistanceDeferred,
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
  },
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("agent_upsert_home_debrief", {
    p_home_id: home.id,
    p_client_id: clientId,
    p_address: home.address,
    p_client_notes: home.clientNotes,
    p_private_notes: home.privateNotes,
    p_interest_level: home.interestLevel,
    p_seen_at: home.seenAt,
  });
  if (error) throw new Error(error.message);
  ok(clientId);
}
