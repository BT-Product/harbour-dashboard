import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getClientTransactions,
  getCurrentProfile,
  getStageDefinitions,
  linkedTransaction,
  primaryTransaction,
} from "@/lib/data/dashboard";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { AppShell } from "@/components/app-shell";
import { SellerStatusStrip } from "@/components/seller-status-strip";
import { VisitBeacon } from "@/components/visit-beacon";

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

  return (
    <AppShell
      sidebar={
        <DashboardSidebar
          fullName={profile.full_name}
          hasBuy={hasBuy}
          partnerName={profile.partner_name}
          partnerEmail={profile.partner_email}
        />
      }
      banner={
        linkedSell && linkedSell.status === "active" ? (
          <SellerStatusStrip sellTransaction={linkedSell} stages={stages} />
        ) : null
      }
    >
      <main className="w-full px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      {/* Renders nothing; records the visit metric from strategy.md. Agents
          are filtered out database-side, not here. */}
      <VisitBeacon />
    </AppShell>
  );
}
