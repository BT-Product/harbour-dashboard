"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendReminderNow } from "./actions";

export function SendReminderButton({
  clientId,
  tourDate,
  clientName,
}: {
  clientId: string;
  tourDate: string;
  clientName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !window.confirm(
        `Email ${clientName} the list of homes for this tour? This goes to them right now.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await sendReminderNow(clientId, tourDate);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Sent to ${result.recipients.join(", ")}`);
    });
  }

  return (
    <Button size="sm" variant="ghost" type="button" disabled={isPending} onClick={handleClick}>
      {isPending ? "Sending…" : "Email reminder now"}
    </Button>
  );
}
