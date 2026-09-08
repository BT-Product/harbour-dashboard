import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatBarItem {
  icon: LucideIcon;
  value: string | number;
  label: string;
}

export function StatBar({ stats }: { stats: StatBarItem[] }) {
  return (
    <div
      className="grid overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
    >
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn("flex items-center gap-3 px-5 py-4", i > 0 && "border-l border-border")}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl leading-none font-semibold">{stat.value}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
