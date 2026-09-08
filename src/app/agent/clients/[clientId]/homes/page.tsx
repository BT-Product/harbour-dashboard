import { createClient } from "@/lib/supabase/server";
import { getClientHomesSeen } from "@/lib/data/agent";
import { HomeDebriefsManager } from "../home-debriefs-manager";

export default async function ClientHomesPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const homes = await getClientHomesSeen(supabase, clientId);

  return (
    <div className="pt-4">
      <HomeDebriefsManager clientId={clientId} homes={homes} />
    </div>
  );
}
