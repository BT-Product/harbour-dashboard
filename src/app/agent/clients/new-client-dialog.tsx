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
import { inviteClient } from "./actions";

export function NewClientDialog() {
  const [open, setOpen] = useState(false);
  // Controlled rather than uncontrolled: React resets the form once the
  // action resolves, and an invite that Supabase rejects (bad address,
  // already invited) shouldn't make the agent retype everything.
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit() {
    startTransition(async () => {
      const result = await inviteClient({
        fullName,
        email,
        phone: phone || null,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Invite sent — they'll set their own password");
      setOpen(false);
      setFullName("");
      setEmail("");
      setPhone("");
      // Straight to their page: a new client has no transaction yet, and
      // that's the next thing that has to happen for them to see anything.
      router.push(`/agent/clients/${result.data.clientId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" type="button" />}>Add client</DialogTrigger>
      <DialogContent>
        <form action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add a client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Sends an invite email. They set their own password from the link — you never handle
              it.
            </p>
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                required
                placeholder="Jane Client"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="555-0100"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending invite…" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
