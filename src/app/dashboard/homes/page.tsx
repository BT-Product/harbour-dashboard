import { createClient } from "@/lib/supabase/server";
import { HomeSeenCard } from "@/components/home-seen-card";
import { DateGroupCard } from "@/components/date-group-card";
import { groupByDateKey } from "@/lib/date-grouping";

export default async function HomesSeenPage() {
  const supabase = await createClient();
  const { data: homes, error } = await supabase
    .from("homes_seen")
    .select("id, address, client_notes, interest_level, seen_at")
    .order("seen_at", { ascending: false });

  if (error) throw error;

  const topContenders = (homes ?? []).filter((h) => h.interest_level === "strong");
  const groups = [...groupByDateKey(homes ?? [], (h) => h.seen_at).entries()];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Homes Seen</h1>

        {(!homes || homes.length === 0) && (
          <p className="text-sm text-muted-foreground">
            No home tours debriefed yet. They&apos;ll show up here after your next showing.
          </p>
        )}
      </div>

      {topContenders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Top Contenders</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {topContenders.map((home) => (
              <HomeSeenCard
                key={home.id}
                address={home.address}
                clientNotes={home.client_notes}
                interestLevel={home.interest_level}
                seenAt={home.seen_at}
              />
            ))}
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-muted-foreground">
            All Homes Seen
          </h2>
          {groups.map(([key, items]) => (
            <DateGroupCard
              key={key}
              href={`/dashboard/homes/${key}`}
              dateKeyStr={key}
              count={items.length}
              countLabel="home"
            />
          ))}
        </div>
      )}
    </div>
  );
}
