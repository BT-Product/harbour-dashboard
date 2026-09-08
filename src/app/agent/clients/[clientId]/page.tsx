import { createClient } from "@/lib/supabase/server";
import { getClientTransactions, getStageDefinitions } from "@/lib/data/dashboard";
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
      {transactions.map((t) => (
        <TransactionEditor key={t.id} clientId={clientId} transaction={t} stages={stages} />
      ))}
      {transactions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No transactions yet — add one in Supabase Studio.
        </p>
      )}
    </div>
  );
}
