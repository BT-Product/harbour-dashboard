"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatLicense } from "@/lib/license";
import { saveMyProfile } from "../actions";

function Field({
  id,
  label,
  seenBy,
  children,
}: {
  id: string;
  label: string;
  /** Where a client sees this — the reason most of these fields exist. */
  seenBy: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <p className="text-xs text-muted-foreground">{seenBy}</p>
    </div>
  );
}

export function ProfileForm({
  name,
  phone,
  dreNumber,
  officeAddress,
}: {
  name: string;
  phone: string | null;
  dreNumber: string | null;
  officeAddress: string | null;
}) {
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [dreValue, setDreValue] = useState(dreNumber ?? "");
  const [addressValue, setAddressValue] = useState(officeAddress ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await saveMyProfile({
        phone: phoneValue,
        dreNumber: dreValue,
        officeAddress: addressValue,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Profile saved");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">License and contact</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1">
          <p className="text-sm font-medium">Licensed name</p>
          <p className="text-sm">{name}</p>
          <p className="text-xs text-muted-foreground">
            Shown beside your license number, so it should match your license exactly.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="dre-number"
            label="DRE license number"
            seenBy={
              dreNumber
                ? `Clients see "${name} · ${formatLicense(dreNumber)}" on every dashboard page and email.`
                : "Required: client emails don't send until it's on file."
            }
          >
            <Input
              id="dre-number"
              inputMode="numeric"
              value={dreValue}
              onChange={(e) => setDreValue(e.target.value)}
              placeholder="01234567"
            />
          </Field>

          <Field
            id="agent-phone"
            label="Phone"
            seenBy="On every client email, and as the number to call in the wire-fraud warning."
          >
            <Input
              id="agent-phone"
              type="tel"
              value={phoneValue}
              onChange={(e) => setPhoneValue(e.target.value)}
              placeholder="(555) 555-0123"
            />
          </Field>
        </div>

        <Field
          id="office-address"
          label="Office address"
          seenBy="Not shown to clients yet. Marketing emails will need it as their postal address."
        >
          <Textarea
            id="office-address"
            rows={3}
            value={addressValue}
            onChange={(e) => setAddressValue(e.target.value)}
            placeholder={"123 Main St, Suite 100\nSacramento, CA 95814"}
          />
        </Field>

        <div className="flex justify-end border-t pt-4">
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
