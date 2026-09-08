import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Profile,
  Transaction,
  Tour,
  InspectionItem,
  HomeSeen,
} from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type ClientWithTransactions = Profile & { transactions: Transaction[] };

export async function getAgentClients(supabase: Client): Promise<ClientWithTransactions[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, transactions(*)")
    .eq("is_agent", false)
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as ClientWithTransactions[];
}

export async function getClientProfile(supabase: Client, clientId: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", clientId).single();
  if (error || !data) throw new Error("Client not found");
  return data;
}

export async function getClientTours(supabase: Client, clientId: string): Promise<Tour[]> {
  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .eq("client_id", clientId)
    .order("scheduled_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getClientHomesSeen(supabase: Client, clientId: string): Promise<HomeSeen[]> {
  const { data, error } = await supabase.rpc("agent_list_homes_seen", { p_client_id: clientId });
  if (error) throw error;
  return data ?? [];
}

export type TourWithClient = Tour & { profiles: { full_name: string } | null };

export async function getAgentTours(supabase: Client): Promise<TourWithClient[]> {
  const { data, error } = await supabase
    .from("tours")
    .select("*, profiles(full_name)")
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TourWithClient[];
}

export async function getInspectionItemsForTransactions(
  supabase: Client,
  transactionIds: string[],
): Promise<InspectionItem[]> {
  if (transactionIds.length === 0) return [];
  const { data, error } = await supabase
    .from("inspection_items")
    .select("*")
    .in("transaction_id", transactionIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
