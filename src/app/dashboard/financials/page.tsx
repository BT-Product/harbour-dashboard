import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { AffordabilityTool } from "@/components/affordability-tool";

export default async function FinancialsPage() {
  const supabase = await createClient();
  const { data: preapproval, error } = await supabase
    .from("preapproval")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Financials</h1>

      {!preapproval && (
        <p className="text-sm text-muted-foreground">
          No pre-approval on file yet. Your agent will add it once your lender confirms it.
        </p>
      )}

      {preapproval && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Pre-Approval</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Loan amount</p>
                <p className="text-lg font-semibold">
                  ${preapproval.loan_amount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Down payment</p>
                <p className="text-lg font-semibold">
                  ${preapproval.down_payment.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rate</p>
                <p className="text-lg font-semibold">{preapproval.rate}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lender</p>
                <p className="text-lg font-semibold">{preapproval.lender ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          <AffordabilityTool preapproval={preapproval} />
        </>
      )}
    </div>
  );
}
