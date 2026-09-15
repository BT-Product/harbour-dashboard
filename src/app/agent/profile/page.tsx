import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAgent } from "@/lib/data/dashboard";
import { hasLicense } from "@/lib/license";
import { PhotoCard } from "./photo-card";
import { ProfileForm } from "./profile-form";

/**
 * The agent's own details. The place new agent information goes as Harbour
 * needs it — each field says where clients see it, because for most of them
 * that is the reason the field exists.
 */
export default async function AgentProfilePage() {
  const supabase = await createClient();
  const agent = await getMyAgent(supabase);
  if (!agent) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What clients know about you. Each field says where they see it.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PhotoCard agentId={agent.id} name={agent.name} photoUrl={agent.photoUrl} />
        <div className="lg:col-span-2">
          <ProfileForm
            name={agent.name}
            phone={agent.phone}
            dreNumber={hasLicense(agent.dreNumber) ? agent.dreNumber : null}
            officeAddress={agent.officeAddress}
          />
        </div>
      </div>
    </div>
  );
}
