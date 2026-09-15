import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getMyAgent } from "@/lib/data/dashboard";
import { hasLicense } from "@/lib/license";
import { AgentSidebar } from "@/components/agent-sidebar";
import { AppShell } from "@/components/app-shell";
import { BrandThemeStyle } from "@/components/brand-theme-style";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, agent] = await Promise.all([
    getCurrentProfile(supabase, user.id),
    getMyAgent(supabase),
  ]);

  // Client emails are withheld without a license number, so this can't be a
  // quiet setting — it's on every agent page until it's fixed.
  const licenseBanner =
    agent && !hasLicense(agent.dreNumber) ? (
      <div className="border-b border-destructive/30 bg-destructive/5 px-4 py-3 text-sm sm:px-8">
        <span className="font-medium">Add your DRE license number.</span>{" "}
        <span className="text-muted-foreground">
          It has to appear on every client email and on your clients&apos; dashboards, so tour
          reminders and recaps won&apos;t send until it&apos;s on file.
        </span>{" "}
        <Link href="/agent#your-details" className="font-medium underline">
          Add it now
        </Link>
      </div>
    ) : null;

  return (
    <>
      <BrandThemeStyle theme={agent?.brandTheme ?? null} />
      <AppShell sidebar={<AgentSidebar fullName={profile.full_name} />} banner={licenseBanner}>
        <div className="w-full px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </AppShell>
    </>
  );
}
