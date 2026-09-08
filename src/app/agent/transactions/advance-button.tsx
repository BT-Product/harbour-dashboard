"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { advanceStage } from "./actions";

export function AdvanceButton({
  transactionId,
  nextStageLabel,
  nextStageKey,
}: {
  transactionId: string;
  nextStageLabel: string;
  nextStageKey: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await advanceStage(transactionId, nextStageKey);
            toast.success(`Advanced to ${nextStageLabel}`);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to advance stage");
          }
        })
      }
    >
      {isPending ? "Advancing…" : `Advance to ${nextStageLabel}`}
    </Button>
  );
}
