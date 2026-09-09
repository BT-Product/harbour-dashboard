"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Records one page view for the signed-in client. Called from the browser
 * after the page mounts rather than during the server render, because Next
 * prefetches routes on link hover and in-viewport — those prefetch renders
 * would otherwise count as visits nobody made.
 *
 * Deliberately silent on failure: an unrecorded view is a small hole in a
 * discovery metric, and it must never surface as an error on a client's
 * dashboard.
 */
export async function recordPageView(path: string) {
  try {
    const supabase = await createClient();
    await supabase.rpc("record_my_page_view", { p_path: path });
  } catch {
    // ignored on purpose — see above
  }
}
