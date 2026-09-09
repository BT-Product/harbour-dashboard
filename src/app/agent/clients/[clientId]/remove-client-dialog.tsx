"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { removeClient } from "../actions";

export function RemoveClientDialog({
  clientId,
  fullName,
  counts,
}: {
  clientId: string;
  fullName: string;
  counts: { transactions: number; tours: number; homesSeen: number; hasPreapproval: boolean };
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const confirmed = confirmation.trim().toLowerCase() === fullName.trim().toLowerCase();

  const items = [
    `${counts.transactions} transaction${counts.transactions === 1 ? "" : "s"}`,
    `${counts.tours} tour${counts.tours === 1 ? "" : "s"}`,
    `${counts.homesSeen} home${counts.homesSeen === 1 ? "" : "s"} seen (including your private notes)`,
    ...(counts.hasPreapproval ? ["their pre-approval"] : []),
  ];

  function handleRemove() {
    startTransition(async () => {
      const result = await removeClient(clientId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${fullName} removed`);
      setOpen(false);
      router.push("/agent/clients");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant="ghost" type="button" className="text-destructive" />}
      >
        Remove client
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {fullName}?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 text-sm">
          <p>
            This permanently deletes their login and everything attached to them. It can&apos;t be
            undone.
          </p>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <span className="font-semibold text-foreground">{fullName}</span> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={!confirmed || isPending}
            onClick={handleRemove}
          >
            {isPending ? "Removing…" : "Remove permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
