import Link from "next/link";
import type { StageDefinition, Transaction } from "@/lib/supabase/database.types";
import { findStage } from "@/lib/data/dashboard";

export function SellerStatusStrip({
  sellTransaction,
  stages,
}: {
  sellTransaction: Transaction;
  stages: StageDefinition[];
}) {
  const stage = findStage(stages, "sell", sellTransaction.current_stage_key);
  const coeDate = sellTransaction.key_dates?.coe_date;

  return (
    <Link
      href="/dashboard"
      className="block border-b bg-amber-50 px-4 py-2 text-sm text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60"
    >
      <span className="font-medium">Your sale — {sellTransaction.property_address}:</span>{" "}
      {stage?.label ?? sellTransaction.current_stage_key}
      {coeDate ? ` · target close ${new Date(coeDate).toLocaleDateString()}` : ""}
      <span className="ml-2 underline underline-offset-2">See how this affects your purchase</span>
    </Link>
  );
}
