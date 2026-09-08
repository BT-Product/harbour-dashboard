import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function IconListRow({
  href,
  icon: Icon,
  title,
  subtitle,
  trailing,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  trailing?: string;
}) {
  return (
    <Link
      href={href}
      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-muted/50"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {trailing && <span className="shrink-0 text-xs text-muted-foreground">{trailing}</span>}
    </Link>
  );
}
