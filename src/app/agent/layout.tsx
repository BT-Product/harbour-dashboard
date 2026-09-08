import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/dashboard";
import { AgentSidebar } from "@/components/agent-sidebar";
import { AppShell } from "@/components/app-shell";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile(supabase, user.id);

  return (
    <AppShell sidebar={<AgentSidebar fullName={profile.full_name} />}>
      <div className="w-full px-4 py-6 sm:px-8 sm:py-8">{children}</div>
    </AppShell>
  );
}
