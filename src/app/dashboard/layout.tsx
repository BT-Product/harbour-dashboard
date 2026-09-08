import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getClientTransactions,
  getCurrentProfile,
  getStageDefinitions,
  linkedTransaction,
  primaryTransaction,
} from "@/lib/data/dashboard";
import { DashboardNav } from "@/components/dashboard-nav";
import { SellerStatusStrip } from "@/components/seller-status-strip";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile(supabase, user.id);
  const transactions = await getClientTransactions(supabase, user.id);
  const stages = await getStageDefinitions(supabase);

  const hasBuy = transactions.some((t) => t.type === "buy");
  const primary = primaryTransaction(transactions);
  const linkedSell =
    primary?.type === "buy" ? linkedTransaction(transactions, primary) : undefined;

  const navItems = [
    { href: "/dashboard", label: "Overview" },
    ...(hasBuy ? [{ href: "/dashboard/homes", label: "Homes Seen" }] : []),
    ...(hasBuy ? [{ href: "/dashboard/tours", label: "Tours" }] : []),
    { href: "/dashboard/escrow", label: "Escrow" },
    { href: "/dashboard/inspections", label: "Inspections" },
    ...(hasBuy ? [{ href: "/dashboard/financials", label: "Financials" }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {linkedSell && linkedSell.status === "active" && (
        <SellerStatusStrip sellTransaction={linkedSell} stages={stages} />
      )}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold tracking-tight">Harbour</span>
            <DashboardNav items={navItems} />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {profile.full_name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
