"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { KeyDates, StageDefinition, Transaction } from "@/lib/supabase/database.types";
import { transactionLabel } from "@/lib/data/dashboard";
import { updateKeyDates, updateStage } from "./actions";

const DATE_FIELDS: { key: keyof KeyDates; label: string }[] = [
  { key: "contract_date", label: "Contract signed" },
  { key: "contingency_removal_date", label: "Contingencies removed" },
  { key: "coe_date", label: "Close of escrow" },
];

function toDateInputValue(value: string | undefined): string {
  return value ? value.slice(0, 10) : "";
}

export function TransactionEditor({
  clientId,
  transaction,
  stages,
}: {
  clientId: string;
  transaction: Transaction;
  stages: StageDefinition[];
}) {
  const typeStages = stages
    .filter((s) => s.transaction_type === transaction.type)
    .sort((a, b) => a.sort_order - b.sort_order);

  const [stageKey, setStageKey] = useState(transaction.current_stage_key);
  const [dates, setDates] = useState<Record<string, string>>({
    contract_date: toDateInputValue(transaction.key_dates?.contract_date),
    contingency_removal_date: toDateInputValue(transaction.key_dates?.contingency_removal_date),
    coe_date: toDateInputValue(transaction.key_dates?.coe_date),
  });
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        if (stageKey !== transaction.current_stage_key) {
          await updateStage(clientId, transaction.id, stageKey);
        }
        const keyDates: KeyDates = {};
        for (const { key } of DATE_FIELDS) {
          if (dates[key]) keyDates[key] = new Date(dates[key]).toISOString();
        }
        await updateKeyDates(clientId, transaction.id, keyDates);
        toast.success("Saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{transactionLabel(transaction)}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {transaction.type === "buy" ? "Purchase" : "Sale"} · {transaction.status}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={stageKey} onValueChange={(v) => setStageKey(v ?? stageKey)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) => typeStages.find((s) => s.stage_key === value)?.label ?? value}
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
          </div>

          {DATE_FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`${transaction.id}-${key}`}>{label}</Label>
              <Input
                id={`${transaction.id}-${key}`}
                type="date"
                value={dates[key]}
                onChange={(e) => setDates((d) => ({ ...d, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <Button onClick={handleSave} disabled={isPending} size="sm">
          {isPending ? "Saving…" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
