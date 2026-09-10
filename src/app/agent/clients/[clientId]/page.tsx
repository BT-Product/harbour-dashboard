import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getClientHomesSeen,
  getClientPreapproval,
  getClientProfile,
  getClientTours,
  getClientVisitStats,
} from "@/lib/data/agent";
import { VisitStatsCard } from "@/components/visit-stats-card";
import { getClientTransactions, getStageDefinitions } from "@/lib/data/dashboard";
import { GettingStartedCard } from "./getting-started-card";
import { NewTransactionDialog } from "./new-transaction-dialog";
import { RemoveClientDialog } from "./remove-client-dialog";
import { ResendAccessButton } from "./resend-access-button";
import { TransactionEditor } from "./transaction-editor";

export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const [client, transactions, stages, tours, homesSeen, preapproval, visits] = await Promise.all([
    getClientProfile(supabase, clientId).catch(() => null),
    getClientTransactions(supabase, clientId),
    getStageDefinitions(supabase),
    getClientTours(supabase, clientId),
    getClientHomesSeen(supabase, clientId),
    getClientPreapproval(supabase, clientId),
    getClientVisitStats(supabase, clientId),
  ]);
  if (!client) notFound();

  const hasBuy = transactions.some((t) => t.type === "buy");

  return (
    <div className="space-y-4 pt-4">
      {/* Never opened it at all is a different problem from not visiting
          lately — usually their sign-in link never worked. */}
      {visits.lastVisitAt === null && (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              {client.full_name} hasn&apos;t opened their dashboard yet
            </p>
            <p className="text-sm text-muted-foreground">
              If their invite link didn&apos;t work, send a fresh one — it lets them set a password
              and lands them straight in.
            </p>
          </div>
          <ResendAccessButton clientId={clientId} />
        </div>
      )}

      <VisitStatsCard stats={visits} />

      {/* Only while something's still missing — it's onboarding, not a
          permanent fixture of the page. */}
      {hasBuy && (!tours.length || !homesSeen.length || !preapproval) && (
        <GettingStartedCard
          clientId={clientId}
          hasTours={tours.length > 0}
          hasHomesSeen={homesSeen.length > 0}
          hasPreapproval={preapproval !== null}
        />
      )}

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

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Removing a client deletes their login and their whole history.
          </p>
          {visits.lastVisitAt !== null && (
            <ResendAccessButton
              clientId={clientId}
              variant="ghost"
              label="Send password reset"
            />
          )}
        </div>
        <RemoveClientDialog
          clientId={clientId}
          fullName={client.full_name}
          counts={{
            transactions: transactions.length,
            tours: tours.length,
            homesSeen: homesSeen.length,
            hasPreapproval: preapproval !== null,
          }}
        />
      </div>
    </div>
  );
}
