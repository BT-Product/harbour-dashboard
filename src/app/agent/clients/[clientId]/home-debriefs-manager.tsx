"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { HomeSeen, InterestLevel } from "@/lib/supabase/database.types";
import { saveDebriefInterest } from "./actions";

const INTEREST_OPTIONS: { value: InterestLevel; label: string }[] = [
  { value: "pass", label: "Pass" },
  { value: "maybe", label: "Maybe" },
  { value: "strong", label: "Strong" },
];

const INTEREST_VARIANT: Record<InterestLevel, "default" | "secondary" | "outline"> = {
  strong: "default",
  maybe: "secondary",
  pass: "outline",
};

function DebriefFormDialog({
  clientId,
  home,
  triggerLabel,
  triggerVariant = "outline",
}: {
  clientId: string;
  home?: HomeSeen;
  triggerLabel: string;
  triggerVariant?: "outline" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [interest, setInterest] = useState<InterestLevel | "">(home?.interest_level ?? "");

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await saveDebriefInterest(clientId, {
          id: home?.id ?? null,
          address: String(formData.get("address") || ""),
          clientNotes: String(formData.get("client_notes") || "").trim() || null,
          privateNotes: String(formData.get("private_notes") || "").trim() || null,
          interestLevel: interest || null,
          seenAt: home ? home.seen_at : new Date().toISOString(),
        });
        toast.success("Saved");
        setOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={triggerVariant} type="button" />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <form action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{home ? "Edit debrief" : "New debrief"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" required defaultValue={home?.address} />
            </div>
            <div className="space-y-2">
              <Label>Interest level</Label>
              <div className="grid grid-cols-3 gap-2">
                {INTEREST_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setInterest(opt.value)}
                    className={cn(
                      "h-10 rounded-md border text-sm font-medium transition-colors",
                      interest === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_notes">Client-facing notes</Label>
              <Textarea
                id="client_notes"
                name="client_notes"
                rows={3}
                defaultValue={home?.client_notes ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="private_notes">Private notes</Label>
              <Textarea
                id="private_notes"
                name="private_notes"
                rows={3}
                defaultValue={home?.private_notes ?? ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function HomeDebriefsManager({ clientId, homes }: { clientId: string; homes: HomeSeen[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Homes Seen</CardTitle>
          <DebriefFormDialog clientId={clientId} triggerLabel="Add debrief" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {homes.length === 0 && (
          <p className="text-sm text-muted-foreground">No debriefs yet.</p>
        )}
        {homes.map((home) => (
          <div key={home.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{home.address}</p>
                  {home.interest_level && (
                    <Badge variant={INTEREST_VARIANT[home.interest_level]}>
                      {home.interest_level}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Seen {new Date(home.seen_at).toLocaleDateString()}
                </p>
                {home.client_notes && <p className="mt-1 text-sm">{home.client_notes}</p>}
                {home.private_notes && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Private: {home.private_notes}
                  </p>
                )}
              </div>
              <DebriefFormDialog
                clientId={clientId}
                home={home}
                triggerLabel="Edit"
                triggerVariant="ghost"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
