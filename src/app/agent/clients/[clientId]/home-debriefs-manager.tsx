"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { HomeSeenCard } from "@/components/home-seen-card";
import type { HomeSeen, InterestLevel } from "@/lib/supabase/database.types";
import { saveDebriefInterest } from "./actions";

const INTEREST_OPTIONS: { value: InterestLevel; label: string }[] = [
  { value: "pass", label: "Pass" },
  { value: "maybe", label: "Maybe" },
  { value: "strong", label: "Strong" },
];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DebriefFormDialog({
  clientId,
  home,
  defaultDateKey,
  triggerLabel,
  triggerVariant = "outline",
}: {
  clientId: string;
  home?: HomeSeen;
  defaultDateKey?: string;
  triggerLabel: string;
  triggerVariant?: "outline" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [interest, setInterest] = useState<InterestLevel | "">(home?.interest_level ?? "");

  const defaultSeenAt = home ? home.seen_at.slice(0, 10) : (defaultDateKey ?? todayKey());

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const seenAtInput = String(formData.get("seen_at") || defaultSeenAt);
        await saveDebriefInterest(clientId, {
          id: home?.id ?? null,
          address: String(formData.get("address") || ""),
          clientNotes: String(formData.get("client_notes") || "").trim() || null,
          privateNotes: String(formData.get("private_notes") || "").trim() || null,
          interestLevel: interest || null,
          seenAt: new Date(`${seenAtInput}T12:00`).toISOString(),
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
              <Label htmlFor="seen_at">Seen on</Label>
              <Input id="seen_at" name="seen_at" type="date" required defaultValue={defaultSeenAt} />
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

export function HomesSeenDayManager({
  clientId,
  dateKeyStr,
  homes,
}: {
  clientId: string;
  dateKeyStr: string;
  homes: HomeSeen[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <DebriefFormDialog clientId={clientId} defaultDateKey={dateKeyStr} triggerLabel="Add debrief" />
      </div>
      {homes.length === 0 && (
        <p className="text-sm text-muted-foreground">No debriefs found for this date.</p>
      )}
      {homes.map((home) => (
        <HomeSeenCard
          key={home.id}
          address={home.address}
          clientNotes={home.client_notes}
          interestLevel={home.interest_level}
          seenAt={home.seen_at}
          privateNotes={home.private_notes}
          action={
            <DebriefFormDialog
              clientId={clientId}
              home={home}
              triggerLabel="Edit"
              triggerVariant="ghost"
            />
          }
        />
      ))}
    </div>
  );
}
