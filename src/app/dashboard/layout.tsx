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
  const transactionIds = transactions.map((t) => t.id);

  // Which sections have anything to say yet, and when each one first had
  // something — a section is only "new" if it appeared after this client
  // had already started using the app.
  const [homesSeen, inspectionItems, preapproval, pageViews] = await Promise.all([
    supabase.from("homes_seen").select("created_at").order("created_at").limit(1),
    transactionIds.length
      ? supabase
          .from("inspection_items")
          .select("created_at")
          .in("transaction_id", transactionIds)
          .order("created_at")
          .limit(1)
      : Promise.resolve({ data: [] }),
    supabase.from("preapproval").select("updated_at").limit(1),
    supabase.from("client_page_views").select("path, viewed_at").order("viewed_at").limit(500),
  ]);

  const views = pageViews.data ?? [];
  const visitedPaths = new Set(views.map((row) => row.path));
  const firstVisitAt = views[0]?.viewed_at ?? null;

  const unlockedAt = {
    "/dashboard/homes": homesSeen.data?.[0]?.created_at ?? null,
    "/dashboard/inspections": inspectionItems.data?.[0]?.created_at ?? null,
    "/dashboard/financials": preapproval.data?.[0]?.updated_at ?? null,
  };

  // Appeared since they first signed in, and still unopened. A client on
  // their very first visit gets no badges at all — everything is new then,
  // so marking everything new says nothing.
  const newSections = Object.entries(unlockedAt)
    .filter(
      ([path, at]) =>
        at !== null &&
        firstVisitAt !== null &&
        !visitedPaths.has(path) &&
        new Date(at) > new Date(firstVisitAt),
    )
    .map(([path]) => path);

  const primary = primaryTransaction(transactions);
  const linkedSell =
    primary?.type === "buy" ? linkedTransaction(transactions, primary) : undefined;

  return (
    <AppShell
      sidebar={
        <DashboardSidebar
          fullName={profile.full_name}
          unlocked={{
            hasBuy,
            hasHomesSeen: Boolean(unlockedAt["/dashboard/homes"]),
            hasInspectionItems: Boolean(unlockedAt["/dashboard/inspections"]),
            hasPreapproval: Boolean(unlockedAt["/dashboard/financials"]),
          }}
          newSections={newSections}
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
