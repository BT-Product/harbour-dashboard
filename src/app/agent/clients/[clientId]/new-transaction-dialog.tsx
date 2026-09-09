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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StageDefinition, Transaction, TransactionType } from "@/lib/supabase/database.types";
import { createTransaction } from "./actions";

const TYPE_LABELS: Record<TransactionType, string> = { buy: "Purchase", sell: "Sale" };

export function NewTransactionDialog({
  clientId,
  transactions,
  stages,
  triggerLabel = "Add transaction",
}: {
  clientId: string;
  transactions: Transaction[];
  stages: StageDefinition[];
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("buy");
  const [stageKey, setStageKey] = useState("");
  const [link, setLink] = useState(true);
  const [isPending, startTransition] = useTransition();

  const typeStages = stages
    .filter((s) => s.transaction_type === type)
    .sort((a, b) => a.sort_order - b.sort_order);

  // The other leg of a move-up buyer: an active transaction on the opposite
  // side that isn't already paired off. Only one can be linked, so if there
  // are somehow several we don't guess.
  const linkCandidates = transactions.filter(
    (t) => t.type !== type && t.status === "active" && !t.linked_transaction_id,
  );
  const linkCandidate = linkCandidates.length === 1 ? linkCandidates[0] : undefined;

  function handleTypeChange(next: TransactionType) {
    setType(next);
    // Stages are per-type, so a stage picked for the old type is meaningless.
    setStageKey("");
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await createTransaction(clientId, {
          type,
          propertyAddress: String(formData.get("property_address") || ""),
          stageKey: stageKey || null,
          linkToTransactionId: link && linkCandidate ? linkCandidate.id : null,
        });
        toast.success("Transaction created");
        setOpen(false);
        setType("buy");
        setStageKey("");
        setLink(true);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create transaction");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" type="button" />}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <form action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => handleTypeChange((v as TransactionType) ?? type)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: TransactionType) => TYPE_LABELS[value] ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Purchase</SelectItem>
                  <SelectItem value="sell">Sale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="property_address">Property address</Label>
              <Input
                id="property_address"
                name="property_address"
                required
                placeholder={
                  type === "buy" ? "Target address, or TBD" : "123 Main St, Springfield"
                }
              />
              {type === "buy" && (
                <p className="text-xs text-muted-foreground">
                  A buyer who hasn&apos;t chosen a home yet can start as &ldquo;TBD&rdquo; — you
                  can change it once they&apos;re in contract.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Starting stage</Label>
              <Select value={stageKey} onValueChange={(v) => setStageKey(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={typeStages[0]?.label ?? "First stage"}>
                    {(value: string) =>
                      typeStages.find((s) => s.stage_key === value)?.label ??
                      typeStages[0]?.label ??
                      ""
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {typeStages.map((s) => (
                    <SelectItem key={s.stage_key} value={s.stage_key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Defaults to the start of the {type === "buy" ? "purchase" : "sale"} sequence. Pick
                a later stage for a client who is already underway.
              </p>
            </div>

            {linkCandidate && (
              <div className="rounded-lg border p-3">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={link}
                    onChange={(e) => setLink(e.target.checked)}
                  />
                  <span className="space-y-1">
                    <span className="block">
                      Link to the {TYPE_LABELS[linkCandidate.type].toLowerCase()} of{" "}
                      {linkCandidate.property_address}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Makes this a move-up buyer and turns on the coordination view comparing the
                      two timelines.
                    </span>
                  </span>
                </label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
