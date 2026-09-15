/**
 * The agent's real estate license number, as clients see it.
 *
 * California requires a licensee's DRE number on marketing and client-facing
 * material — every Harbour email and the client dashboard — and the same will
 * hold for every future agent. The exact wording and placement are for the
 * brokerage to confirm; this is the one place the format lives.
 */

export function formatLicense(dreNumber: string): string {
  return `DRE #${dreNumber}`;
}

/**
 * Whether a stored value is a real license number. Placeholders like "TBD"
 * (what the seed used to write) count as missing everywhere — printing
 * "DRE #TBD" on a client email is worse than printing nothing and not sending.
 */
export function hasLicense(dreNumber: string | null | undefined): dreNumber is string {
  return typeof dreNumber === "string" && /^\d{8}$/.test(dreNumber);
}

/**
 * Accepts what an agent is likely to paste ("DRE #01234567", "CalDRE 0123
 * 4567") and returns the bare number, or an error to show them.
 *
 * California DRE numbers are 8 digits, often with leading zeros, so they're
 * kept as text. An agent licensed elsewhere would need this relaxed per state.
 */
export function normalizeDreNumber(
  input: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, value: null };
  const digits = trimmed.replace(/^(cal\s*)?dre\s*(lic(ense)?\.?)?\s*(#|no\.?)?/i, "").replace(/[\s-]/g, "");
  if (!/^\d{8}$/.test(digits)) {
    return { ok: false, error: "A California DRE license number is 8 digits, like 01234567." };
  }
  return { ok: true, value: digits };
}
