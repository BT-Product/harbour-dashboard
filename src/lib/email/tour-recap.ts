import type { InterestLevel } from "@/lib/supabase/database.types";
import { signatureHtml, signatureText, type SendingAgent } from "./agent-signature";

/**
 * The tour recap: the homes from one tour day and the agent's read on each.
 *
 * Its job is to bring the client back to the dashboard, where their full notes
 * live beside their other homes — so each home gets an excerpt, not the whole
 * debrief. That is not withholding: nothing here is a finding or a source
 * document, the full text is one tap away, and the excerpt never cuts a
 * sentence mid-thought without saying so.
 *
 * It ends on a question answered by replying to the agent, because the point of
 * bringing a client back is the conversation, not the page view
 * (strategy.md: the visit threshold is a proxy for felt care).
 */

export type RecapHome = {
  address: string;
  clientNotes: string | null;
  interestLevel: InterestLevel | null;
};

export type RecapInput = {
  clientName: string;
  agent: SendingAgent;
  dayLabel: string;
  homes: RecapHome[];
  notesUrl: string;
};

const INTEREST_LABEL: Record<InterestLevel, string> = {
  strong: "Strong interest",
  maybe: "Maybe",
  pass: "Passed",
};

const INTEREST_ORDER: (InterestLevel | null)[] = ["strong", "maybe", "pass", null];

const EXCERPT_LIMIT = 140;

/** The first line of the notes, shortened at a word boundary if it runs long. */
export function excerpt(notes: string | null): string | null {
  const firstLine = notes?.split("\n").map((l) => l.trim()).find(Boolean);
  if (!firstLine) return null;
  if (firstLine.length <= EXCERPT_LIMIT) return firstLine;
  const cut = firstLine.slice(0, EXCERPT_LIMIT);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 60 ? cut.lastIndexOf(" ") : EXCERPT_LIMIT).trimEnd()}…`;
}

/** Favourites first, so the email leads with what the client is weighing. */
export function orderHomes(homes: RecapHome[]): RecapHome[] {
  return [...homes].sort(
    (a, b) => INTEREST_ORDER.indexOf(a.interestLevel) - INTEREST_ORDER.indexOf(b.interestLevel),
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstName(full: string) {
  return full.split(" ")[0];
}

export function recapSubject(input: RecapInput) {
  const n = input.homes.length;
  const day = input.dayLabel.split(",")[0];
  return `Your notes from ${day}'s tour — ${n} home${n === 1 ? "" : "s"}`;
}

export function recapText(input: RecapInput) {
  const lines = [
    `Hi ${firstName(input.clientName)},`,
    "",
    `I've written up the homes we saw on ${input.dayLabel}.`,
    "",
    ...orderHomes(input.homes).flatMap((home) => {
      const head = home.interestLevel
        ? `${home.address} — ${INTEREST_LABEL[home.interestLevel]}`
        : home.address;
      const note = excerpt(home.clientNotes);
      return note ? [head, `   ${note}`, ""] : [head, ""];
    }),
    `Your full notes, next to every home you've seen: ${input.notesUrl}`,
    "",
    "Which one stayed with you? Just reply to this email.",
    "",
    ...signatureText(input.agent),
  ];
  return lines.join("\n");
}

export function recapHtml(input: RecapInput) {
  const rows = orderHomes(input.homes)
    .map((home) => {
      const note = excerpt(home.clientNotes);
      const badge = home.interestLevel
        ? `<span style="display:inline-block;margin-left:6px;padding:1px 8px;border:1px solid #d6dbe1;border-radius:999px;font-size:12px;color:#4a4f57;white-space:nowrap;">${INTEREST_LABEL[home.interestLevel]}</span>`
        : "";
      const noteHtml = note
        ? `<div style="color:#5a6069;font-size:14px;line-height:1.5;margin-top:4px;">${escapeHtml(note)}</div>`
        : "";
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eceae5;">
            <div style="font-size:15px;color:#1c1c1c;"><strong>${escapeHtml(home.address)}</strong>${badge}</div>
            ${noteHtml}
          </td>
        </tr>`;
    })
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1c1c;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eceae5;border-radius:12px;padding:28px;">
      <p style="margin:0 0 16px;font-size:16px;">Hi ${escapeHtml(firstName(input.clientName))},</p>

      <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
        I've written up the homes we saw on ${escapeHtml(input.dayLabel)}.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${rows}</table>

      <p style="margin:0 0 20px;">
        <a href="${escapeHtml(input.notesUrl)}" style="display:inline-block;background:#1f4e46;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:15px;">Read your full notes</a>
      </p>

      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#4a4a4a;">
        Which one stayed with you? Just reply to this email.
      </p>

      ${signatureHtml(input.agent)}
    </div>
  </body>
</html>`;
}
