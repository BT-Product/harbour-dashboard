import { createClient } from "@/lib/supabase/server";
import { getClientPreapproval } from "@/lib/data/agent";
import { PreapprovalManager } from "../preapproval-manager";

export default async function ClientFinancialsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const preapproval = await getClientPreapproval(supabase, clientId);

  return (
    <div className="pt-4">
      <PreapprovalManager clientId={clientId} preapproval={preapproval} />
    </div>
  );
}
