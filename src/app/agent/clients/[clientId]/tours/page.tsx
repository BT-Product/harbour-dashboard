import { createClient } from "@/lib/supabase/server";
import { getClientTours } from "@/lib/data/agent";
import { formatDateHeading, groupByDateKey } from "@/lib/date-grouping";
import { TourFormDialog, ToursDayManager } from "../tours-manager";

export default async function ClientToursPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const tours = await getClientTours(supabase, clientId);

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

      {groups.map(([key, items]) => (
        <div key={key} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{formatDateHeading(key)}</h3>
          <ToursDayManager clientId={clientId} dateKeyStr={key} tours={items} />
        </div>
      ))}
    </div>
  );
}
