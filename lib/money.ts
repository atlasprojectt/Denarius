// The one money() helper (frontend standard F5). pt-BR formatting; the currency
// is explicit because manual seats are entered in the tenant's display currency.
// Pair with `tabular-nums` at every render site.

export function money(amount: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amount);
}

/** Compact variant for chart axes ("R$ 1,9 mil") — same source of truth,
 *  shorter surface. Never for headline figures. */
export function compactMoney(amount: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}
