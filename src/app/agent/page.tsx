import { Building2, CalendarCheck, CalendarClock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatBar } from "@/components/stat-bar";
import { IconListRow } from "@/components/icon-list-row";
import { createClient } from "@/lib/supabase/server";
import { getAgentClients, getAgentTours } from "@/lib/data/agent";
import { getCurrentProfile } from "@/lib/data/dashboard";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function AgentHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [profile, clients, tours] = await Promise.all([
    getCurrentProfile(supabase, user!.id),
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

  const firstName = profile.full_name.split(" ")[0];
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {greeting()}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      <StatBar
        stats={[
          { icon: Users, value: activeClientCount, label: "Active clients" },
          { icon: CalendarCheck, value: upcoming.length, label: "Tours this week" },
          { icon: CalendarClock, value: recentPast.length, label: "Tours last week" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming tours</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {upcoming.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">
                Nothing scheduled in the next 7 days.
              </p>
            )}
            {upcoming.map((tour) => (
              <IconListRow
                key={tour.id}
                href={`/agent/clients/${tour.client_id}/tours`}
                icon={Building2}
                title={tour.profiles?.full_name ?? "Client"}
                subtitle={tour.address}
                trailing={formatWhen(tour.scheduled_at)}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent tours — got a debrief written?</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {recentPast.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">No tours in the last 7 days.</p>
            )}
            {recentPast.map((tour) => (
              <IconListRow
                key={tour.id}
                href={`/agent/clients/${tour.client_id}/homes`}
                icon={Building2}
                title={tour.profiles?.full_name ?? "Client"}
                subtitle={tour.address}
                trailing={formatWhen(tour.scheduled_at)}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
