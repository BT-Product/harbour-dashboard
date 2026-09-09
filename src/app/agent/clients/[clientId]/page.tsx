import { createClient } from "@/lib/supabase/server";
import { getClientTransactions, getStageDefinitions } from "@/lib/data/dashboard";
import { NewTransactionDialog } from "./new-transaction-dialog";
import { TransactionEditor } from "./transaction-editor";

export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const [transactions, stages] = await Promise.all([
    getClientTransactions(supabase, clientId),
    getStageDefinitions(supabase),
  ]);

  return (
    <div className="space-y-4 pt-4">
      {transactions.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Transactions · {transactions.length}
          </h2>
          <NewTransactionDialog
            clientId={clientId}
            transactions={transactions}
            stages={stages}
            triggerLabel="Add transaction"
          />
        </div>
      )}

      {transactions.map((t) => (
        <TransactionEditor key={t.id} clientId={clientId} transaction={t} stages={stages} />
      ))}

      {transactions.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No transactions yet. Create one to start their dashboard.
          </p>
          <div className="mt-4 flex justify-center">
            <NewTransactionDialog
              clientId={clientId}
              transactions={transactions}
              stages={stages}
              triggerLabel="Create transaction"
            />
          </div>
        </div>
      )}
    </div>
  );
}
