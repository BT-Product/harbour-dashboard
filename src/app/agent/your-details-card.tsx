"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatLicense } from "@/lib/license";
import { saveMyDetails } from "./actions";

export function YourDetailsCard({
  name,
  phone,
  dreNumber,
}: {
  name: string;
  phone: string | null;
  dreNumber: string | null;
}) {
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [dreValue, setDreValue] = useState(dreNumber ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await saveMyDetails({ phone: phoneValue, dreNumber: dreValue });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Saved");
    });
  }

  return (
    <Card id="your-details" className="scroll-mt-6">
      <CardHeader>
        <CardTitle className="text-base">Your details</CardTitle>
        <p className="text-sm text-muted-foreground">
          Shown to every client — on their dashboard and on every email Harbour sends for you.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dre-number">DRE license number</Label>
            <Input
              id="dre-number"
              inputMode="numeric"
              value={dreValue}
              onChange={(e) => setDreValue(e.target.value)}
              placeholder="01234567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-phone">Phone</Label>
            <Input
              id="agent-phone"
              type="tel"
              value={phoneValue}
              onChange={(e) => setPhoneValue(e.target.value)}
              placeholder="(555) 555-0123"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {dreNumber
              ? `Clients see: ${name} · ${formatLicense(dreNumber)}`
              : "Client emails are paused until a license number is on file."}
          </p>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
