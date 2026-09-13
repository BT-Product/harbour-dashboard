"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  maxPriceWithAssistance,
  maxPrincipalForPayment,
  monthlyPrincipalAndInterest,
} from "@/lib/finance";
import type { Preapproval } from "@/lib/supabase/database.types";

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function AffordabilityTool({ preapproval }: { preapproval: Preapproval }) {
  // The field holds raw text, not a number. Storing a number meant an empty
  // box couldn't be represented: clearing it snapped straight back to "0",
  // so the leading zero could never be deleted and typing 453 left 0453.
  const [hoaInput, setHoaInput] = useState(String(preapproval.hoa_monthly));
  const hoa = Math.max(0, Number(hoaInput) || 0);

  const budget = useMemo(
    () => monthlyPrincipalAndInterest(preapproval.loan_amount, preapproval.rate),
    [preapproval.loan_amount, preapproval.rate],
  );

  const adjustedLoan = useMemo(() => {
    const remaining = Math.max(budget - hoa, 0);
    return maxPrincipalForPayment(remaining, preapproval.rate);
  }, [budget, hoa, preapproval.rate]);

  // Assistance is a percentage of the purchase price, so it scales with the
  // price it helps buy — including when HOA dues shrink the loan underneath it.
  const assistancePct = preapproval.assistance_percent ?? 0;
  const adjustedMaxPrice = maxPriceWithAssistance(
    adjustedLoan,
    preapproval.down_payment,
    assistancePct,
  );
  const fullPrice = maxPriceWithAssistance(
    preapproval.loan_amount,
    preapproval.down_payment,
    assistancePct,
  );
  const priceReduction = fullPrice - adjustedMaxPrice;

  return (
    <Card>
      <CardHeader>
        <CardTitle>How HOA dues change it</CardTitle>
        <CardDescription>
          Your approved payment covers principal, interest, and HOA together. A home with higher
          HOA dues leaves less room for loan payment — this shows how much less.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="hoa">Monthly HOA dues for a home you&apos;re considering</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="hoa"
              type="number"
              min={0}
              step={25}
              className="pl-6"
              value={hoaInput}
              onChange={(e) => setHoaInput(e.target.value)}
              // Select what's there on focus, so typing a figure replaces
              // it instead of appending to the 0 that's already sitting in
              // the box.
              onFocus={(e) => e.target.select()}
              // Tidy up once they're done rather than while they type:
              // an empty box becomes 0, and 0453 becomes 453.
              onBlur={() => setHoaInput(String(hoa))}
            />
          </div>
        </div>

        <div className="grid gap-4 border-t pt-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Your approved monthly budget</p>
            <p className="text-xl font-semibold">{money(budget)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Max home price at this HOA</p>
            <p className="text-xl font-semibold">{money(adjustedMaxPrice)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Reduction vs. no HOA</p>
            <p className="text-xl font-semibold">
              {priceReduction > 0 ? `-${money(priceReduction)}` : "$0"}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          An estimate based on the pre-approval {preapproval.lender ?? "your lender"} has on
          file, not a quote. The exact figure depends on taxes, insurance and the details of your
          loan — {preapproval.lender ?? "your lender"} is the one to ask.
        </p>
      </CardContent>
    </Card>
  );
}
