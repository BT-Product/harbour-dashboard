import { createClient } from "@/lib/supabase/server";
import { getInspectionItemsForTransactions } from "@/lib/data/agent";
import { getClientTransactions } from "@/lib/data/dashboard";
import { InspectionsManager } from "../inspections-manager";

export default async function ClientInspectionsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const transactions = await getClientTransactions(supabase, clientId);
  const items = await getInspectionItemsForTransactions(
    supabase,
    transactions.map((t) => t.id),
  );

  return (
    <div className="pt-4">
      <InspectionsManager clientId={clientId} transactions={transactions} items={items} />
    </div>
  );
}
