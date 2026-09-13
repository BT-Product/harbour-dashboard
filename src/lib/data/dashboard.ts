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

/**
 * What to call a transaction that may not have a property yet. A buyer who
 * is still house hunting has no address, and "—" reads like missing data
 * rather than the normal, expected state that it is.
 */
export function transactionLabel(transaction: Transaction): string {
  if (transaction.property_address) return transaction.property_address;
  return transaction.type === "buy" ? "Home search" : "Their home";
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

/**
 * The one-line orientation at the top of the dashboard. A client signing in
 * should be able to read a single sentence and know where they stand — the
 * first version of this page opened with a stage badge and an explainer,
 * which assumed they already knew what stage meant.
 */
export function overviewStatus(
  transactions: Transaction[],
  stages: StageDefinition[],
  nextTourAt: string | null,
): { headline: string; detail: string } {
  const buy = transactions.find((t) => t.type === "buy");
  const sell = transactions.find((t) => t.type === "sell");

  if (!buy && !sell) {
    return {
      headline: "Your dashboard is being set up",
      detail: "Your agent is adding your transaction. There'll be more here shortly.",
    };
  }

  // Returns the phrase alone ("in 34 days") so callers can say *what* is
  // closing. Two bare "closing in N days" side by side told a move-up client
  // nothing about which number was their sale.
  const closesIn = (t: Transaction) => {
    const coe = t.key_dates?.coe_date;
    if (!coe) return null;
    const days = Math.ceil((new Date(coe).getTime() - Date.now()) / 86_400_000);
    if (days < 0) return null;
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    return `in ${days} days`;
  };

  const houseHunting = buy?.current_stage_key === "house_hunting";

  if (buy && sell) {
    const sellStage = findStage(stages, "sell", sell.current_stage_key);
    const sellClose = closesIn(sell);
    const buyClose = closesIn(buy);
    let detail: string;
    if (houseHunting) {
      detail = `Your sale of ${transactionLabel(sell)} is at ${sellStage?.label.toLowerCase() ?? "its current stage"}, and you're still looking for the next place.`;
    } else if (sellClose && buyClose) {
      detail = `Your sale closes ${sellClose} and your purchase ${buyClose}.`;
    } else if (sellClose) {
      detail = `Your sale closes ${sellClose}. The purchase closing date isn't set yet.`;
    } else if (buyClose) {
      detail = `Your purchase closes ${buyClose}. The sale closing date isn't set yet.`;
    } else {
      detail = "Both sides are moving — the comparison below shows how they line up.";
    }
    return { headline: "You're selling one home and buying the next", detail };
  }

  if (buy) {
    if (houseHunting) {
      return {
        headline: "You're house hunting",
        detail: nextTourAt
          ? `Your next tour is ${formatTourDate(nextTourAt)}.`
          : "Tours and notes from homes you've seen will show up here as you go.",
      };
    }
    const stage = findStage(stages, "buy", buy.current_stage_key);
    const closing = closesIn(buy);
    return {
      headline: `You're buying ${transactionLabel(buy)}`,
      detail: closing
        ? `${stage?.label ?? "In progress"} — closing ${closing}.`
        : `${stage?.label ?? "In progress"}.`,
    };
  }

  const stage = findStage(stages, "sell", sell!.current_stage_key);
  const closing = closesIn(sell!);
  const headline =
    sell!.current_stage_key === "prep"
      ? "Getting your home ready to list"
      : sell!.current_stage_key === "listed"
        ? "Your home is on the market"
        : `You're selling ${transactionLabel(sell!)}`;

  return {
    headline,
    detail: closing
      ? `${stage?.label ?? "In progress"} — closing ${closing}.`
      // Deliberately not the stage explainer: the card below already carries
      // it, and reading the same paragraph twice was the thinnest, most
      // confusing version of this page.
      : "Here's the short version — open any section from the menu for the full picture.",
  };
}

/** "Saturday, September 12" — parsed as a local date, not a UTC instant. */
export function formatTourDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
