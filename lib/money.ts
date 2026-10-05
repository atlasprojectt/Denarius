// The one money() helper (frontend standard F5). pt-BR formatting; the currency
// is explicit because manual seats are entered in the tenant's display currency.
// Pair with `tabular-nums` at every render site.

import { trueMinus } from "@/lib/format";

// Intl.NumberFormat construction is expensive and these helpers run hundreds of
// times per render pass (tables, charts, tooltips) — reuse one instance per
// currency/options combination.
const formatters = new Map<string, Intl.NumberFormat>();

function cachedFormatter(
  key: string,
  create: () => Intl.NumberFormat,
): Intl.NumberFormat {
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = create();
    formatters.set(key, formatter);
  }
  return formatter;
}

export function money(amount: number, currency = "BRL"): string {
  return cachedFormatter(
    `money:${currency}`,
    () => new Intl.NumberFormat("pt-BR", { style: "currency", currency }),
  ).format(amount);
}

/** A difference against a reference the copy names ("+R$ 1.200,00",
 *  "−R$ 300,00"): the sign states above/below, so the copy never adds "acima"
 *  or "abaixo" (frontend "Relations as symbols"). True minus; an amount that
 *  rounds to zero is unsigned. */
export function signedMoney(amount: number, currency = "BRL"): string {
  return trueMinus(
    cachedFormatter(
      `signed:${currency}`,
      () =>
        new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency,
          signDisplay: "exceptZero",
        }),
    ).format(amount),
  );
}

/** Compact variant for chart axes ("R$ 1,9 mil") — same source of truth,
 *  shorter surface. Never for headline figures. */
export function compactMoney(
  amount: number,
  currency = "BRL",
  maximumFractionDigits = 1,
): string {
  return cachedFormatter(
    `compact:${currency}:${maximumFractionDigits}`,
    () =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits,
      }),
  ).format(amount);
}
