import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatBarItem {
  icon: LucideIcon;
  value: string | number;
  label: string;
}

// Written out literally so Tailwind can see the class names at build time.
const COLUMNS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

export function StatBar({ stats }: { stats: StatBarItem[] }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10",
        COLUMNS[stats.length] ?? "sm:grid-cols-3",
      )}
    >
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              "flex items-center gap-3 px-5 py-4",
              i > 0 && "border-t border-border sm:border-t-0 sm:border-l",
            )}
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
