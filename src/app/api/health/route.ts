import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();

    const { error: writeError } = await supabase
      .from("_health_check")
      .update({ checked_at: now })
      .eq("id", true);
    if (writeError) throw writeError;

    const { data, error: readError } = await supabase
      .from("_health_check")
      .select("checked_at")
      .eq("id", true)
      .single();
    if (readError) throw readError;

    if (data.checked_at !== now) {
      throw new Error("Round-trip write did not persist");
    }

    return NextResponse.json({ status: "ok", checked_at: now });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : "unknown error" },
      { status: 503 },
    );
  }
}
