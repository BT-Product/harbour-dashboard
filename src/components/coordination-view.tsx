import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionCard } from "@/components/transaction-card";
import type { StageDefinition, Transaction } from "@/lib/supabase/database.types";
import { computeCoordination } from "@/lib/data/coordination";

export function CoordinationView({
  buy,
  sell,
  stages,
}: {
  buy: Transaction;
  sell: Transaction;
  stages: StageDefinition[];
}) {
  const coordination = computeCoordination(buy, sell);

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>How your sale and purchase line up</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>{coordination.headline}</AlertTitle>
          <AlertDescription>{coordination.riskRead}</AlertDescription>
        </Alert>
        <div className="grid gap-4 md:grid-cols-2">
          <TransactionCard transaction={sell} stages={stages} />
          <TransactionCard transaction={buy} stages={stages} />
        </div>
      </CardContent>
    </Card>
  );
}
