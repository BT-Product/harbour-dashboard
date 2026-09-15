import { formatLicense, hasLicense } from "@/lib/license";
import type { MyAgent } from "@/lib/data/dashboard";

/**
 * The agent's name and license number at the foot of every client page.
 *
 * In the page rather than the sidebar, because below `lg` the sidebar is a
 * closed drawer — a disclosure that only exists once someone opens a menu
 * isn't on the page. Renders nothing without a number on file; the agent sees
 * a banner until they add one.
 */
export function LicenseFooter({ agent }: { agent: MyAgent | null }) {
  if (!agent || !hasLicense(agent.dreNumber)) return null;
  return (
    <footer className="border-t px-4 py-4 text-xs text-muted-foreground sm:px-8">
      {agent.name} · {formatLicense(agent.dreNumber)}
    </footer>
  );
}
