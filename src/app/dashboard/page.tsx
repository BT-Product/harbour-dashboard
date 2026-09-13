import Link from "next/link";
import { CalendarCheck, ClipboardCheck, Home, Milestone, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import {
  findStage,
  formatTourDate,
  getClientTransactions,
  getCurrentProfile,
  getStageDefinitions,
  linkedTransaction,
  overviewStatus,
  primaryTransaction,
} from "@/lib/data/dashboard";
import { CoordinationView } from "@/components/coordination-view";
import { OverviewCard } from "@/components/overview-card";

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profile, transactions, stages] = await Promise.all([
    getCurrentProfile(supabase, user!.id),
    getClientTransactions(supabase, user!.id),
    getStageDefinitions(supabase),
  ]);

  const transactionIds = transactions.map((t) => t.id);
  const nowIso = new Date().toISOString();

  const [{ data: tours }, { data: homes }, { data: inspectionItems }, { data: preapproval }] =
    await Promise.all([
      supabase
        .from("tours")
        .select("id, address, scheduled_at")
        .gte("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("homes_seen")
        .select("id, address, interest_level, seen_at")
        .order("seen_at", { ascending: false }),
      transactionIds.length
        ? supabase
            .from("inspection_items")
            .select("id, item, importance_to_client, resolved")
            .in("transaction_id", transactionIds)
        : Promise.resolve({ data: [] }),
      supabase.from("preapproval").select("*").maybeSingle(),
    ]);

  const upcomingTours = tours ?? [];
  const homesSeen = homes ?? [];
  const items = inspectionItems ?? [];

  const hasBuy = transactions.some((t) => t.type === "buy");
  const primary = primaryTransaction(transactions);
  const linked = primary ? linkedTransaction(transactions, primary) : undefined;
  const isMoveUp = primary?.type === "buy" && linked?.type === "sell";

  const status = overviewStatus(transactions, stages, upcomingTours[0]?.scheduled_at ?? null);

  // The next outing is every stop sharing the earliest upcoming date.
  const nextTourDay = upcomingTours[0]
    ? upcomingTours.filter(
        (t) =>
          new Date(t.scheduled_at).toDateString() ===
          new Date(upcomingTours[0].scheduled_at).toDateString(),
      )
    : [];

  const contenders = homesSeen.filter((h) => h.interest_level === "strong");
  const openItems = items.filter((i) => !i.resolved);
  const dealbreakers = openItems.filter((i) => i.importance_to_client === "dealbreaker");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Hi {profile.full_name.split(" ")[0]}
        </p>
        <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">
          {status.headline}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{status.detail}</p>
      </div>

      {isMoveUp && <CoordinationView buy={primary!} sell={linked!} />}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {hasBuy && (
          <OverviewCard
            title="Upcoming tour"
            icon={CalendarCheck}
            href="/dashboard/tours"
            headline={
              nextTourDay.length ? formatTourDate(nextTourDay[0].scheduled_at) : "Nothing booked yet"
            }
            empty="When your agent schedules a tour, the homes you'll see show up here."
          >
            {nextTourDay.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {nextTourDay.slice(0, 4).map((tour) => (
                  <li key={tour.id} className="flex gap-3">
                    <span className="w-16 shrink-0 text-muted-foreground">
                      {time(tour.scheduled_at)}
                    </span>
                    <span className="min-w-0 flex-1">{tour.address}</span>
                  </li>
                ))}
                {nextTourDay.length > 4 && (
                  <li className="text-xs text-muted-foreground">
                    +{nextTourDay.length - 4} more on this tour
                  </li>
                )}
              </ul>
            ) : undefined}
          </OverviewCard>
        )}

        {hasBuy && (
          <OverviewCard
            title="Homes seen"
            icon={Home}
            href="/dashboard/homes"
            headline={
              homesSeen.length
                ? `${homesSeen.length} home${homesSeen.length === 1 ? "" : "s"} so far`
                : "None yet"
            }
            empty="After each tour, your agent writes up what you saw — it'll appear here."
          >
            {homesSeen.length > 0 ? (
              <div className="space-y-2 text-sm">
                {(contenders.length ? contenders : homesSeen).slice(0, 3).map((home) => (
                  <div key={home.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate">{home.address}</span>
                    {home.interest_level === "strong" && (
                      <Badge variant="default" className="shrink-0">
                        Favorite
                      </Badge>
                    )}
                  </div>
                ))}
                {contenders.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{contenders.length - 3} more favorites
                  </p>
                )}
              </div>
            ) : undefined}
          </OverviewCard>
        )}

        {transactions.map((t) => {
          const stage = findStage(stages, t.type, t.current_stage_key);
          const sequence = stages
            .filter((s) => s.transaction_type === t.type)
            .sort((a, b) => a.sort_order - b.sort_order);
          const index = sequence.findIndex((s) => s.stage_key === t.current_stage_key);
          const next = index >= 0 ? sequence[index + 1] : undefined;
          const coe = t.key_dates?.coe_date;

          return (
            <OverviewCard
              key={t.id}
              title={t.type === "buy" ? "Your purchase" : "Your sale"}
              icon={Milestone}
              href="/dashboard/escrow"
              linkLabel="See timeline"
              headline={stage?.label ?? t.current_stage_key}
            >
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">{stage?.explainer}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-3 text-xs">
                  <span className="text-muted-foreground">
                    Step {index + 1} of {sequence.length}
                    {next && ` · next: ${next.label}`}
                  </span>
                  {coe && (
                    <span className="text-muted-foreground">
                      Closing {new Date(coe).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </OverviewCard>
          );
        })}

        {items.length > 0 && (
          <OverviewCard
            title="Inspections"
            icon={ClipboardCheck}
            href="/dashboard/inspections"
            headline={
              openItems.length
                ? `${openItems.length} open item${openItems.length === 1 ? "" : "s"}`
                : "All resolved"
            }
          >
            <div className="space-y-2 text-sm">
              {dealbreakers.length > 0 && (
                <p className="text-destructive">
                  {dealbreakers.length} marked as a dealbreaker
                </p>
              )}
              {openItems.slice(0, 3).map((item) => (
                <p key={item.id} className="truncate text-muted-foreground">
                  {item.item}
                </p>
              ))}
              {openItems.length === 0 && (
                <p className="text-muted-foreground">
                  Everything found on the inspection has been dealt with.
                </p>
              )}
            </div>
          </OverviewCard>
        )}

        {hasBuy && preapproval && (
          <OverviewCard
            title="What you can spend"
            icon={Wallet}
            href="/dashboard/financials"
            linkLabel="Run the numbers"
            headline={preapproval ? money(preapproval.purchase_price) : ""}
          >
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                {preapproval?.percent_down}% down
                {preapproval?.loan_type && <> · {preapproval.loan_type}</>}
                {preapproval?.lender && <> · {preapproval.lender}</>}
              </p>
              <p>
                A home with HOA dues lowers what you can offer — open this to see by how much.
              </p>
            </div>
          </OverviewCard>
        )}
      </div>

      {transactions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing to show yet.{" "}
          <Link href="/dashboard" className="underline">
            Refresh
          </Link>{" "}
          once your agent lets you know it&apos;s ready.
        </p>
      )}
    </div>
  );
}
