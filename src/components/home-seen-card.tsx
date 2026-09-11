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
  action,
}: {
  address: string;
  clientNotes: string | null;
  interestLevel: InterestLevel | null;
  seenAt: string;
  privateNotes?: string | null;
  /**
   * Agent-side controls (Edit). Rendered in the header row beside the
   * interest badge — callers used to absolutely position these on top of
   * the card, which landed them directly on the badge.
   */
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{address}</CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            {interestLevel && (
              <Badge variant={INTEREST_VARIANT[interestLevel]}>
                {INTEREST_LABEL[interestLevel]}
              </Badge>
            )}
            {action}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Seen {new Date(seenAt).toLocaleDateString()}
        </p>
      </CardHeader>
      {(clientNotes || privateNotes) && (
        <CardContent className="space-y-1">
          {/* Debriefs are typed a line per observation in a textarea; without
              this they render as one run-on sentence. */}
          {clientNotes && <p className="text-sm whitespace-pre-line">{clientNotes}</p>}
          {privateNotes && (
            <p className="text-sm whitespace-pre-line text-muted-foreground">
              Private: {privateNotes}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
