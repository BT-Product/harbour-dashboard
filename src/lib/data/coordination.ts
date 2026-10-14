import type { Transaction } from "@/lib/supabase/database.types";

/**
 * How a move-up client's two closings relate — in time, never in money.
 *
 * This used to name loan products ("bridge financing or a contingency-backed
 * loan"). The managing broker ruled that out on 2026-09-22: numbers and
 * financing are the lender's licensed work, lenders have their own portals and
 * their own required disclosures, and a realtor narrating them takes on
 * liability that isn't theirs. What stays is the thing a realtor does own —
 * which closing lands first, how big the gap is, and who to ask about it.
 */

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
        "Once both closing dates are confirmed, this will show which one closes first and how much time sits between them.",
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
        "This is a tight, common arrangement — a same-day close usually means a short-term rental car or storage plan for moving day, but no gap to cover in between.",
    };
  }

  if (diffDays > 0) {
    return {
      relation: "sale_first",
      daysApart: diffDays,
      headline: `Your sale is scheduled to close ${diffDays} day${diffDays === 1 ? "" : "s"} before your purchase.`,
      riskRead:
        "This is the more forgiving order: your sale completes first. The main thing to plan for is where you'll stay for the gap between closings.",
    };
  }

  const gap = Math.abs(diffDays);
  return {
    relation: "purchase_first",
    daysApart: gap,
    headline: `Your purchase is scheduled to close ${gap} day${gap === 1 ? "" : "s"} before your sale.`,
    riskRead:
      "This is the timeline to watch most closely, because your purchase completes before your sale does. Your lender is the one to talk to about how the purchase is covered in that window — ask them early rather than close to the date.",
  };
}
