import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getAgentClients, getAgentTours } from "@/lib/data/agent";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AgentHomePage() {
  const supabase = await createClient();
  const [clients, tours] = await Promise.all([
    getAgentClients(supabase),
    getAgentTours(supabase),
  ]);

  const now = new Date().getTime();
  const weekAgo = now - 7 * 86_400_000;
  const weekAhead = now + 7 * 86_400_000;

  const upcoming = tours.filter((t) => {
    const at = new Date(t.scheduled_at).getTime();
    return at >= now && at <= weekAhead;
  });
  const recentPast = tours.filter((t) => {
    const at = new Date(t.scheduled_at).getTime();
    return at < now && at >= weekAgo;
  });

  const activeClientCount = clients.filter((c) =>
    c.transactions.some((t) => t.status === "active"),
  ).length;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Home</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Active clients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{activeClientCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Tours this week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{upcoming.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Tours last week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{recentPast.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming tours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing scheduled in the next 7 days.</p>
          )}
          {upcoming.map((tour) => (
            <Link
              key={tour.id}
              href={`/agent/clients/${tour.client_id}/tours`}
              className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/40"
            >
              <div>
                <span className="font-medium">{tour.profiles?.full_name ?? "Client"}</span>
                <span className="text-muted-foreground"> · {tour.address}</span>
              </div>
              <span className="text-muted-foreground">{formatWhen(tour.scheduled_at)}</span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent tours — got a debrief written?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentPast.length === 0 && (
            <p className="text-sm text-muted-foreground">No tours in the last 7 days.</p>
          )}
          {recentPast.map((tour) => (
            <Link
              key={tour.id}
              href={`/agent/clients/${tour.client_id}/homes`}
              className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/40"
            >
              <div>
                <span className="font-medium">{tour.profiles?.full_name ?? "Client"}</span>
                <span className="text-muted-foreground"> · {tour.address}</span>
              </div>
              <span className="text-muted-foreground">{formatWhen(tour.scheduled_at)}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
