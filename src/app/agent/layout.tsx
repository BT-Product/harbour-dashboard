import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/dashboard";
import { AgentSidebar } from "@/components/agent-sidebar";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile(supabase, user.id);

  return (
    <div className="flex h-screen overflow-hidden">
      <AgentSidebar fullName={profile.full_name} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="w-full px-6 py-8 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
