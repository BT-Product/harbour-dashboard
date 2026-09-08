import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getAgentClients } from "@/lib/data/agent";
import { getStageDefinitions, findStage } from "@/lib/data/dashboard";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function AgentClientsPage() {
  const supabase = await createClient();
  const clients = await getAgentClients(supabase);
  const stages = await getStageDefinitions(supabase);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Clients</h1>

      <Card>
        <CardContent className="divide-y divide-border">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/agent/clients/${client.id}`}
              className="-mx-4 flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {initials(client.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{client.full_name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {client.transactions.length > 0
                    ? client.transactions.map((t) => t.property_address).join(" · ")
                    : (client.phone ?? "No phone on file")}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                {client.transactions.length === 0 && (
                  <Badge variant="secondary">No transactions</Badge>
                )}
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
          ))}

          {clients.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">No clients yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
