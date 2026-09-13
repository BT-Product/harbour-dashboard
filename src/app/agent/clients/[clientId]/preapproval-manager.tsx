"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  maxPriceWithAssistance,
  maxPrincipalForPayment,
  monthlyPrincipalAndInterest,
} from "@/lib/finance";
import type { Preapproval } from "@/lib/supabase/database.types";
import { deletePreapproval, savePreapproval } from "./actions";

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

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
    const loanAmount = num("loan_amount");
    const downPayment = num("down_payment");
    const rate = num("rate");
    const hoaMonthly = num("hoa_monthly") || 0;
    const assistancePercent = num("assistance_percent") || 0;
    const assistanceDeferred = formData.get("assistance_deferred") === "on";

    if (
      [loanAmount, downPayment, rate, hoaMonthly, assistancePercent].some(
        (v) => !Number.isFinite(v) || v < 0,
      )
    ) {
      toast.error("Amounts and rate must be positive numbers");
      return;
    }

    startTransition(async () => {
      try {
        await savePreapproval(clientId, {
          loanAmount,
          downPayment,
          rate,
          lender: String(formData.get("lender") || "").trim() || null,
          hoaMonthly,
          assistancePercent,
          assistanceDeferred,
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

  // Mirrors AffordabilityTool exactly: the approved P&I is the fixed budget,
  // and HOA dues come out of it rather than being added on top.
  const budget = preapproval
    ? monthlyPrincipalAndInterest(preapproval.loan_amount, preapproval.rate)
    : 0;
  const maxPriceAtStoredHoa = preapproval
    ? maxPriceWithAssistance(
        maxPrincipalForPayment(Math.max(budget - preapproval.hoa_monthly, 0), preapproval.rate),
        preapproval.down_payment,
        preapproval.assistance_percent ?? 0,
      )
    : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">
            {preapproval ? "Pre-approval" : "Add a pre-approval"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Drives the client&apos;s Financials page and their affordability calculator. Leave it
            off until the lender has actually confirmed the numbers.
          </p>
        </CardHeader>
        <CardContent>
          {/* Remount on save: the inputs are uncontrolled, so without a key
              their defaultValue changes under them when the saved row comes
              back and Base UI warns about it. */}
          <form
            key={preapproval?.updated_at ?? "new"}
            action={handleSubmit}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="loan_amount">Loan amount</Label>
                <Input
                  id="loan_amount"
                  name="loan_amount"
                  type="number"
                  min="0"
                  step="1000"
                  required
                  defaultValue={preapproval?.loan_amount ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="down_payment">Down payment</Label>
                <Input
                  id="down_payment"
                  name="down_payment"
                  type="number"
                  min="0"
                  step="1000"
                  required
                  defaultValue={preapproval?.down_payment ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Rate (%)</Label>
                <Input
                  id="rate"
                  name="rate"
                  type="number"
                  min="0"
                  max="30"
                  step="0.001"
                  required
                  defaultValue={preapproval?.rate ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lender">Lender</Label>
                <Input id="lender" name="lender" defaultValue={preapproval?.lender ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hoa_monthly">HOA / month</Label>
                <Input
                  id="hoa_monthly"
                  name="hoa_monthly"
                  type="number"
                  min="0"
                  step="10"
                  defaultValue={preapproval?.hoa_monthly ?? 0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assistance_percent">Down payment assistance (%)</Label>
                <Input
                  id="assistance_percent"
                  name="assistance_percent"
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  defaultValue={preapproval?.assistance_percent ?? 0}
                />
                <p className="text-xs text-muted-foreground">
                  CalHFA MyHome, Dream For All, city programs. Percent of purchase price, 0 if
                  none. The loan amount above stays the first loan only.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="assistance_deferred"
                className="mt-0.5"
                defaultChecked={preapproval?.assistance_deferred ?? false}
              />
              <span>
                Assistance payment is deferred
                <span className="block text-xs text-muted-foreground">
                  No monthly payment until sale or refinance. Leave unchecked for a second loan
                  the client pays monthly — the lender will already have reduced the first-loan
                  approval to absorb it.
                </span>
              </span>
            </label>

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
                <span className="text-muted-foreground">Approved monthly budget</span>
                <span className="font-semibold">{money(budget)}/mo</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Max price at {money(preapproval.hoa_monthly)} HOA
                </span>
                <span className="font-semibold">{money(maxPriceAtStoredHoa)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Their calculator holds that budget fixed and back-solves the price as HOA dues
                change, so a higher-HOA home shows a lower ceiling.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
