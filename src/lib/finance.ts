const DEFAULT_TERM_MONTHS = 360; // 30-year fixed, standard assumption for this estimate.

/** Monthly principal & interest payment for a fully amortizing fixed-rate loan. */
export function monthlyPrincipalAndInterest(
  principal: number,
  annualRatePct: number,
  termMonths = DEFAULT_TERM_MONTHS,
): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / termMonths;
  const factor = Math.pow(1 + r, termMonths);
  return (principal * r * factor) / (factor - 1);
}

/** Back-solves the loan principal a given monthly P&I payment supports. */
export function maxPrincipalForPayment(
  monthlyPayment: number,
  annualRatePct: number,
  termMonths = DEFAULT_TERM_MONTHS,
): number {
  if (monthlyPayment <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return monthlyPayment * termMonths;
  const factor = Math.pow(1 + r, termMonths);
  return (monthlyPayment * (factor - 1)) / (r * factor);
}

/**
 * How far a home's HOA dues move the pre-approved purchase price.
 *
 * Works from the lender's own figures rather than rebuilding them: the loan
 * implied by the stated price and percent down sets the approved payment,
 * HOA dues come out of that payment, and the smaller loan that remains is
 * scaled back up by the same percent down.
 *
 * The starting price is never recalculated — with no HOA dues this returns
 * the lender's number unchanged.
 */
export function hoaAdjustedPurchasePrice(
  purchasePrice: number,
  percentDown: number,
  annualRatePct: number,
  hoaMonthly: number,
): number {
  if (hoaMonthly <= 0) return purchasePrice;

  const downFraction = Math.min(Math.max(percentDown, 0), 99) / 100;
  const loan = purchasePrice * (1 - downFraction);
  const approvedPayment = monthlyPrincipalAndInterest(loan, annualRatePct);
  const remaining = Math.max(approvedPayment - hoaMonthly, 0);
  const adjustedLoan = maxPrincipalForPayment(remaining, annualRatePct);

  return adjustedLoan / (1 - downFraction);
}
