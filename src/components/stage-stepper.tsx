import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { transactionLabel } from "@/lib/data/dashboard";
import type { StageDefinition, Transaction } from "@/lib/supabase/database.types";

export function StageStepper({
  transaction,
  stages,
}: {
  transaction: Transaction;
  stages: StageDefinition[];
}) {
  const typeStages = stages
    .filter((s) => s.transaction_type === transaction.type)
    .sort((a, b) => a.sort_order - b.sort_order);
  const currentIndex = typeStages.findIndex((s) => s.stage_key === transaction.current_stage_key);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{transactionLabel(transaction)}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {/* Not "escrow" until there's a contract — a house-hunting buyer
              hasn't opened one. */}
          {transaction.type === "buy" ? "Purchase" : "Sale"}{" "}
          {typeStages[currentIndex]?.requires_property ? "escrow" : "timeline"}
        </p>
      </CardHeader>
      <CardContent>
        <ol className="space-y-0">
          {typeStages.map((stage, i) => {
            const done = i < currentIndex;
            const current = i === currentIndex;
            return (
              <li key={stage.stage_key} className="flex gap-3 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                      done && "bg-primary text-primary-foreground",
                      current && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                      !done && !current && "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  {i < typeStages.length - 1 && (
                    <div className={cn("mt-1 w-px flex-1", done ? "bg-primary" : "bg-border")} />
                  )}
                </div>
                <div className={cn("pt-0.5", !done && !current && "opacity-60")}>
                  <p className="text-sm font-medium">{stage.label}</p>
                  {current && (
                    <p className="mt-1 text-sm text-muted-foreground">{stage.explainer}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
