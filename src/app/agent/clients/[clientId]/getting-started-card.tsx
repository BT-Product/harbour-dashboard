import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { TourFormDialog } from "./tours-manager";
import { DebriefFormDialog } from "./home-debriefs-manager";

/**
 * Shown while a buy-side client is still empty. A newly invited buyer is
 * usually mid-search rather than mid-escrow — they've often already toured
 * homes with the agent before they were ever a client — and none of that
 * history has anywhere to go until someone enters it.
 */
export function GettingStartedCard({
  clientId,
  hasTours,
  hasHomesSeen,
  hasPreapproval,
}: {
  clientId: string;
  hasTours: boolean;
  hasHomesSeen: boolean;
  hasPreapproval: boolean;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Get their dashboard started</CardTitle>
        <p className="text-sm text-muted-foreground">
          Until one of these is filled in, they sign in to an empty page.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <Item
          done={hasTours}
          title="Upcoming tour"
          description="The homes you're seeing next, grouped by the day you're out."
          action={
            <TourFormDialog clientId={clientId} triggerLabel="Schedule a tour" />
          }
        />
        <Item
          done={hasHomesSeen}
          title="Homes already seen"
          description="Anything you toured together before today, with your notes."
          action={
            <DebriefFormDialog clientId={clientId} triggerLabel="Log a home" />
          }
        />
        <Item
          done={hasPreapproval}
          title="Pre-approval"
          description="Turns on their affordability calculator."
          action={
            <Link
              href={`/agent/clients/${clientId}/financials`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Add numbers
            </Link>
          }
        />
      </CardContent>
    </Card>
  );
}

function Item({
  done,
  title,
  description,
  action,
}: {
  done: boolean;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">
          {done && <span className="mr-1 text-primary">✓</span>}
          {title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="mt-auto pt-1">{action}</div>
    </div>
  );
}
