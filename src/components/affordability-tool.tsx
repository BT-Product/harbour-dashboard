"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maxPrincipalForPayment, monthlyPrincipalAndInterest } from "@/lib/finance";
import type { Preapproval } from "@/lib/supabase/database.types";

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function AffordabilityTool({ preapproval }: { preapproval: Preapproval }) {
  const [hoa, setHoa] = useState(preapproval.hoa_monthly);

  const budget = useMemo(
    () => monthlyPrincipalAndInterest(preapproval.loan_amount, preapproval.rate),
    [preapproval.loan_amount, preapproval.rate],
  );

  const adjustedLoan = useMemo(() => {
    const remaining = Math.max(budget - hoa, 0);
    return maxPrincipalForPayment(remaining, preapproval.rate);
  }, [budget, hoa, preapproval.rate]);

  const adjustedMaxPrice = adjustedLoan + preapproval.down_payment;
  const fullPrice = preapproval.loan_amount + preapproval.down_payment;
  const priceReduction = fullPrice - adjustedMaxPrice;

  return (
    <Card>
      <CardHeader>
        <CardTitle>HOA-Adjusted Affordability</CardTitle>
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
              value={hoa}
              onChange={(e) => setHoa(Math.max(0, Number(e.target.value) || 0))}
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
          Estimate only, based on your current approval ({money(preapproval.loan_amount)} loan at{" "}
          {preapproval.rate}%, 30-year fixed) plus your {money(preapproval.down_payment)} down
          payment. Actual qualifying payment may also include taxes and insurance — talk to{" "}
          {preapproval.lender ?? "your lender"} before making an offer.
        </p>
      </CardContent>
    </Card>
  );
}
