"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { transactionLabel } from "@/lib/data/dashboard";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { InspectionItem, ItemImportance, Transaction } from "@/lib/supabase/database.types";
import { deleteInspectionItem, saveInspectionItem } from "./actions";

const IMPORTANCE_OPTIONS: { value: ItemImportance; label: string }[] = [
  { value: "minor", label: "Minor" },
  { value: "important", label: "Important" },
  { value: "dealbreaker", label: "Dealbreaker" },
];

const IMPORTANCE_VARIANT: Record<ItemImportance, "destructive" | "default" | "secondary"> = {
  dealbreaker: "destructive",
  important: "default",
  minor: "secondary",
};

function ItemFormDialog({
  clientId,
  transactions,
  item,
  triggerLabel,
  triggerVariant = "outline",
}: {
  clientId: string;
  transactions: Transaction[];
  item?: InspectionItem;
  triggerLabel: string;
  triggerVariant?: "outline" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [transactionId, setTransactionId] = useState(item?.transaction_id ?? transactions[0]?.id ?? "");
  const [importance, setImportance] = useState<ItemImportance>(item?.importance_to_client ?? "minor");
  const [resolved, setResolved] = useState(item?.resolved ?? false);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await saveInspectionItem(clientId, {
          id: item?.id ?? null,
          transactionId,
          item: String(formData.get("item") || ""),
          importance,
          negotiationNote: String(formData.get("negotiation_note") || "").trim() || null,
          resolved,
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
            <DialogTitle>{item ? "Edit inspection item" : "Add inspection item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {transactions.length > 1 && (
              <div className="space-y-2">
                <Label>Transaction</Label>
                <Select value={transactionId} onValueChange={(v) => setTransactionId(v ?? transactionId)}>
                  <SelectTrigger>
                    <SelectValue>
                      {(value: string) => {
                        const t = transactions.find((tx) => tx.id === value);
                        return t ? `${transactionLabel(t)} (${t.type})` : value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {transactions.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {transactionLabel(t)} ({t.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="item">Item</Label>
              <Input id="item" name="item" required defaultValue={item?.item} />
            </div>
            <div className="space-y-2">
              <Label>Importance to client</Label>
              <Select value={importance} onValueChange={(v) => v && setImportance(v as ItemImportance)}>
                <SelectTrigger>
                  <SelectValue>
                    {(value: ItemImportance) =>
                      IMPORTANCE_OPTIONS.find((opt) => opt.value === value)?.label ?? value
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {IMPORTANCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="negotiation_note">Negotiation note</Label>
              <Textarea
                id="negotiation_note"
                name="negotiation_note"
                rows={3}
                defaultValue={item?.negotiation_note ?? ""}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={resolved}
                onChange={(e) => setResolved(e.target.checked)}
              />
              Resolved
            </label>
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

export function InspectionsManager({
  clientId,
  transactions,
  items,
}: {
  clientId: string;
  transactions: Transaction[];
  items: InspectionItem[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!window.confirm("Delete this item?")) return;
    startTransition(async () => {
      try {
        await deleteInspectionItem(clientId, id);
        toast.success("Deleted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Inspections</CardTitle>
          {transactions.length > 0 && (
            <ItemFormDialog
              clientId={clientId}
              transactions={transactions}
              triggerLabel="Add item"
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">No inspection items yet.</p>
        )}
        {items.map((item) => {
          const tx = transactions.find((t) => t.id === item.transaction_id);
          return (
            <div key={item.id} className={item.resolved ? "opacity-60" : undefined}>
              <div className="flex items-start justify-between gap-2 rounded-lg border p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{item.item}</p>
                    <Badge variant={IMPORTANCE_VARIANT[item.importance_to_client]}>
                      {item.importance_to_client}
                    </Badge>
                    {item.resolved && <Badge variant="secondary">Resolved</Badge>}
                  </div>
                  {tx && <p className="text-xs text-muted-foreground">{transactionLabel(tx)}</p>}
                  {item.negotiation_note && <p className="mt-1 text-sm">{item.negotiation_note}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <ItemFormDialog
                    clientId={clientId}
                    transactions={transactions}
                    item={item}
                    triggerLabel="Edit"
                    triggerVariant="ghost"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
