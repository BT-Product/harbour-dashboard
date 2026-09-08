import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile, StageDefinition, Transaction } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export async function getCurrentProfile(supabase: Client, userId: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) throw new Error("Profile not found");
  return data;
}

export async function getClientTransactions(
  supabase: Client,
  clientId: string,
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getStageDefinitions(
  supabase: Client,
  transactionType?: "buy" | "sell",
): Promise<StageDefinition[]> {
  let query = supabase.from("stage_definitions").select("*").order("sort_order", { ascending: true });
  if (transactionType) query = query.eq("transaction_type", transactionType);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export function findStage(
  stages: StageDefinition[],
  type: "buy" | "sell",
  stageKey: string,
): StageDefinition | undefined {
  return stages.find((s) => s.transaction_type === type && s.stage_key === stageKey);
}

/** The client's primary transaction: the buy leg if one exists, else whatever they have. */
export function primaryTransaction(transactions: Transaction[]): Transaction | undefined {
  return transactions.find((t) => t.type === "buy") ?? transactions[0];
}

export function linkedTransaction(
  transactions: Transaction[],
  from: Transaction | undefined,
): Transaction | undefined {
  if (!from?.linked_transaction_id) return undefined;
  return transactions.find((t) => t.id === from.linked_transaction_id);
}
