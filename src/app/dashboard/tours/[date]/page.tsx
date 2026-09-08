import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { dateKey, formatDateHeading } from "@/lib/date-grouping";

export default async function TourDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const supabase = await createClient();
  const { data: tours, error } = await supabase
    .from("tours")
    .select("id, address, scheduled_at, notes")
    .order("scheduled_at", { ascending: true });

  if (error) throw error;

  const dayTours = (tours ?? []).filter((t) => dateKey(t.scheduled_at) === date);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/tours"
          className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Tours
        </Link>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {formatDateHeading(date)}
        </h1>
      </div>

      <div className="space-y-3">
        {dayTours.length === 0 && (
          <p className="text-sm text-muted-foreground">No tours found for this date.</p>
        )}
        {dayTours.map((tour) => (
          <Card key={tour.id}>
            <CardHeader>
              <CardTitle className="text-base">{tour.address}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {new Date(tour.scheduled_at).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </CardHeader>
            {tour.notes && (
              <CardContent>
                <p className="text-sm">{tour.notes}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
