import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getClientTransactions, transactionLabel } from "@/lib/data/dashboard";

const IMPORTANCE_VARIANT: Record<string, "destructive" | "default" | "secondary"> = {
  dealbreaker: "destructive",
  important: "default",
  minor: "secondary",
};

const IMPORTANCE_LABEL: Record<string, string> = {
  dealbreaker: "Dealbreaker",
  important: "Important",
  minor: "Minor",
};

export default async function InspectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const transactions = await getClientTransactions(supabase, user!.id);

  const transactionIds = transactions.map((t) => t.id);
  const { data: items, error } =
    transactionIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("inspection_items")
          .select("*")
          .in("transaction_id", transactionIds)
          .order("resolved", { ascending: true });

  if (error) throw error;

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Inspections</h1>

      {transactions.map((t) => {
        const txItems = (items ?? []).filter((i) => i.transaction_id === t.id);
        if (txItems.length === 0) return null;

        return (
          <div key={t.id} className="space-y-3">
            <h2 className="text-lg font-semibold text-muted-foreground">{transactionLabel(t)}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {txItems.map((item) => (
              <Card key={item.id} className={item.resolved ? "opacity-60" : undefined}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{item.item}</CardTitle>
                    <div className="flex gap-2">
                      {item.resolved && <Badge variant="secondary">Resolved</Badge>}
                      <Badge variant={IMPORTANCE_VARIANT[item.importance_to_client]}>
                        {IMPORTANCE_LABEL[item.importance_to_client]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                {item.negotiation_note && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.negotiation_note}</p>
                  </CardContent>
                )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {(items ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">No inspection items yet.</p>
      )}
    </div>
  );
}
