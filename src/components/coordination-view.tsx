import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Transaction } from "@/lib/supabase/database.types";
import { computeCoordination } from "@/lib/data/coordination";

/**
 * The one thing a move-up client can't get anywhere else: how their two
 * timelines relate, and where the risk sits.
 *
 * This used to embed a card for each transaction as well. The overview now
 * gives each one its own card in the grid below, so repeating them here
 * just made the client read the same stage and closing date twice.
 */
export function CoordinationView({ buy, sell }: { buy: Transaction; sell: Transaction }) {
  const coordination = computeCoordination(buy, sell);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">How your sale and purchase line up</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertTitle>{coordination.headline}</AlertTitle>
          <AlertDescription>{coordination.riskRead}</AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
