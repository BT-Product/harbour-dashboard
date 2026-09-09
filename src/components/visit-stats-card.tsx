import { Card, CardContent } from "@/components/ui/card";
import type { VisitStats } from "@/lib/data/agent";

function relative(iso: string) {
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 px-4 py-3 sm:px-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

export function VisitStatsCard({ stats }: { stats: VisitStats }) {
  return (
    <Card>
      <CardContent className="flex flex-col divide-y divide-border p-0 sm:flex-row sm:divide-x sm:divide-y-0">
        <Stat
          label="Last visit"
          value={stats.lastVisitAt ? relative(stats.lastVisitAt) : "Never"}
        />
        <Stat label="Visits this week" value={String(stats.visitsLast7Days)} />
        <Stat label="Week before" value={String(stats.visitsPrior7Days)} />
        <Stat label="Pages opened this week" value={String(stats.viewsLast7Days)} />
      </CardContent>
    </Card>
  );
}
