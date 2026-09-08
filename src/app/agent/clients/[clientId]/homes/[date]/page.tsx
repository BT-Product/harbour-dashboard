import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getClientHomesSeen } from "@/lib/data/agent";
import { dateKey, formatDateHeading } from "@/lib/date-grouping";
import { HomesSeenDayManager } from "../../home-debriefs-manager";

export default async function ClientHomesDayPage({
  params,
}: {
  params: Promise<{ clientId: string; date: string }>;
}) {
  const { clientId, date } = await params;
  const supabase = await createClient();
  const homes = await getClientHomesSeen(supabase, clientId);
  const dayHomes = homes.filter((h) => dateKey(h.seen_at) === date);

  return (
    <div className="space-y-4 pt-4">
      <Link
        href={`/agent/clients/${clientId}/homes`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Homes Seen
      </Link>
      <h2 className="text-lg font-semibold">{formatDateHeading(date)}</h2>
      <HomesSeenDayManager clientId={clientId} dateKeyStr={date} homes={dayHomes} />
    </div>
  );
}
