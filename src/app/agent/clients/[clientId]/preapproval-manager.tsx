"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hoaAdjustedPurchasePrice } from "@/lib/finance";
import type { Preapproval } from "@/lib/supabase/database.types";
import { deletePreapproval, savePreapproval } from "./actions";

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

/**
 * What a lender's pre-approval letter actually says: a purchase price, a
 * percent down, and a loan type. Nothing here is derived, and the price the
 * client sees is the price typed in here — if the two ever disagree, this
 * app is wrong.
 */
export function PreapprovalManager({
  clientId,
  preapproval,
}: {
  clientId: string;
  preapproval: Preapproval | null;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const num = (name: string) => Number(formData.get(name));
    const purchasePrice = num("purchase_price");
    const percentDown = num("percent_down") || 0;
    const rate = num("rate") || 0;
    const hoaMonthly = num("hoa_monthly") || 0;

    if ([purchasePrice, percentDown, rate, hoaMonthly].some((v) => !Number.isFinite(v) || v < 0)) {
      toast.error("Amounts must be positive numbers");
      return;
    }

    startTransition(async () => {
      try {
        await savePreapproval(clientId, {
          purchasePrice,
          percentDown,
          loanType: String(formData.get("loan_type") || "").trim() || null,
          rate,
          lender: String(formData.get("lender") || "").trim() || null,
          hoaMonthly,
        });
        toast.success("Pre-approval saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  function handleDelete() {
    if (!window.confirm("Remove this pre-approval? The client's affordability tool goes away.")) {
      return;
    }
    startTransition(async () => {
      try {
        await deletePreapproval(clientId);
        toast.success("Pre-approval removed");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to remove");
      }
    });
  }

  const sampleHoa = 400;
  const atSampleHoa =
    preapproval && preapproval.rate > 0
      ? hoaAdjustedPurchasePrice(
          preapproval.purchase_price,
          preapproval.percent_down,
          preapproval.rate,
          sampleHoa,
        )
      : null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">
            {preapproval ? "Pre-approval" : "Add a pre-approval"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Straight off the lender&apos;s letter. The client sees this price as written — it is
            never recalculated.
          </p>
        </CardHeader>
        <CardContent>
          <form key={preapproval?.updated_at ?? "new"} action={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="purchase_price">Purchase price</Label>
                <Input
                  id="purchase_price"
                  name="purchase_price"
                  type="number"
                  min="0"
                  step="1000"
                  required
                  defaultValue={preapproval?.purchase_price ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="percent_down">Percent down</Label>
                <Input
                  id="percent_down"
                  name="percent_down"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  defaultValue={preapproval?.percent_down ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loan_type">Loan type</Label>
                <Input
                  id="loan_type"
                  name="loan_type"
                  placeholder="FHA, VA, Conventional, CalHFA"
                  defaultValue={preapproval?.loan_type ?? ""}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-dashed p-3">
              <p className="text-sm font-medium">Only used for the HOA estimate</p>
              <p className="text-xs text-muted-foreground">
                The HOA calculator needs a rate to turn monthly dues into a price. It isn&apos;t
                shown to the client, and leaving it blank simply hides that calculator.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="rate">Rate (%)</Label>
                  <Input
                    id="rate"
                    name="rate"
                    type="number"
                    min="0"
                    max="30"
                    step="0.001"
                    defaultValue={preapproval?.rate ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lender">Lender</Label>
                  <Input id="lender" name="lender" defaultValue={preapproval?.lender ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hoa_monthly">Default HOA / month</Label>
                  <Input
                    id="hoa_monthly"
                    name="hoa_monthly"
                    type="number"
                    min="0"
                    step="10"
                    defaultValue={preapproval?.hoa_monthly ?? 0}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isPending} size="sm">
                {isPending ? "Saving…" : preapproval ? "Save" : "Add pre-approval"}
              </Button>
              {preapproval && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={handleDelete}
                >
                  Remove
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What the client sees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!preapproval && (
            <p className="text-muted-foreground">
              &ldquo;No pre-approval on file yet. Your agent will add it once your lender confirms
              it.&rdquo;
            </p>
          )}
          {preapproval && (
            <>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Pre-approved for</span>
                <span className="font-semibold">{money(preapproval.purchase_price)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Down</span>
                <span className="font-semibold">{preapproval.percent_down}%</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Loan type</span>
                <span className="font-semibold">{preapproval.loan_type ?? "—"}</span>
              </div>
              {atSampleHoa !== null ? (
                <p className="border-t pt-3 text-xs text-muted-foreground">
                  With {money(sampleHoa)}/mo HOA dues their ceiling shows as{" "}
                  {money(atSampleHoa)}.
                </p>
              ) : (
                <p className="border-t pt-3 text-xs text-muted-foreground">
                  No rate on file, so the HOA calculator is hidden from them.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
