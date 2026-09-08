"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

const ALL_NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, buyOnly: false },
  { href: "/dashboard/tours", label: "Upcoming Tours", icon: CalendarCheck, buyOnly: true },
  { href: "/dashboard/homes", label: "Homes Seen", icon: Home, buyOnly: true },
  { href: "/dashboard/escrow", label: "Escrow", icon: Milestone, buyOnly: false },
  { href: "/dashboard/inspections", label: "Inspections", icon: ClipboardCheck, buyOnly: false },
  { href: "/dashboard/financials", label: "Financials", icon: Wallet, buyOnly: true },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function DashboardSidebar({
  fullName,
  hasBuy,
  partnerName,
  partnerEmail,
}: {
  fullName: string;
  hasBuy: boolean;
  partnerName: string | null;
  partnerEmail: string | null;
}) {
  const pathname = usePathname();
  const { close } = useSidebarDrawer();
  const items = ALL_NAV_ITEMS.filter((item) => hasBuy || !item.buyOnly);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground">
      <div className="px-3 pb-6">
        <span className="font-heading text-xl font-semibold tracking-tight">Harbour</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
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
              {item.label}
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
