import { createClient } from "@/lib/supabase/server";
import { getClientProfile, getClientReminderDates, getClientTours } from "@/lib/data/agent";
import { formatDateHeading, groupByDateKey } from "@/lib/date-grouping";
import { TourFormDialog, ToursDayManager } from "../tours-manager";
import { SendReminderButton } from "../send-reminder-button";

export default async function ClientToursPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const [tours, reminders, client] = await Promise.all([
    getClientTours(supabase, clientId),
    getClientReminderDates(supabase, clientId),
    getClientProfile(supabase, clientId),
  ]);

  const now = new Date().getTime();
  const upcoming = tours.filter((t) => new Date(t.scheduled_at).getTime() >= now);
  const groups = [...groupByDateKey(upcoming, (t) => t.scheduled_at).entries()];

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Upcoming Tours</h2>
        <TourFormDialog clientId={clientId} triggerLabel="Schedule a tour" />
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing scheduled. Once a tour&apos;s on the books, the stops show up here — after it
          happens, debrief it under Homes Seen.
        </p>
      )}

      {groups.map(([key, items]) => {
        const reminder = reminders.get(key);
        return (
          <div key={key} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {formatDateHeading(key)}
              </h3>
              {/* So you know the client already has the list in their inbox
                  before you text them about the same tour. */}
              {reminder ? (
                <span className="text-xs text-muted-foreground">
                  · reminder emailed{" "}
                  {new Date(reminder.sent_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  to{" "}
                  {reminder.recipients.length === 1
                    ? "them"
                    : `${reminder.recipients.length} people`}
                </span>
              ) : (
                <SendReminderButton
                  clientId={clientId}
                  tourDate={key}
                  clientName={client.full_name}
                />
              )}
            </div>
            <ToursDayManager clientId={clientId} dateKeyStr={key} tours={items} />
          </div>
        );
      })}
    </div>
  );
}
