import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { HomeSeenCard } from "@/components/home-seen-card";
import { dateKey, formatDateHeading } from "@/lib/date-grouping";

export default async function HomesSeenDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const supabase = await createClient();
  const { data: homes, error } = await supabase
    .from("homes_seen")
    .select("id, address, client_notes, interest_level, seen_at")
    .order("seen_at", { ascending: true });

  if (error) throw error;

  const dayHomes = (homes ?? []).filter((h) => dateKey(h.seen_at) === date);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/homes"
          className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Homes Seen
        </Link>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {formatDateHeading(date)}
        </h1>
      </div>

      <div className="space-y-3">
        {dayHomes.length === 0 && (
          <p className="text-sm text-muted-foreground">No homes found for this date.</p>
        )}
        {dayHomes.map((home) => (
          <HomeSeenCard
            key={home.id}
            address={home.address}
            clientNotes={home.client_notes}
            interestLevel={home.interest_level}
            seenAt={home.seen_at}
          />
        ))}
      </div>
    </div>
  );
}
