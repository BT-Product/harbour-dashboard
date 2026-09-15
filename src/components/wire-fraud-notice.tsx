import { ShieldAlert } from "lucide-react";
import type { AgentContact } from "@/lib/data/dashboard";
import type { Transaction } from "@/lib/supabase/database.types";

type EscrowContact = Pick<Transaction, "escrow_company" | "escrow_officer" | "escrow_phone">;

function PhoneLink({ phone }: { phone: string }) {
  // Most clients read this on a phone; the number should be one tap away.
  return (
    <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="whitespace-nowrap underline">
      {phone}
    </a>
  );
}

/**
 * Wire fraud is the largest single consumer loss in a residential purchase,
 * and it follows a script: a buyer expecting wiring instructions receives a
 * convincing email with a link or an "updated" account, and sends the money.
 *
 * What protects them is a phone number they did not get from email. The
 * dashboard is well placed to supply it — it sits behind a login, on a channel
 * separate from the client's inbox, so someone who has compromised that inbox
 * cannot change what this shows. Escrow's name is included to help the client
 * recognise the real portal email, but names alone protect no one: attackers
 * reuse real officers' names.
 *
 * Two versions. With an escrow phone entered, the client is told exactly who
 * to call. Without one, the general version — never a blank or placeholder
 * number.
 *
 * It does NOT say "we will never email you wiring instructions". The first
 * version did, and escrow does email clients — a link to a secure portal.
 * Telling a client those emails don't exist makes them distrust the real one.
 *
 * Still interim: the brokerage's required wording was requested in the broker
 * review packet (item 01).
 */
export function WireFraudNotice({
  escrow,
  agent,
}: {
  escrow: EscrowContact | null;
  agent: AgentContact | null;
}) {
  const officer = escrow?.escrow_officer ?? null;
  const company = escrow?.escrow_company ?? null;
  const escrowPhone = escrow?.escrow_phone ?? null;
  const agentFirstName = agent?.name.split(" ")[0] ?? null;

  const whoIsEscrow =
    officer && company
      ? `Your escrow is with ${officer} at ${company}.`
      : company
        ? `Your escrow is with ${company}.`
        : officer
          ? `Your escrow officer is ${officer}.`
          : null;

  return (
    <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
      <div className="space-y-2 text-sm">
        <p className="font-semibold">Before you wire money, call to confirm</p>

        {escrowPhone ? (
          <>
            <p className="text-muted-foreground">
              {whoIsEscrow && <>{whoIsEscrow} </>}
              {whoIsEscrow ? "They'll" : "Escrow will"} send you a link to a secure portal where
              you&apos;ll find your wiring instructions.
            </p>
            <p className="text-muted-foreground">
              <strong className="font-medium text-foreground">
                Before sending anything, call {officer ?? company ?? "escrow"} at{" "}
                <PhoneLink phone={escrowPhone} />.
              </strong>{" "}
              Use this number, not one from an email, text, or the portal itself, and confirm the
              account details out loud.
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">
            Once escrow opens, you&apos;ll get a link to a secure portal with your wiring
            instructions.{" "}
            <strong className="font-medium text-foreground">
              Before sending anything, call your escrow officer at a number you got from{" "}
              {agentFirstName ?? "your agent"} or the escrow company&apos;s official website
            </strong>{" "}
            — not one from an email, text, or the portal — and confirm the details out loud.
          </p>
        )}

        <p className="text-muted-foreground">
          Wiring instructions don&apos;t change once they&apos;re sent. If anyone says they have,
          even someone who seems to be escrow or {agentFirstName ?? "your agent"}, don&apos;t send
          money.{" "}
          {agent?.phone ? (
            <>
              Call {agentFirstName} at <PhoneLink phone={agent.phone} />.
            </>
          ) : (
            <>Call {agentFirstName ?? "your agent"} directly.</>
          )}
        </p>
      </div>
    </div>
  );
}
