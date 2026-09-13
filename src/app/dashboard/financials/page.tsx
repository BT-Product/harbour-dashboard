import { createClient } from "@/lib/supabase/server";
import { AffordabilityTool } from "@/components/affordability-tool";

/**
 * Two things only: what they can offer, and how HOA dues change it.
 *
 * This page used to lead with a breakdown of the loan, down payment, rate
 * and lender, and later gained an explanation of how down payment
 * assistance factors in. None of it helped the client decide anything —
 * the mechanics are the lender's job, and putting them on the client's
 * dashboard invites questions Britton isn't licensed to answer. The
 * assistance still shapes the number; it just isn't narrated.
 */
export default async function FinancialsPage() {
  const supabase = await createClient();
  const { data: preapproval, error } = await supabase
    .from("preapproval")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">What you can spend</h1>

      {!preapproval && (
        <p className="text-sm text-muted-foreground">
          No pre-approval on file yet. Your agent will add it once your lender confirms it.
        </p>
      )}

      {preapproval && <AffordabilityTool preapproval={preapproval} />}
    </div>
  );
}
