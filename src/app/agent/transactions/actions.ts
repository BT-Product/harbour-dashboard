"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function advanceStage(transactionId: string, stageKey: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("agent_advance_stage", {
    p_transaction_id: transactionId,
    p_stage_key: stageKey,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/agent/transactions");
}
