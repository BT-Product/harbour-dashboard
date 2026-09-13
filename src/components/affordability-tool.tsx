"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hoaAdjustedPurchasePrice } from "@/lib/finance";
import type { Preapproval } from "@/lib/supabase/database.types";

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/**
 * The lender's pre-approval, shown as written, plus the one adjustment that
 * changes what a client can actually offer on a given home.
 *
 * The headline figure is never recalculated — it is the number on the
 * letter. Only the HOA line is an estimate, and it says so.
 */
export function AffordabilityTool({ preapproval }: { preapproval: Preapproval }) {
  // Raw text, not a number: storing a number meant an empty box couldn't be
  // represented and the leading zero could never be deleted.
  const [hoaInput, setHoaInput] = useState(String(preapproval.hoa_monthly));
  const hoa = Math.max(0, Number(hoaInput) || 0);

  const canEstimate = preapproval.rate > 0;
  const adjustedPrice = canEstimate
    ? hoaAdjustedPurchasePrice(
        preapproval.purchase_price,
        preapproval.percent_down,
        preapproval.rate,
        hoa,
      )
    : preapproval.purchase_price;
  const reduction = preapproval.purchase_price - adjustedPrice;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your pre-approval</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Pre-approved up to</p>
            <p className="text-2xl font-semibold">{money(preapproval.purchase_price)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Down payment</p>
            <p className="text-2xl font-semibold">{preapproval.percent_down}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Loan type</p>
            <p className="text-2xl font-semibold">{preapproval.loan_type ?? "—"}</p>
          </div>
          {preapproval.lender && (
            <div className="sm:col-span-3 border-t pt-3">
              <p className="text-sm text-muted-foreground">
                From {preapproval.lender}. They&apos;re the ones to ask about anything to do with
                the loan itself.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {canEstimate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How HOA dues change it</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your approved payment has to cover the loan and any HOA dues together, so a home
              with dues leaves less room for the loan itself. Enter what a home charges to see
              where that puts you.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="max-w-xs space-y-2">
              <Label htmlFor="hoa">Monthly HOA dues</Label>
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
                  onFocus={(e) => e.target.select()}
                  onBlur={() => setHoaInput(String(hoa))}
                />
              </div>
            </div>

            <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  Price you could offer at {money(hoa)}/mo dues
                </p>
                <p className="text-xl font-semibold">{money(adjustedPrice)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Difference</p>
                <p className="text-xl font-semibold">
                  {reduction > 0 ? `-${money(reduction)}` : "$0"}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              An estimate, not a second pre-approval. Your pre-approved amount above is the figure
              from {preapproval.lender ?? "your lender"} — check with them before making an offer
              on a home with dues.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
