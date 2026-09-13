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
 * The purchase price a first loan supports when a down payment assistance
 * program covers a percentage of that price.
 *
 * The assistance is a percentage *of the purchase price*, not of the loan,
 * so this has to be solved rather than added:
 *
 *   price = loan + cash + (assistancePct × price)
 *   price = (loan + cash) / (1 − assistancePct)
 *
 * Adding the assistance to the loan instead — the obvious-looking version —
 * understates the price, because the assistance grows with the price it is
 * helping to buy.
 *
 * Note what this deliberately does *not* do: subtract a payment for the
 * second loan. For a non-deferred program the lender has already reduced
 * the approved first loan to absorb that payment, so modelling it again
 * here would count it twice.
 */
export function maxPriceWithAssistance(
  loanAmount: number,
  cashDown: number,
  assistancePercent: number,
): number {
  const pct = Math.min(Math.max(assistancePercent, 0), 99) / 100;
  return (loanAmount + cashDown) / (1 - pct);
}
