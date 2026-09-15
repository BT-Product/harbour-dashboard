"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, NotebookPen, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/sign-out-button";
import { useSidebarDrawer } from "@/components/app-shell";

const NAV_ITEMS = [
  { href: "/agent", label: "Home", icon: House, exact: true },
  { href: "/agent/clients", label: "Clients", icon: Users, exact: false },
  { href: "/agent/debrief", label: "Debrief", icon: NotebookPen, exact: false },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function AgentSidebar({
  fullName,
  photoUrl,
}: {
  fullName: string;
  photoUrl: string | null;
}) {
  const pathname = usePathname();
  const { close } = useSidebarDrawer();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground">
      <div className="px-3 pb-6">
        <span className="font-heading text-xl font-semibold tracking-tight">Harbour</span>
        <p className="text-xs text-sidebar-foreground/60">Agent</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
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
        {/* The way into the agent's own profile — where their license number,
            photo and contact details live. */}
        <Link
          href="/agent/profile"
          onClick={close}
          aria-current={pathname === "/agent/profile" ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
            pathname === "/agent/profile"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
          )}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a small avatar from our own storage
            <img src={photoUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
              {initials(fullName)}
            </div>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{fullName}</span>
            <span className="block text-xs text-sidebar-foreground/60">Your profile</span>
          </span>
        </Link>

        <div className="px-1">
          <SignOutButton full />
        </div>
      </div>
    </aside>
  );
}
