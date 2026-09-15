"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { transactionLabel } from "@/lib/data/dashboard";
import type { Transaction } from "@/lib/supabase/database.types";
import { saveEscrowContact } from "./actions";

/**
 * Feeds the wire-fraud warning on the client's dashboard. Buy side only,
 * matching the warning.
 *
 * There is intentionally no escrow email field: the client is told to verify
 * by phone, and showing an address would invite them to verify by email —
 * the channel wire fraud runs through.
 */
export function EscrowContactEditor({
  clientId,
  transaction,
  agentPhone,
  warningVisible,
}: {
  clientId: string;
  transaction: Transaction;
  agentPhone: string | null;
  /** Whether the client can see the warning yet (Offer Accepted onward). */
  warningVisible: boolean;
}) {
  const [company, setCompany] = useState(transaction.escrow_company ?? "");
  const [officer, setOfficer] = useState(transaction.escrow_officer ?? "");
  const [phone, setPhone] = useState(transaction.escrow_phone ?? "");
  const [myPhone, setMyPhone] = useState(agentPhone ?? "");
  const [isPending, startTransition] = useTransition();

  const clean = (v: string) => v.trim() || null;

  function handleSave() {
    startTransition(async () => {
      try {
        await saveEscrowContact(clientId, transaction.id, {
          company: clean(company),
          officer: clean(officer),
          phone: clean(phone),
          agentPhone: clean(myPhone),
        });
        toast.success("Saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  const specific = phone.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Escrow &amp; wiring · {transactionLabel(transaction)}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Shown to the client in their wire-fraud warning, so they know who to call before sending
          money.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={`escrow-company-${transaction.id}`}>Escrow company</Label>
            <Input
              id={`escrow-company-${transaction.id}`}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="First American Title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`escrow-officer-${transaction.id}`}>Escrow officer</Label>
            <Input
              id={`escrow-officer-${transaction.id}`}
              value={officer}
              onChange={(e) => setOfficer(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`escrow-phone-${transaction.id}`}>Escrow phone</Label>
            <Input
              id={`escrow-phone-${transaction.id}`}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 555-0100"
            />
          </div>
        </div>

        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            Take this number from escrow&apos;s website or your own contacts — never from an email.
          </span>{" "}
          A number copied out of a spoofed email passes the fraud straight to your client.
        </p>

        <div className="grid gap-4 border-t pt-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={`agent-phone-${transaction.id}`}>Your phone</Label>
            <Input
              id={`agent-phone-${transaction.id}`}
              type="tel"
              value={myPhone}
              onChange={(e) => setMyPhone(e.target.value)}
              placeholder="(555) 555-0123"
            />
          </div>
          <p className="self-end text-xs text-muted-foreground sm:col-span-2">
            Shown to <span className="font-medium text-foreground">every</span> client as the
            number to call if anything about wiring looks wrong, and signed on tour reminder
            emails.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {!warningVisible
              ? "The client won't see the warning until Offer Accepted."
              : specific
                ? "The client sees who to call and this number."
                : "No escrow phone yet, so the client sees the general warning."}
          </p>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
