import { createClient } from "@/lib/supabase/server";
import {
  getClientTransactions,
  getStageDefinitions,
  linkedTransaction,
  primaryTransaction,
} from "@/lib/data/dashboard";
import { CoordinationView } from "@/components/coordination-view";
import { TransactionCard } from "@/components/transaction-card";

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const transactions = await getClientTransactions(supabase, user!.id);
  const stages = await getStageDefinitions(supabase);

  const primary = primaryTransaction(transactions);
  const linked = primary ? linkedTransaction(transactions, primary) : undefined;
  const isMoveUp = primary?.type === "buy" && linked?.type === "sell";

  const standalone = isMoveUp
    ? transactions.filter((t) => t.id !== primary!.id && t.id !== linked!.id)
    : transactions;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>

      {isMoveUp && (
        <CoordinationView buy={primary!} sell={linked!} stages={stages} />
      )}

      {standalone.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {standalone.map((t) => (
            <TransactionCard key={t.id} transaction={t} stages={stages} />
          ))}
        </div>
      )}

      {transactions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No transactions yet. Your agent will add one shortly.
        </p>
      )}
    </div>
  );
}
