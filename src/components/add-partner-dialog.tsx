"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePartner } from "@/lib/actions/partner";

export function AddPartnerDialog({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await savePartner({ error: null, success: false }, formData);
      if (result.success) {
        toast.success("Saved");
        formRef.current?.reset();
        setOpen(false);
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={className}>{children}</DialogTrigger>
      <DialogContent>
        <form ref={formRef} action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add your spouse or partner</DialogTitle>
            <DialogDescription>
              We&apos;ll keep their name and email on file so your agent knows who else is
              involved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="partner_name">Name</Label>
              <Input id="partner_name" name="partner_name" required placeholder="Jamie Move-Up" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner_email">Email</Label>
              <Input
                id="partner_email"
                name="partner_email"
                type="email"
                required
                placeholder="jamie@example.com"
              />
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
