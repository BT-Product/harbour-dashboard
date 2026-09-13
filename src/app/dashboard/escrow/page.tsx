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
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Your timeline</h1>
        <p className="mt-2 text-muted-foreground">
          Every step from here to the keys, and what each one means.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {transactions.map((t) => (
          <StageStepper key={t.id} transaction={t} stages={stages} />
        ))}
      </div>
    </div>
  );
}
