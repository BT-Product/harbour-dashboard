import { ShieldAlert } from "lucide-react";

/**
 * Wire fraud is the largest single consumer loss in a residential purchase,
 * and the attack always has the same shape: a buyer who has been told by
 * someone they trust that wiring is the next step, then sent instructions
 * that appear to come from escrow.
 *
 * This deliberately sits outside the stage explainer. That text is narration
 * and gets skimmed — which is exactly what this cannot afford to be — so it
 * gets its own treatment and repeats on every page where the client might be
 * reading about money moving, rather than appearing once at the end.
 *
 * INTERIM COPY. The brokerage's own required wording was requested in the
 * broker review packet (item 01, sent 2026-09-14); replace this verbatim when
 * it arrives rather than merging the two.
 */
export function WireFraudNotice() {
  return (
    <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
      <div className="space-y-1.5 text-sm">
        <p className="font-semibold">Before you send money, verify by phone</p>
        <p className="text-muted-foreground">
          When it&apos;s time to move funds, escrow will send you wiring instructions.{" "}
          <strong className="font-medium text-foreground">
            Call escrow at a number you already have — not one from an email or text — and confirm
            the details by voice before sending anything.
          </strong>{" "}
          We will never email you wiring instructions, and we will never ask you to change them.
          If anything about a request feels rushed or different, stop and call.
        </p>
      </div>
    </div>
  );
}
