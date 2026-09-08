import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const INTEREST_LABEL: Record<string, string> = {
  strong: "Strong interest",
  maybe: "Maybe",
  pass: "Passed",
};

const INTEREST_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  strong: "default",
  maybe: "secondary",
  pass: "outline",
};

export default async function HomesSeenPage() {
  const supabase = await createClient();
  const { data: homes, error } = await supabase
    .from("homes_seen")
    .select("id, address, client_notes, interest_level, seen_at")
    .order("seen_at", { ascending: false });

  if (error) throw error;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Homes Seen</h1>

      {(!homes || homes.length === 0) && (
        <p className="text-sm text-muted-foreground">
          No home tours debriefed yet. They&apos;ll show up here after your next showing.
        </p>
      )}

      <div className="space-y-3">
        {homes?.map((home) => (
          <Card key={home.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{home.address}</CardTitle>
                {home.interest_level && (
                  <Badge variant={INTEREST_VARIANT[home.interest_level]}>
                    {INTEREST_LABEL[home.interest_level]}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Seen {new Date(home.seen_at).toLocaleDateString()}
              </p>
            </CardHeader>
            {home.client_notes && (
              <CardContent>
                <p className="text-sm">{home.client_notes}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
