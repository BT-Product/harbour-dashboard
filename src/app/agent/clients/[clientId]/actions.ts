"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { InterestLevel, ItemImportance, KeyDates } from "@/lib/supabase/database.types";

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

export async function updateKeyDates(clientId: string, transactionId: string, keyDates: KeyDates) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("agent_update_key_dates", {
    p_transaction_id: transactionId,
    p_key_dates: keyDates,
  });
  if (error) throw new Error(error.message);
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
