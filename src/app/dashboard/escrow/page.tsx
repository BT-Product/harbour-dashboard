import { createClient } from "@/lib/supabase/server";
import {
  getClientTransactions,
  getMyAgentContact,
  getStageDefinitions,
  isMovingMoney,
} from "@/lib/data/dashboard";
import { StageStepper } from "@/components/stage-stepper";
import { WireFraudNotice } from "@/components/wire-fraud-notice";

export default async function EscrowPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [transactions, stages, agent] = await Promise.all([
    getClientTransactions(supabase, user!.id),
    getStageDefinitions(supabase),
    getMyAgentContact(supabase),
  ]);

  const movingMoney = transactions.find((t) => isMovingMoney(t, stages)) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Your timeline</h1>
        <p className="mt-2 text-muted-foreground">
          Every step from here to the keys, and what each one means.
        </p>
      </div>
      {movingMoney && <WireFraudNotice escrow={movingMoney} agent={agent} />}

      <div className="grid gap-4 md:grid-cols-2">
        {transactions.map((t) => (
          <StageStepper key={t.id} transaction={t} stages={stages} />
        ))}
      </div>
    </div>
  );
}
