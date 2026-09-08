import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateHeading } from "@/lib/date-grouping";

export function DateGroupCard({
  href,
  dateKeyStr,
  count,
  countLabel,
  className,
}: {
  href: string;
  dateKeyStr: string;
  count: number;
  countLabel: string;
  className?: string;
}) {
  return (
    <Link href={href}>
      <Card className={`transition-colors hover:bg-muted/40 ${className ?? ""}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{formatDateHeading(dateKeyStr)}</CardTitle>
            <span className="text-sm text-muted-foreground">
              {count} {countLabel}
              {count === 1 ? "" : "s"}
            </span>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
