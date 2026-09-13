import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * One section of the dashboard, summarised. Every card says what it is,
 * shows the two or three things a client would actually want at a glance,
 * and offers a way into the full section — so the overview reads as a
 * starting point rather than the whole story.
 */
export function OverviewCard({
  title,
  icon: Icon,
  href,
  linkLabel = "See all",
  headline,
  children,
  empty,
}: {
  title: string;
  icon: LucideIcon;
  href?: string;
  linkLabel?: string;
  headline?: string;
  children?: React.ReactNode;
  empty?: string;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Icon className="size-4" />
            </div>
            <span className="text-sm font-semibold">{title}</span>
          </div>
          {href && (
            <Link
              href={href}
              className="shrink-0 text-xs font-medium text-primary hover:underline"
            >
              {linkLabel} →
            </Link>
          )}
        </div>
        {headline && <p className="pt-3 text-lg font-semibold">{headline}</p>}
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {children ?? <p className="text-sm text-muted-foreground">{empty}</p>}
      </CardContent>
    </Card>
  );
}
