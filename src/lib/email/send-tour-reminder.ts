import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { DEFAULT_TIME_ZONE, localDayRange } from "@/lib/time-zone";
import { getSendingAgent, missingLicenseReason } from "./agent-signature";
import { sendEmail } from "./send";
import { reminderHtml, reminderSubject, reminderText, type ReminderStop } from "./tour-reminder";

type Admin = SupabaseClient<Database>;

export type ReminderOutcome =
  | { status: "sent"; recipients: string[]; stops: number }
  | { status: "skipped"; reason: string };

// Moved to @/lib/time-zone so the data layer can use them without importing
// the email sender; re-exported for existing callers.
export { DEFAULT_TIME_ZONE, localDateKey, localDayRange } from "@/lib/time-zone";

/**
 * Sends one client their reminder for one tour date. Shared by the nightly
 * cron and the agent's manual "send now", so a tour booked after the cron
 * window — or one the agent wants to re-confirm — goes through exactly the
 * same path.
 *
 * The tour_reminders row is claimed *before* the send. Its unique
 * (client_id, tour_date) constraint is what makes this idempotent: a retry
 * or a second caller finds the row and stops. If the send then fails the
 * claim is released, so a failure retries rather than silently never
 * sending.
 */
export async function sendTourReminder(
  admin: Admin,
  options: { clientId: string; tourDate: string; siteUrl: string; timeZone?: string },
): Promise<ReminderOutcome> {
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
  const { start, end } = localDayRange(options.tourDate, timeZone);

  const { data: tours, error: toursError } = await admin
    .from("tours")
    .select("address, scheduled_at, notes")
    .eq("client_id", options.clientId)
    .gte("scheduled_at", start)
    .lt("scheduled_at", end)
    .order("scheduled_at", { ascending: true });

  if (toursError) return { status: "skipped", reason: toursError.message };
  if (!tours || tours.length === 0) {
    return { status: "skipped", reason: "no tours on that date" };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, partner_email")
    .eq("id", options.clientId)
    .single();

  if (!profile) return { status: "skipped", reason: "no profile" };

  const { data: authUser } = await admin.auth.admin.getUserById(options.clientId);
  const clientEmail = authUser?.user?.email;
  if (!clientEmail) return { status: "skipped", reason: "no email address on file" };

  // Checked before claiming the reminder row, so a missing license number
  // leaves the day unclaimed and the reminder sends once it's added.
  const agent = await getSendingAgent(admin, options.clientId);
  const blocked = missingLicenseReason(agent);
  if (blocked || !agent) return { status: "skipped", reason: blocked ?? "no agent" };

  const recipients = [clientEmail];
  // The partner is on file precisely so they aren't left out of the loop.
  if (profile.partner_email) recipients.push(profile.partner_email);

  const { error: claimError } = await admin.from("tour_reminders").insert({
    client_id: options.clientId,
    tour_date: options.tourDate,
    recipients,
    stop_count: tours.length,
  });

  if (claimError) return { status: "skipped", reason: "already sent for that date" };

  const stops: ReminderStop[] = tours.map((tour) => ({
    address: tour.address,
    scheduledAt: tour.scheduled_at,
    notes: tour.notes,
  }));

  const input = {
    clientName: profile.full_name,
    agent,
    tourDateLabel: new Date(`${options.tourDate}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
    stops,
    dashboardUrl: `${options.siteUrl.replace(/\/+$/, "")}/dashboard/tours`,
    timeZone,
  };

  const result = await sendEmail({
    to: recipients,
    replyTo: agent.email,
    subject: reminderSubject(input),
    html: reminderHtml(input),
    text: reminderText(input),
  });

  if (!result.ok) {
    await admin
      .from("tour_reminders")
      .delete()
      .eq("client_id", options.clientId)
      .eq("tour_date", options.tourDate);
    return { status: "skipped", reason: result.error };
  }

  return { status: "sent", recipients, stops: stops.length };
}
