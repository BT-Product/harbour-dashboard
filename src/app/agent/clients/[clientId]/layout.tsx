import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getClientProfile } from "@/lib/data/agent";
import { getClientTransactions } from "@/lib/data/dashboard";
import { ClientTabs } from "@/components/client-tabs";

export default async function ClientDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const [client, transactions] = await Promise.all([
    getClientProfile(supabase, clientId),
    getClientTransactions(supabase, clientId),
  ]);

  const hasBuy = transactions.some((t) => t.type === "buy");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/agent/clients"
          className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Clients
        </Link>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{client.full_name}</h1>
        <p className="text-sm text-muted-foreground">
          {client.phone ?? "No phone on file"}
          {client.partner_name && ` · Partner: ${client.partner_name} (${client.partner_email})`}
        </p>
      </div>

      <ClientTabs clientId={clientId} hasBuy={hasBuy} />

      {children}
    </div>
  );
}
