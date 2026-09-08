"use client";

import { createContext, useContext, useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const SidebarContext = createContext<{ close: () => void }>({ close: () => {} });

/** Lets the sidebar close the mobile drawer when a nav link is tapped. */
export function useSidebarDrawer() {
  return useContext(SidebarContext);
}

export function AppShell({
  sidebar,
  banner,
  children,
}: {
  sidebar: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <SidebarContext value={{ close: () => setOpen(false) }}>
      <div className="flex h-screen overflow-hidden">
        {open && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          />
        )}

        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 shrink-0 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {sidebar}
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 py-3 lg:hidden">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
            >
              <Menu className="size-5" />
            </button>
            <span className="font-heading text-lg font-semibold tracking-tight">Harbour</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {banner}
            {children}
          </div>
        </div>
      </div>
    </SidebarContext>
  );
}
