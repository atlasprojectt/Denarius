// Shared pt-BR display formatting beyond money() (lib/money.ts).

/** Sync stamps: "03/07/2026, 20:17:16 UTC" — always UTC, disclosed as such. */
export function utcStamp(iso: string): string {
  return (
    new Date(iso).toLocaleString("pt-BR", { timeZone: "UTC" }) + " UTC"
  );
}

/** A fraction (0.9) as a whole-number percent ("90%"). Pair with tabular-nums. */
export function percent(fraction: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(fraction);
}
