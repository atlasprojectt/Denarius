// The one money() helper (frontend standard F5). pt-BR formatting; the currency
// is explicit because manual seats are entered in the tenant's display currency.
// Pair with `tabular-nums` at every render site.

export function money(amount: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amount);
}
