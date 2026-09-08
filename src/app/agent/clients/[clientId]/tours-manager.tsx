"use client";

import { useRef, useState, useTransition } from "react";
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
import type { Tour } from "@/lib/supabase/database.types";
import { deleteTour, saveTour } from "./actions";

function toDatetimeLocal(value: string): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TourFormDialog({
  clientId,
  tour,
  defaultDateKey,
  triggerLabel,
  triggerVariant = "outline",
}: {
  clientId: string;
  tour?: Tour;
  defaultDateKey?: string;
  triggerLabel: string;
  triggerVariant?: "outline" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const defaultDatetime = tour
    ? toDatetimeLocal(tour.scheduled_at)
    : defaultDateKey
      ? `${defaultDateKey}T10:00`
      : undefined;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await saveTour(clientId, {
          id: tour?.id ?? null,
          address: String(formData.get("address") || ""),
          scheduledAt: new Date(String(formData.get("scheduled_at"))).toISOString(),
          notes: String(formData.get("notes") || "").trim() || null,
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
        <form ref={formRef} action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{tour ? "Edit tour" : "Schedule a tour"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" required defaultValue={tour?.address} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled_at">Date &amp; time</Label>
              <Input
                id="scheduled_at"
                name="scheduled_at"
                type="datetime-local"
                required
                defaultValue={defaultDatetime}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} defaultValue={tour?.notes ?? ""} />
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

export function ToursDayManager({
  clientId,
  dateKeyStr,
  tours,
}: {
  clientId: string;
  dateKeyStr: string;
  tours: Tour[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!window.confirm("Delete this tour?")) return;
    startTransition(async () => {
      try {
        await deleteTour(clientId, id);
        toast.success("Deleted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <TourFormDialog clientId={clientId} defaultDateKey={dateKeyStr} triggerLabel="Add stop" />
      </div>
      {tours.length === 0 && (
        <p className="text-sm text-muted-foreground">No tours found for this date.</p>
      )}
      {tours.map((tour) => (
        <div key={tour.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">{tour.address}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(tour.scheduled_at).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
            {tour.notes && <p className="mt-1 text-sm">{tour.notes}</p>}
          </div>
          <div className="flex shrink-0 gap-2">
            <TourFormDialog clientId={clientId} tour={tour} triggerLabel="Edit" triggerVariant="ghost" />
            <Button
              size="sm"
              variant="ghost"
              type="button"
              disabled={isPending}
              onClick={() => handleDelete(tour.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
