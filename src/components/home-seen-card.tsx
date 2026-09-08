import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InterestLevel } from "@/lib/supabase/database.types";

const INTEREST_LABEL: Record<InterestLevel, string> = {
  strong: "Strong interest",
  maybe: "Maybe",
  pass: "Passed",
};

const INTEREST_VARIANT: Record<InterestLevel, "default" | "secondary" | "outline"> = {
  strong: "default",
  maybe: "secondary",
  pass: "outline",
};

export function HomeSeenCard({
  address,
  clientNotes,
  interestLevel,
  seenAt,
  privateNotes,
}: {
  address: string;
  clientNotes: string | null;
  interestLevel: InterestLevel | null;
  seenAt: string;
  privateNotes?: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{address}</CardTitle>
          {interestLevel && (
            <Badge variant={INTEREST_VARIANT[interestLevel]}>{INTEREST_LABEL[interestLevel]}</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Seen {new Date(seenAt).toLocaleDateString()}
        </p>
      </CardHeader>
      {(clientNotes || privateNotes) && (
        <CardContent className="space-y-1">
          {clientNotes && <p className="text-sm">{clientNotes}</p>}
          {privateNotes && (
            <p className="text-sm text-muted-foreground">Private: {privateNotes}</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
