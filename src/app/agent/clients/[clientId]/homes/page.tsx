import { createClient } from "@/lib/supabase/server";
import { getClientHomesSeen } from "@/lib/data/agent";
import { HomeSeenCard } from "@/components/home-seen-card";
import { DateGroupCard } from "@/components/date-group-card";
import { groupByDateKey } from "@/lib/date-grouping";
import { DebriefFormDialog } from "../home-debriefs-manager";

export default async function ClientHomesPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const homes = await getClientHomesSeen(supabase, clientId);

  const topContenders = homes.filter((h) => h.interest_level === "strong");
  const groups = [...groupByDateKey(homes, (h) => h.seen_at).entries()];

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Homes Seen</h2>
        <DebriefFormDialog clientId={clientId} triggerLabel="Add debrief" />
      </div>

      {topContenders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Top Contenders</h3>
          <div className="space-y-3">
            {topContenders.map((home) => (
              <div key={home.id} className="relative">
                <HomeSeenCard
                  address={home.address}
                  clientNotes={home.client_notes}
                  interestLevel={home.interest_level}
                  seenAt={home.seen_at}
                  privateNotes={home.private_notes}
                />
                <div className="absolute top-3 right-3">
                  <DebriefFormDialog
                    clientId={clientId}
                    home={home}
                    triggerLabel="Edit"
                    triggerVariant="ghost"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">All Homes Seen</h3>
        {groups.length === 0 && <p className="text-sm text-muted-foreground">No debriefs yet.</p>}
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
