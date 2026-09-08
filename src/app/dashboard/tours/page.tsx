import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function ToursPage() {
  const supabase = await createClient();
  const { data: tours, error } = await supabase
    .from("tours")
    .select("id, address, scheduled_at, notes")
    .order("scheduled_at", { ascending: true });

  if (error) throw error;

  const now = new Date().getTime();
  const upcoming = (tours ?? []).filter((t) => new Date(t.scheduled_at).getTime() >= now);
  const past = (tours ?? []).filter((t) => new Date(t.scheduled_at).getTime() < now).reverse();

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Upcoming Tours</h1>
        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">No tours scheduled right now.</p>
        )}
        {upcoming.map((tour) => (
          <Card key={tour.id}>
            <CardHeader>
              <CardTitle className="text-base">{tour.address}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {new Date(tour.scheduled_at).toLocaleString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
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

      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-muted-foreground">
            Past Tours
          </h2>
          {past.map((tour) => (
            <Card key={tour.id} className="opacity-70">
              <CardHeader>
                <CardTitle className="text-base">{tour.address}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(tour.scheduled_at).toLocaleDateString()}
                </p>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
