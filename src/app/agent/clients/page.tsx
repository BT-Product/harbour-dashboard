import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  getAgentClients,
  groupClients,
  CLIENT_GROUPS,
  type ClientWithTransactions,
} from "@/lib/data/agent";
import { getStageDefinitions, findStage } from "@/lib/data/dashboard";
import type { StageDefinition } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { NewClientDialog } from "./new-client-dialog";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function ClientRow({
  client,
  stages,
}: {
  client: ClientWithTransactions;
  stages: StageDefinition[];
}) {
  return (
    <Link
      href={`/agent/clients/${client.id}`}
      className="-mx-4 flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {initials(client.full_name)}
        </div>
        <div className="min-w-0">
          <p className="font-medium">{client.full_name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {client.transactions.length > 0
              ? client.transactions.map((t) => t.property_address).join(" · ")
              : (client.phone ?? "No phone on file")}
          </p>
        </div>
      </div>
      {/* Below the name on a phone so the badges don't squeeze it; pushed
          right on the same row from sm up. */}
      <div className="flex flex-wrap gap-2 pl-13 sm:ml-auto sm:shrink-0 sm:justify-end sm:pl-0">
        {client.transactions.map((t) => {
          const stage = findStage(stages, t.type, t.current_stage_key);
          return (
            <Badge key={t.id} variant={t.status === "active" ? "default" : "secondary"}>
              {t.type === "buy" ? "Buy" : "Sell"}: {stage?.label ?? t.current_stage_key}
            </Badge>
          );
        })}
      </div>
    </Link>
  );
}

export default async function AgentClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group } = await searchParams;
  const supabase = await createClient();
  const [clients, stages] = await Promise.all([
    getAgentClients(supabase),
    getStageDefinitions(supabase),
  ]);

  const grouped = groupClients(clients);
  // Only offer a filter for groups that actually have someone in them.
  const availableGroups = CLIENT_GROUPS.filter((g) => (grouped.get(g.key)?.length ?? 0) > 0);
  const activeGroup = availableGroups.find((g) => g.key === group)?.key ?? null;
  const visibleGroups = activeGroup
    ? availableGroups.filter((g) => g.key === activeGroup)
    : availableGroups;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Clients</h1>
        <NewClientDialog />
      </div>

      {availableGroups.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <FilterPill href="/agent/clients" label="All" count={clients.length} active={!activeGroup} />
          {availableGroups.map((g) => (
            <FilterPill
              key={g.key}
              href={`/agent/clients?group=${g.key}`}
              label={g.label}
              count={grouped.get(g.key)?.length ?? 0}
              active={activeGroup === g.key}
            />
          ))}
        </div>
      )}

      {clients.length === 0 && <p className="text-sm text-muted-foreground">No clients yet.</p>}

      {visibleGroups.map((g) => {
        const members = grouped.get(g.key) ?? [];
        return (
          <div key={g.key} className="space-y-2">
            {!activeGroup && (
              <h2 className="text-sm font-semibold text-muted-foreground">
                {g.label} · {members.length}
              </h2>
            )}
            <Card>
              <CardContent className="divide-y divide-border">
                {members.map((client) => (
                  <ClientRow key={client.id} client={client} stages={stages} />
                ))}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

function FilterPill({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {label}
      <span className={cn("ml-1.5", active ? "opacity-80" : "opacity-70")}>{count}</span>
    </Link>
  );
}
