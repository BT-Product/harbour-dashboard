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
import { SellerStatusStrip } from "@/components/seller-status-strip";

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
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar
        fullName={profile.full_name}
        hasBuy={hasBuy}
        partnerName={profile.partner_name}
        partnerEmail={profile.partner_email}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {linkedSell && linkedSell.status === "active" && (
          <SellerStatusStrip sellTransaction={linkedSell} stages={stages} />
        )}
        <main className="w-full flex-1 px-6 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
