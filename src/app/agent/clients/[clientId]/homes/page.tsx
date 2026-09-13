import { createClient } from "@/lib/supabase/server";
import { getClientHomesSeen, getClientTours, pendingDebriefTours } from "@/lib/data/agent";
import { HomeSeenCard } from "@/components/home-seen-card";
import { DateGroupCard } from "@/components/date-group-card";
import { groupByDateKey } from "@/lib/date-grouping";
import { DebriefFormDialog, PendingDebriefs } from "../home-debriefs-manager";

export default async function ClientHomesPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const [homes, tours] = await Promise.all([
    getClientHomesSeen(supabase, clientId),
    getClientTours(supabase, clientId),
  ]);

  // Where a finished tour lands. Before this it landed nowhere: it dropped
  // out of Upcoming Tours the moment its start time passed.
  const pending = pendingDebriefTours(tours, homes);
  const topContenders = homes.filter((h) => h.interest_level === "strong");
  const groups = [...groupByDateKey(homes, (h) => h.seen_at).entries()];

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Homes Seen</h2>
        <DebriefFormDialog clientId={clientId} triggerLabel="Add debrief" />
      </div>

      {pending.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="text-sm font-semibold">Toured — needs a debrief</h3>
            <span className="text-xs text-muted-foreground">
              {pending.length} {pending.length === 1 ? "home" : "homes"}
            </span>
          </div>
          <PendingDebriefs clientId={clientId} tours={pending} />
        </div>
      )}

      {topContenders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Top Contenders</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {topContenders.map((home) => (
              <HomeSeenCard
                key={home.id}
                address={home.address}
                clientNotes={home.client_notes}
                interestLevel={home.interest_level}
                seenAt={home.seen_at}
                privateNotes={home.private_notes}
                action={
                  <DebriefFormDialog
                    clientId={clientId}
                    home={home}
                    triggerLabel="Edit"
                    triggerVariant="ghost"
                  />
                }
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">All Homes Seen</h3>
        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {pending.length > 0
              ? "Nothing written up yet — the tours above are waiting on one."
              : "No debriefs yet."}
          </p>
        )}
        {groups.map(([key, items]) => (
          <DateGroupCard
            key={key}
            href={`/agent/clients/${clientId}/homes/${key}`}
            dateKeyStr={key}
            count={items.length}
            countLabel="home"
          />
        ))}
      </div>
    </div>
  );
}
