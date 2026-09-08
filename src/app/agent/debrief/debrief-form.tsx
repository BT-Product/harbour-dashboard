"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveDebrief, type DebriefFormState } from "./actions";
import type { InterestLevel } from "@/lib/supabase/database.types";

const INTEREST_OPTIONS: { value: InterestLevel; label: string }[] = [
  { value: "pass", label: "Pass" },
  { value: "maybe", label: "Maybe" },
  { value: "strong", label: "Strong" },
];

const initialState: DebriefFormState = { error: null, success: false };

export function DebriefForm({
  clients,
}: {
  clients: { id: string; full_name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(saveDebrief, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Debrief saved");
      formRef.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const today = new Date().toISOString().slice(0, 16);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="client_id" className="text-base">
          Client
        </Label>
        <select
          id="client_id"
          name="client_id"
          required
          defaultValue=""
          className="h-12 w-full rounded-md border border-input bg-background px-3 text-base"
        >
          <option value="" disabled>
            Select a client
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address" className="text-base">
          Address
        </Label>
        <Input
          id="address"
          name="address"
          required
          placeholder="123 Main St"
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-base">Interest level</Label>
        <div className="grid grid-cols-3 gap-2">
          {INTEREST_OPTIONS.map((opt) => (
            <div key={opt.value}>
              <input
                type="radio"
                id={`interest_${opt.value}`}
                name="interest_level"
                value={opt.value}
                className="peer sr-only"
              />
              <label
                htmlFor={`interest_${opt.value}`}
                className="flex h-12 w-full cursor-pointer items-center justify-center rounded-md border border-input bg-background text-base font-medium transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground"
              >
                {opt.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="client_notes" className="text-base">
          Client-facing notes
        </Label>
        <Textarea
          id="client_notes"
          name="client_notes"
          rows={3}
          placeholder="What they'll see — pluses and minuses"
          className="text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="private_notes" className="text-base">
          Private notes
        </Label>
        <Textarea
          id="private_notes"
          name="private_notes"
          rows={3}
          placeholder="Only you see this — negotiation read, seller motivation, strategy"
          className="text-base"
        />
      </div>

      <input type="hidden" name="seen_at" value={today} />

      <Button type="submit" size="lg" className="h-14 w-full text-base" disabled={isPending}>
        {isPending ? "Saving…" : "Save debrief"}
      </Button>
    </form>
  );
}
