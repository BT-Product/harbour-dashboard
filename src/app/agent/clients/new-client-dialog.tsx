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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { StageDefinition } from "@/lib/supabase/database.types";
import { inviteClient } from "./actions";

type Role = "buying" | "selling" | "both";

const ROLES: { key: Role; label: string; hint: string }[] = [
  { key: "buying", label: "Buying", hint: "Touring homes, or already in contract" },
  { key: "selling", label: "Selling", hint: "Prepping or already listed" },
  { key: "both", label: "Both", hint: "Selling one home and buying the next" },
];

export function NewClientDialog({ stages }: { stages: StageDefinition[] }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Controlled rather than uncontrolled: React resets the form once the
  // action resolves, and an invite that Supabase rejects (bad address,
  // already invited) shouldn't make the agent retype everything.
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("buying");
  const [buyStage, setBuyStage] = useState("house_hunting");
  const [buyAddress, setBuyAddress] = useState("");
  const [sellStage, setSellStage] = useState("prep");
  const [sellAddress, setSellAddress] = useState("");

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const buying = role === "buying" || role === "both";
  const selling = role === "selling" || role === "both";

  const stagesFor = (type: "buy" | "sell") =>
    stages.filter((s) => s.transaction_type === type).sort((a, b) => a.sort_order - b.sort_order);
  const buyStages = stagesFor("buy");
  const sellStages = stagesFor("sell");

  const buyNeedsAddress = buyStages.find((s) => s.stage_key === buyStage)?.requires_property ?? true;

  function reset() {
    setStep(1);
    setFullName("");
    setEmail("");
    setPhone("");
    setRole("buying");
    setBuyStage("house_hunting");
    setBuyAddress("");
    setSellStage("prep");
    setSellAddress("");
  }

  function handleNext() {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Name and email are both required");
      return;
    }
    setStep(2);
  }

  function handleSubmit() {
    if (selling && !sellAddress.trim()) {
      toast.error("Add the address of the home they're selling");
      return;
    }
    if (buying && buyNeedsAddress && !buyAddress.trim()) {
      toast.error("That stage needs the address of the home they're buying");
      return;
    }

    startTransition(async () => {
      const result = await inviteClient({
        fullName,
        email,
        phone: phone || null,
        buying,
        selling,
        buyStageKey: buying ? buyStage : null,
        buyAddress: buying && buyNeedsAddress ? buyAddress : null,
        sellStageKey: selling ? sellStage : null,
        sellAddress: selling ? sellAddress : null,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Invite sent — they'll set their own password");
      setOpen(false);
      reset();
      // Straight to their page: tours and homes they've already seen are
      // the next thing to fill in, and that's where those live.
      router.push(`/agent/clients/${result.data.clientId}`);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" type="button" />}>Add client</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{step === 1 ? "Add a client" : "Where are they?"}</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Sends an invite email. They set their own password from the link — you never handle
              it.
            </p>
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
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
                placeholder="555-0100"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>What are they doing?</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {ROLES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRole(r.key)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      role === r.key
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/60",
                    )}
                  >
                    <span className="block text-sm font-medium">{r.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{r.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 py-4">
            {selling && (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium">The home they&apos;re selling</p>
                <div className="space-y-2">
                  <Label htmlFor="sell_address">Address</Label>
                  <Input
                    id="sell_address"
                    required
                    placeholder="930 Ridgeline Ave"
                    value={sellAddress}
                    onChange={(e) => setSellAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Where are they in the sale?</Label>
                  <StageSelect stages={sellStages} value={sellStage} onChange={setSellStage} />
                </div>
              </div>
            )}

            {buying && (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium">Their purchase</p>
                <div className="space-y-2">
                  <Label>Where are they in the search?</Label>
                  <StageSelect stages={buyStages} value={buyStage} onChange={setBuyStage} />
                </div>
                {buyNeedsAddress ? (
                  <div className="space-y-2">
                    <Label htmlFor="buy_address">Address they&apos;re buying</Label>
                    <Input
                      id="buy_address"
                      required
                      placeholder="88 Sunset Terrace"
                      value={buyAddress}
                      onChange={(e) => setBuyAddress(e.target.value)}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No address needed yet. You&apos;ll add their tours and any homes they&apos;ve
                    already seen on their page next.
                  </p>
                )}
              </div>
            )}

            {selling && buying && (
              <p className="text-xs text-muted-foreground">
                The two are linked automatically, which turns on the coordination view comparing
                their timelines.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 2 && (
            <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={isPending}>
              Back
            </Button>
          )}
          {step === 1 ? (
            <Button type="button" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Sending invite…" : "Send invite"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StageSelect({
  stages,
  value,
  onChange,
}: {
  stages: StageDefinition[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange((v as string) ?? value)}>
      <SelectTrigger className="w-full">
        <SelectValue>
          {(v: string) => stages.find((s) => s.stage_key === v)?.label ?? v}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {stages.map((s) => (
          <SelectItem key={s.stage_key} value={s.stage_key}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
