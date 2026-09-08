import { createClient } from "@/lib/supabase/server";
import { getClientTours } from "@/lib/data/agent";
import { ToursManager } from "../tours-manager";

export default async function ClientToursPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const tours = await getClientTours(supabase, clientId);

  return (
    <div className="pt-4">
      <ToursManager clientId={clientId} tours={tours} />
    </div>
  );
}
