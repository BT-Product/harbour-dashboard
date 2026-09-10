import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StageDefinition, Transaction } from "@/lib/supabase/database.types";
import { findStage, transactionLabel } from "@/lib/data/dashboard";

const KEY_DATE_LABELS: Record<string, string> = {
  contract_date: "Contract signed",
  contingency_removal_date: "Contingencies removed",
  coe_date: "Close of escrow",
};

export function TransactionCard({
  transaction,
  stages,
}: {
  transaction: Transaction;
  stages: StageDefinition[];
}) {
  const stage = findStage(stages, transaction.type, transaction.current_stage_key);
  const keyDates = Object.entries(transaction.key_dates ?? {}).filter(([, v]) => v);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{transactionLabel(transaction)}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground capitalize">
              {transaction.type === "buy" ? "Your purchase" : "Your sale"}
            </p>
          </div>
          <Badge variant={transaction.status === "active" ? "default" : "secondary"}>
            {stage?.label ?? transaction.current_stage_key}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stage && (
          <div>
            <p className="text-sm font-medium">What happens next</p>
            <p className="mt-1 text-sm text-muted-foreground">{stage.explainer}</p>
          </div>
        )}
        {keyDates.length > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-3 text-sm">
            {keyDates.map(([key, value]) => (
              <div key={key}>
                <span className="text-muted-foreground">{KEY_DATE_LABELS[key] ?? key}: </span>
                <span className="font-medium">
                  {value ? new Date(value).toLocaleDateString() : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
