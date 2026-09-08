import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getAgentClients } from "@/lib/data/agent";
import { getStageDefinitions } from "@/lib/data/dashboard";
import { findStage } from "@/lib/data/dashboard";

export default async function AgentClientsPage() {
  const supabase = await createClient();
  const clients = await getAgentClients(supabase);
  const stages = await getStageDefinitions(supabase);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Clients</h1>

      <div className="space-y-3">
        {clients.map((client) => (
          <Link key={client.id} href={`/agent/clients/${client.id}`}>
            <Card className="transition-colors hover:bg-muted/40">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{client.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{client.phone ?? "No phone on file"}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
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
                </div>
              </CardHeader>
              {client.transactions.length > 0 && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {client.transactions.map((t) => t.property_address).join(" · ")}
                  </p>
                </CardContent>
              )}
            </Card>
          </Link>
        ))}

        {clients.length === 0 && (
          <p className="text-sm text-muted-foreground">No clients yet.</p>
        )}
      </div>
    </div>
  );
}
