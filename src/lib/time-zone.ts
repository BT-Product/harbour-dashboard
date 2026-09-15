/**
 * Calendar dates where the client is, not where the server is.
 *
 * Vercel runs in UTC, and on the Pacific coast any tour after 5pm falls on the
 * next UTC day. Anything that groups tours or homes by day on the server — the
 * reminder window, which tours still need a debrief, which days are ready for
 * a recap — has to use these rather than a plain `new Date().getDate()`.
 */

export const DEFAULT_TIME_ZONE = process.env.TOUR_TIME_ZONE ?? "America/Los_Angeles";

/** The local calendar date of an instant, as YYYY-MM-DD. */
export function zonedDateKey(iso: string, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone });
}

/** The local calendar date n days from now, as YYYY-MM-DD. */
export function localDateKey(daysFromNow: number, timeZone: string = DEFAULT_TIME_ZONE): string {
  return zonedDateKey(new Date(Date.now() + daysFromNow * 86_400_000).toISOString(), timeZone);
}

/**
 * The UTC instants bounding a local calendar day. Parsing
 * "2026-09-13T00:00:00" directly would anchor it to the server's zone — UTC
 * on Vercel — shifting the window by the offset, which on the Pacific coast
 * means missing every tour before 5pm and picking up the previous evening's.
 */
export function localDayRange(dateKey: string, timeZone: string = DEFAULT_TIME_ZONE): {
  start: string;
  end: string;
} {
  const midnightUtc = new Date(`${dateKey}T00:00:00Z`).getTime();
  const shown = new Date(midnightUtc);
  const zoned = new Date(shown.toLocaleString("en-US", { timeZone })).getTime();
  const utc = new Date(shown.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  const start = midnightUtc + (utc - zoned);
  return {
    start: new Date(start).toISOString(),
    end: new Date(start + 86_400_000).toISOString(),
  };
}

/** "Saturday, September 13" for a YYYY-MM-DD key. Noon avoids any day shift. */
export function dayLabel(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
