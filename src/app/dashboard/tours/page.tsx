import { createClient } from "@/lib/supabase/server";
import { DateGroupCard } from "@/components/date-group-card";
import { groupByDateKey } from "@/lib/date-grouping";

export default async function ToursPage() {
  const supabase = await createClient();
  const { data: tours, error } = await supabase
    .from("tours")
    .select("id, address, scheduled_at, notes")
    .order("scheduled_at", { ascending: true });

  if (error) throw error;

  const now = new Date().getTime();
  const upcoming = (tours ?? []).filter((t) => new Date(t.scheduled_at).getTime() >= now);
  const past = (tours ?? []).filter((t) => new Date(t.scheduled_at).getTime() < now);

  const upcomingGroups = [...groupByDateKey(upcoming, (t) => t.scheduled_at).entries()];
  const pastGroups = [...groupByDateKey(past, (t) => t.scheduled_at).entries()].reverse();

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Upcoming Tours</h1>
        {upcomingGroups.length === 0 && (
          <p className="text-sm text-muted-foreground">No tours scheduled right now.</p>
        )}
        {upcomingGroups.map(([key, items]) => (
          <DateGroupCard
            key={key}
            href={`/dashboard/tours/${key}`}
            dateKeyStr={key}
            count={items.length}
            countLabel="home"
          />
        ))}
      </div>

      {pastGroups.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-muted-foreground">
            Past Tours
          </h2>
          {pastGroups.map(([key, items]) => (
            <DateGroupCard
              key={key}
              href={`/dashboard/tours/${key}`}
              dateKeyStr={key}
              count={items.length}
              countLabel="home"
              className="opacity-80"
            />
          ))}
        </div>
      )}
    </div>
  );
}
