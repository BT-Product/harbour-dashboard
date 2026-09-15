"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendRecapNow } from "./actions";

export function SendRecapButton({
  clientId,
  tourDate,
  dayLabel,
  clientName,
}: {
  clientId: string;
  tourDate: string;
  dayLabel: string;
  clientName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !window.confirm(
        `Email ${clientName} the recap of ${dayLabel}? It includes the start of your client-facing notes for each home — worth a reread first. This goes to them right now.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await sendRecapNow(clientId, tourDate);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Recap sent to ${result.recipients.join(", ")}`);
    });
  }

  return (
    <Button size="sm" type="button" disabled={isPending} onClick={handleClick}>
      {isPending ? "Sending…" : "Send recap"}
    </Button>
  );
}
