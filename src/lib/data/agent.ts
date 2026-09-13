import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Profile,
  Transaction,
  Tour,
  InspectionItem,
  HomeSeen,
  Preapproval,
  TourReminder,
} from "@/lib/supabase/database.types";
import { dateKey } from "@/lib/date-grouping";

type Client = SupabaseClient<Database>;

export type ClientWithTransactions = Profile & { transactions: Transaction[] };

/**
 * A client is a move-up buyer when they're carrying both sides at once —
 * that's the case the product is built around, so it's grouped first.
 * "unassigned" covers a client who exists but has no transaction yet, so
 * they never silently drop off the list.
 */
export type ClientGroup = "move_up" | "buyer" | "seller" | "unassigned";

export const CLIENT_GROUPS: { key: ClientGroup; label: string }[] = [
  { key: "move_up", label: "Move-up buyers" },
  { key: "buyer", label: "Buyers" },
  { key: "seller", label: "Sellers" },
  { key: "unassigned", label: "No transactions" },
];

export function clientGroup(client: ClientWithTransactions): ClientGroup {
  const hasBuy = client.transactions.some((t) => t.type === "buy");
  const hasSell = client.transactions.some((t) => t.type === "sell");
  if (hasBuy && hasSell) return "move_up";
  if (hasBuy) return "buyer";
  if (hasSell) return "seller";
  return "unassigned";
}

export function groupClients(
  clients: ClientWithTransactions[],
): Map<ClientGroup, ClientWithTransactions[]> {
  const groups = new Map<ClientGroup, ClientWithTransactions[]>();
  for (const client of clients) {
    const key = clientGroup(client);
    const bucket = groups.get(key);
    if (bucket) bucket.push(client);
    else groups.set(key, [client]);
  }
  return groups;
}

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

/** Tour dates a day-before reminder has already gone out for, as YYYY-MM-DD. */
export async function getClientReminderDates(
  supabase: Client,
  clientId: string,
): Promise<Map<string, TourReminder>> {
  const { data, error } = await supabase
    .from("tour_reminders")
    .select("*")
    .eq("client_id", clientId);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.tour_date, row]));
}

export async function getClientPreapproval(
  supabase: Client,
  clientId: string,
): Promise<Preapproval | null> {
  const { data, error } = await supabase
    .from("preapproval")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * A visit is a run of page views with no gap longer than this. The raw
 * table stores views; the visit definition lives here so it can be changed
 * later without invalidating data already collected.
 */
const VISIT_GAP_MS = 30 * 60 * 1000;

export type VisitStats = {
  lastVisitAt: string | null;
  visitsLast7Days: number;
  visitsPrior7Days: number;
  viewsLast7Days: number;
};

/** Collapses ascending view timestamps into visit start times. */
export function collapseToVisits(viewedAt: string[]): Date[] {
  const visits: Date[] = [];
  let previous: number | null = null;

  for (const iso of viewedAt) {
    const at = new Date(iso).getTime();
    if (previous === null || at - previous > VISIT_GAP_MS) visits.push(new Date(at));
    previous = at;
  }

  return visits;
}

export async function getClientVisitStats(
  supabase: Client,
  clientId: string,
): Promise<VisitStats> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("client_page_views")
    .select("viewed_at")
    .eq("client_id", clientId)
    .gte("viewed_at", since)
    .order("viewed_at", { ascending: true });
  if (error) throw error;

  const views = (data ?? []).map((row) => row.viewed_at);
  const visits = collapseToVisits(views);

  const now = Date.now();
  const weekAgo = now - 7 * 86_400_000;
  const twoWeeksAgo = now - 14 * 86_400_000;
  const at = (d: Date) => d.getTime();

  return {
    lastVisitAt: views.at(-1) ?? null,
    visitsLast7Days: visits.filter((v) => at(v) >= weekAgo).length,
    visitsPrior7Days: visits.filter((v) => at(v) >= twoWeeksAgo && at(v) < weekAgo).length,
    viewsLast7Days: views.filter((v) => new Date(v).getTime() >= weekAgo).length,
  };
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

/** Whitespace and casing vary between the tour and the debrief; the address doesn't. */
function addressKey(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Tours that have already happened and still have no debrief written.
 *
 * Derived at read time rather than stored, so the threshold stays a display
 * decision: a tour counts as done once its start time has passed. Two things
 * settle a tour. The explicit `home_seen_id` link, written when the debrief
 * is saved from the tour itself, is the real mechanism and survives the agent
 * editing the address while writing it up. Matching address and day is the
 * fallback, and it covers the two cases the link can't: tours scheduled
 * before this link existed, and debriefs typed from scratch with "Add
 * debrief" instead of from the tour.
 *
 * Newest first — the tour you just got back from is the one you're about to
 * write up.
 */
export function pendingDebriefTours(
  tours: Tour[],
  homes: Pick<HomeSeen, "address" | "seen_at">[],
  now: Date = new Date(),
): Tour[] {
  const debriefed = new Set(homes.map((h) => `${dateKey(h.seen_at)}|${addressKey(h.address)}`));

  return tours
    .filter((tour) => new Date(tour.scheduled_at).getTime() < now.getTime())
    .filter((tour) => tour.home_seen_id === null)
    .filter((tour) => !debriefed.has(`${dateKey(tour.scheduled_at)}|${addressKey(tour.address)}`))
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
}
