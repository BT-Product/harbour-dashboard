import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { pendingDebriefTours } from "@/lib/data/agent";
import { DEFAULT_TIME_ZONE, dayLabel, localDayRange } from "@/lib/time-zone";
import { getSendingAgent, missingLicenseReason } from "./agent-signature";
import { sendEmail } from "./send";
import { recapHtml, recapSubject, recapText } from "./tour-recap";

type Admin = SupabaseClient<Database>;

export type RecapOutcome =
  | { status: "sent"; recipients: string[]; homes: number }
  | { status: "skipped"; reason: string };

/**
 * Emails one client the recap of one tour day. Only ever triggered by the
 * agent: sending the instant the last debrief saves would go out before they
 * had reread their notes.
 *
 * Mirrors sendTourReminder: the tour_recaps row is claimed before sending so a
 * double-click can't send twice, and released if the send fails.
 */
export async function sendTourRecap(
  admin: Admin,
  options: { clientId: string; tourDate: string; siteUrl: string; timeZone?: string },
): Promise<RecapOutcome> {
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
  const { start, end } = localDayRange(options.tourDate, timeZone);

  // Client-safe columns only, named one by one. This runs with the
  // service-role key, which *can* read private_notes — `select("*")` here
  // would put the agent's private notes one template change away from a
  // client's inbox.
  const [{ data: homes, error: homesError }, { data: tours }] = await Promise.all([
    admin
      .from("homes_seen")
      .select("address, client_notes, interest_level, seen_at")
      .eq("client_id", options.clientId)
      .gte("seen_at", start)
      .lt("seen_at", end),
    admin
      .from("tours")
      .select("*")
      .eq("client_id", options.clientId)
      .gte("scheduled_at", start)
      .lt("scheduled_at", end),
  ]);

  if (homesError) return { status: "skipped", reason: homesError.message };
  if (!homes || homes.length === 0) {
    return { status: "skipped", reason: "no homes written up for that day" };
  }

  // The UI only offers a finished day, but a recap that silently leaves out a
  // home the client walked through would be worse than no recap.
  const unwritten = pendingDebriefTours(tours ?? [], homes);
  if (unwritten.length > 0) {
    return {
      status: "skipped",
      reason: `${unwritten.length} home${unwritten.length === 1 ? "" : "s"} from that tour still need a debrief`,
    };
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

  const agent = await getSendingAgent(admin, options.clientId);
  const blocked = missingLicenseReason(agent);
  if (blocked || !agent) return { status: "skipped", reason: blocked ?? "no agent" };

  const recipients = [clientEmail];
  if (profile.partner_email) recipients.push(profile.partner_email);

  const { error: claimError } = await admin.from("tour_recaps").insert({
    client_id: options.clientId,
    tour_date: options.tourDate,
    recipients,
    home_count: homes.length,
  });
  if (claimError) return { status: "skipped", reason: "a recap already went out for that day" };

  const input = {
    clientName: profile.full_name,
    agent,
    dayLabel: dayLabel(options.tourDate),
    homes: homes.map((h) => ({
      address: h.address,
      clientNotes: h.client_notes,
      interestLevel: h.interest_level,
    })),
    // Tagged so a return visit can later be credited to the recap
    // (strategy.md, measurement). Page views don't record it yet.
    notesUrl: `${options.siteUrl.replace(/\/+$/, "")}/dashboard/homes/${options.tourDate}?from=tour-recap`,
  };

  const result = await sendEmail({
    to: recipients,
    replyTo: agent.email,
    subject: recapSubject(input),
    html: recapHtml(input),
    text: recapText(input),
  });

  if (!result.ok) {
    await admin
      .from("tour_recaps")
      .delete()
      .eq("client_id", options.clientId)
      .eq("tour_date", options.tourDate);
    return { status: "skipped", reason: result.error };
  }

  return { status: "sent", recipients, homes: homes.length };
}
