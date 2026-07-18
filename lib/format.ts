// Shared pt-BR display formatting beyond money() (lib/money.ts).

const DISPLAY_TIME_ZONE = "America/Sao_Paulo";

// Intl formatter construction is expensive; these run per row/render, so each
// distinct configuration is built once and reused.
const DATE_KEY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: DISPLAY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const TIME_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  timeZone: DISPLAY_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  timeZone: DISPLAY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const percentFormatters = new Map<number, Intl.NumberFormat>();

/** Human sync stamp: "hoje, às 03:59" in the product's operating timezone. */
export function syncStamp(iso: string, now = new Date()): string {
  const syncedAt = new Date(iso);
  const time = TIME_FORMAT.format(syncedAt);

  if (DATE_KEY_FORMAT.format(syncedAt) === DATE_KEY_FORMAT.format(now))
    return `hoje, às ${time}`;

  return `em ${DATE_FORMAT.format(syncedAt)}, às ${time}`;
}

/** A fraction (0.9) as a whole-number percent ("90%"). Pair with tabular-nums. */
export function percent(fraction: number, fractionDigits = 0): string {
  let formatter = percentFormatters.get(fractionDigits);
  if (!formatter) {
    formatter = new Intl.NumberFormat("pt-BR", {
      style: "percent",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    percentFormatters.set(fractionDigits, formatter);
  }
  return formatter.format(fraction);
}
