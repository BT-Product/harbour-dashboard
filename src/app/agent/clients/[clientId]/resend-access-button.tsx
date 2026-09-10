"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resendAccessLink } from "../actions";

export function ResendAccessButton({
  clientId,
  variant = "outline",
  label = "Send them a sign-in link",
}: {
  clientId: string;
  variant?: "outline" | "ghost" | "default";
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await resendAccessLink(clientId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Link sent to ${result.data.email}`);
    });
  }

  return (
    <Button size="sm" variant={variant} type="button" disabled={isPending} onClick={handleClick}>
      {isPending ? "Sending…" : label}
    </Button>
  );
}
