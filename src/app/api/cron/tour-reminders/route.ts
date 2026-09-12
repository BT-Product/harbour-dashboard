import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { emailConfigured } from "@/lib/email/send";
import {
  DEFAULT_TIME_ZONE,
  localDateKey,
  localDayRange,
  sendTourReminder,
} from "@/lib/email/send-tour-reminder";

/**
 * Sends each client one reminder for tomorrow's tour, listing every stop.
 * Runs nightly from Vercel Cron; see vercel.json for the schedule.
 *
 * Tomorrow means tomorrow where the tour happens, not wherever the server
 * woke up. A tour booked after tonight's run gets no reminder — the agent
 * can send one by hand from the client's Upcoming Tours tab.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Without a secret the route refuses rather than running open to anyone
  // who guesses the path. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!emailConfigured()) {
    return NextResponse.json({ error: "email is not configured" }, { status: 503 });
  }

  const admin = createServiceRoleClient();
  const tourDate = localDateKey(1, DEFAULT_TIME_ZONE);
  const { start, end } = localDayRange(tourDate, DEFAULT_TIME_ZONE);

  const { data: tours, error } = await admin
    .from("tours")
    .select("client_id")
    .gte("scheduled_at", start)
    .lt("scheduled_at", end);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const clientIds = [...new Set((tours ?? []).map((t) => t.client_id))];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://harbour-dashboard-ten.vercel.app";

  const results: Record<string, string> = {};
  for (const clientId of clientIds) {
    const outcome = await sendTourReminder(admin, { clientId, tourDate, siteUrl });
    results[clientId] = outcome.status === "sent" ? "sent" : `skipped: ${outcome.reason}`;
  }

  return NextResponse.json({ tourDate, clients: clientIds.length, results });
}
