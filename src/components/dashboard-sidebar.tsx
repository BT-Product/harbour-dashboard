"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  ClipboardCheck,
  Home,
  LayoutDashboard,
  Milestone,
  UserPlus,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AddPartnerDialog } from "@/components/add-partner-dialog";
import { SignOutButton } from "@/components/sign-out-button";
import { useSidebarDrawer } from "@/components/app-shell";

/**
 * Sections appear as the client's transaction earns them, and never
 * disappear again. A house hunter opening Inspections and Financials found
 * two empty rooms and no way to tell whether that was the app or their
 * deal — the first real client opened all six sections in 37 seconds
 * looking for what was in them.
 *
 * `unlocked` is therefore about whether a section has anything to say yet,
 * not about permissions. The gates are all things that only ever become
 * true (a home seen stays seen, a pre-approval stays on file), so the menu
 * grows through the transaction and never shrinks.
 */
export type UnlockedSections = {
  hasBuy: boolean;
  hasHomesSeen: boolean;
  hasInspectionItems: boolean;
  hasPreapproval: boolean;
};

/**
 * Sections that came into existence *after* this client had already been
 * using the app, and that they haven't opened yet — computed in the layout
 * from when the underlying data was created versus when they first signed
 * in. Both halves matter: "never opened" alone would badge a section that
 * has been sitting there since day one, which is unopened, not new.
 *
 * Nothing extra is stored. Opening the section records a page view through
 * VisitBeacon, and that is what turns the badge off — on any device.
 */
export type NewSections = string[];

const ALL_NAV_ITEMS: {
  href: string;
  label: string;
  icon: LucideIcon;
  unlocked: (u: UnlockedSections) => boolean;
}[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, unlocked: () => true },
  // A buyer's current phase — visible from the start, because touring is
  // what they're doing before anything else exists.
  {
    href: "/dashboard/tours",
    label: "Upcoming Tours",
    icon: CalendarCheck,
    unlocked: (u) => u.hasBuy,
  },
  {
    href: "/dashboard/homes",
    label: "Homes Seen",
    icon: Home,
    unlocked: (u) => u.hasHomesSeen,
  },
  // "Timeline", not "Escrow": it shows the whole journey including the
  // stages before a contract exists, and a house hunter is not in escrow.
  { href: "/dashboard/escrow", label: "Timeline", icon: Milestone, unlocked: () => true },
  {
    href: "/dashboard/inspections",
    label: "Inspections",
    icon: ClipboardCheck,
    unlocked: (u) => u.hasInspectionItems,
  },
  {
    href: "/dashboard/financials",
    label: "Financials",
    icon: Wallet,
    unlocked: (u) => u.hasBuy && u.hasPreapproval,
  },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function DashboardSidebar({
  fullName,
  unlocked,
  newSections,
  partnerName,
  partnerEmail,
}: {
  fullName: string;
  unlocked: UnlockedSections;
  newSections: NewSections;
  partnerName: string | null;
  partnerEmail: string | null;
}) {
  const pathname = usePathname();
  const { close } = useSidebarDrawer();
  const items = ALL_NAV_ITEMS.filter((item) => item.unlocked(unlocked));
  const isNewSection = new Set(newSections);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground">
      <div className="px-3 pb-6">
        <span className="font-heading text-xl font-semibold tracking-tight">Harbour</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          const isNew = isNewSection.has(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1">{item.label}</span>
              {isNew && (
                <span
                  // motion-safe: a badge that blinks for anyone who has asked
                  // their device to reduce motion is an accessibility problem,
                  // not a delight.
                  className="motion-safe:animate-pulse rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary-foreground uppercase"
                >
                  New
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-sidebar-border pt-3">
        {partnerName ? (
          <div className="rounded-lg px-3 py-2">
            <p className="text-xs text-sidebar-foreground/60">Partner</p>
            <p className="truncate text-sm font-medium">{partnerName}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">{partnerEmail}</p>
          </div>
        ) : (
          <AddPartnerDialog className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground">
            <UserPlus className="size-4" />
            Add partner
          </AddPartnerDialog>
        )}

        <div className="flex items-center gap-3 px-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials(fullName)}
          </div>
          <span className="truncate text-sm font-medium">{fullName}</span>
        </div>

        <div className="px-1">
          <SignOutButton full />
        </div>
      </div>
    </aside>
  );
}
