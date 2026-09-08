"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ClientTabs({ clientId, hasBuy }: { clientId: string; hasBuy: boolean }) {
  const pathname = usePathname();
  const base = `/agent/clients/${clientId}`;

  const items = [
    { href: base, label: "Overview" },
    ...(hasBuy ? [{ href: `${base}/tours`, label: "Upcoming Tours" }] : []),
    ...(hasBuy ? [{ href: `${base}/homes`, label: "Homes Seen" }] : []),
    { href: `${base}/inspections`, label: "Inspections" },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto border-b">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
