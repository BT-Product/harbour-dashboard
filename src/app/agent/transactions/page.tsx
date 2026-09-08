import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getStageDefinitions } from "@/lib/data/dashboard";
import { AdvanceButton } from "./advance-button";

export default async function AgentTransactionsPage() {
  const supabase = await createClient();
  const stages = await getStageDefinitions(supabase);

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*, client:profiles!transactions_client_id_fkey(full_name)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>

      <div className="space-y-3">
        {(transactions ?? []).map((t) => {
          const typeStages = stages
            .filter((s) => s.transaction_type === t.type)
            .sort((a, b) => a.sort_order - b.sort_order);
          const currentIndex = typeStages.findIndex((s) => s.stage_key === t.current_stage_key);
          const current = typeStages[currentIndex];
          const next = typeStages[currentIndex + 1];
          const clientName = (t as unknown as { client: { full_name: string } | null }).client
            ?.full_name;

          return (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{t.property_address}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {clientName ?? "Unknown client"} · {t.type === "buy" ? "Purchase" : "Sale"}
                    </p>
                  </div>
                  <Badge variant={t.status === "active" ? "default" : "secondary"}>
                    {current?.label ?? t.current_stage_key}
                  </Badge>
                </div>
              </CardHeader>
              {t.status === "active" && next && (
                <CardContent>
                  <AdvanceButton
                    transactionId={t.id}
                    nextStageKey={next.stage_key}
                    nextStageLabel={next.label}
                  />
                </CardContent>
              )}
            </Card>
          );
        })}

        {(transactions ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        )}
      </div>
    </div>
  );
}
