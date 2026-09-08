import { createClient } from "@/lib/supabase/server";
import { getClientTours } from "@/lib/data/agent";
import { DateGroupCard } from "@/components/date-group-card";
import { groupByDateKey } from "@/lib/date-grouping";
import { TourFormDialog } from "../tours-manager";

export default async function ClientToursPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const tours = await getClientTours(supabase, clientId);

  const groups = [...groupByDateKey(tours, (t) => t.scheduled_at).entries()];

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tours</h2>
        <TourFormDialog clientId={clientId} triggerLabel="Add tour" />
      </div>

      {groups.length === 0 && <p className="text-sm text-muted-foreground">No tours yet.</p>}
      {groups.map(([key, items]) => (
        <DateGroupCard
          key={key}
          href={`/agent/clients/${clientId}/tours/${key}`}
          dateKeyStr={key}
          count={items.length}
          countLabel="home"
        />
      ))}
    </div>
  );
}
