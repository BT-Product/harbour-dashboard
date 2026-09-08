import { createClient } from "@/lib/supabase/server";
import { getClientTransactions, getStageDefinitions } from "@/lib/data/dashboard";
import { StageStepper } from "@/components/stage-stepper";

export default async function EscrowPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const transactions = await getClientTransactions(supabase, user!.id);
  const stages = await getStageDefinitions(supabase);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Escrow</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {transactions.map((t) => (
          <StageStepper key={t.id} transaction={t} stages={stages} />
        ))}
      </div>
    </div>
  );
}
