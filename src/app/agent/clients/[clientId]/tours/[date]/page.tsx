import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getClientTours } from "@/lib/data/agent";
import { dateKey, formatDateHeading } from "@/lib/date-grouping";
import { ToursDayManager } from "../../tours-manager";

export default async function ClientTourDayPage({
  params,
}: {
  params: Promise<{ clientId: string; date: string }>;
}) {
  const { clientId, date } = await params;
  const supabase = await createClient();
  const tours = await getClientTours(supabase, clientId);
  const dayTours = tours.filter((t) => dateKey(t.scheduled_at) === date);

  return (
    <div className="space-y-4 pt-4">
      <Link
        href={`/agent/clients/${clientId}/tours`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Tours
      </Link>
      <h2 className="text-lg font-semibold">{formatDateHeading(date)}</h2>
      <ToursDayManager clientId={clientId} dateKeyStr={date} tours={dayTours} />
    </div>
  );
}
