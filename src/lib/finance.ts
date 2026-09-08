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
