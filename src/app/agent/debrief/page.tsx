import { createClient } from "@/lib/supabase/server";
import { DebriefForm } from "./debrief-form";

export default async function AgentDebriefPage() {
  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("is_agent", false)
    .order("full_name");

  if (error) throw error;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Tour Debrief</h1>
      <DebriefForm clients={clients ?? []} />
    </div>
  );
}
