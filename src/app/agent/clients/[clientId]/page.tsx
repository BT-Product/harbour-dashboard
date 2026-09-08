import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getClientHomesSeen,
  getClientProfile,
  getClientTours,
  getInspectionItemsForTransactions,
} from "@/lib/data/agent";
import { getClientTransactions, getStageDefinitions } from "@/lib/data/dashboard";
import { TransactionEditor } from "./transaction-editor";
import { ToursManager } from "./tours-manager";
import { InspectionsManager } from "./inspections-manager";
import { HomeDebriefsManager } from "./home-debriefs-manager";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const [client, transactions, stages, tours, homes] = await Promise.all([
    getClientProfile(supabase, clientId),
    getClientTransactions(supabase, clientId),
    getStageDefinitions(supabase),
    getClientTours(supabase, clientId),
    getClientHomesSeen(supabase, clientId),
  ]);
  const items = await getInspectionItemsForTransactions(
    supabase,
    transactions.map((t) => t.id),
  );

  const hasBuy = transactions.some((t) => t.type === "buy");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/agent/clients"
          className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Clients
        </Link>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{client.full_name}</h1>
        <p className="text-sm text-muted-foreground">
          {client.phone ?? "No phone on file"}
          {client.partner_name && ` · Partner: ${client.partner_name} (${client.partner_email})`}
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-muted-foreground">Transactions</h2>
        {transactions.map((t) => (
          <TransactionEditor key={t.id} clientId={clientId} transaction={t} stages={stages} />
        ))}
        {transactions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No transactions yet — add one in Supabase Studio.
          </p>
        )}
      </div>

      {hasBuy && <ToursManager clientId={clientId} tours={tours} />}
      {hasBuy && <HomeDebriefsManager clientId={clientId} homes={homes} />}
      <InspectionsManager clientId={clientId} transactions={transactions} items={items} />
    </div>
  );
}
