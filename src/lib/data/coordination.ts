import type { Transaction } from "@/lib/supabase/database.types";

export type CoordinationRelation = "sale_first" | "purchase_first" | "same_day" | "unknown";

export interface Coordination {
  relation: CoordinationRelation;
  daysApart: number | null;
  headline: string;
  riskRead: string;
}

export function computeCoordination(buy: Transaction, sell: Transaction): Coordination {
  const buyCoe = buy.key_dates?.coe_date;
  const sellCoe = sell.key_dates?.coe_date;

  if (!buyCoe || !sellCoe) {
    return {
      relation: "unknown",
      daysApart: null,
      headline: "Closing dates aren't set on both sides yet.",
      riskRead:
        "Once both closing dates are confirmed, this will show whether your sale funds your purchase in time.",
    };
  }

  const buyDate = new Date(buyCoe);
  const sellDate = new Date(sellCoe);
  const diffDays = Math.round((buyDate.getTime() - sellDate.getTime()) / 86_400_000);

  if (diffDays === 0) {
    return {
      relation: "same_day",
      daysApart: 0,
      headline: "Your sale and purchase are scheduled to close the same day.",
      riskRead:
        "This is a tight, common arrangement — a same-day close usually means a short-term rental car or storage plan for moving day, but no gap in financing or housing.",
    };
  }

  if (diffDays > 0) {
    return {
      relation: "sale_first",
      daysApart: diffDays,
      headline: `Your sale is scheduled to close ${diffDays} day${diffDays === 1 ? "" : "s"} before your purchase.`,
      riskRead:
        "This is the lower-risk order for financing — your sale proceeds are typically available to fund your purchase. The main thing to plan for is where you'll stay for the gap between closings.",
    };
  }

  const gap = Math.abs(diffDays);
  return {
    relation: "purchase_first",
    daysApart: gap,
    headline: `Your purchase is scheduled to close ${gap} day${gap === 1 ? "" : "s"} before your sale.`,
    riskRead:
      "This order means you may need bridge financing or a contingency-backed loan to fund the purchase before your sale proceeds arrive. This is the timeline to watch most closely — talk to your lender about how it's being covered.",
  };
}
