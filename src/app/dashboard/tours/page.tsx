import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatDateHeading, groupByDateKey } from "@/lib/date-grouping";

export default async function ToursPage() {
  const supabase = await createClient();
  const { data: tours, error } = await supabase
    .from("tours")
    .select("id, address, scheduled_at, notes")
    .order("scheduled_at", { ascending: true });

  if (error) throw error;

  const now = new Date().getTime();
  const upcoming = (tours ?? []).filter((t) => new Date(t.scheduled_at).getTime() >= now);
  const groups = [...groupByDateKey(upcoming, (t) => t.scheduled_at).entries()];

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Upcoming Tours</h1>

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No tours scheduled right now. Once one&apos;s on the books, the homes on it will show up
          here — after the tour, look for them under Homes Seen.
        </p>
      )}

      {groups.map(([key, items]) => (
        <div key={key} className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">{formatDateHeading(key)}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((tour) => (
              <Card key={tour.id}>
                <CardHeader>
                  <CardTitle className="text-base">{tour.address}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {new Date(tour.scheduled_at).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </CardHeader>
                {tour.notes && (
                  <CardContent>
                    <p className="text-sm">{tour.notes}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
