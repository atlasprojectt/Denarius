// Shared pt-BR display formatting beyond money() (lib/money.ts).

const DISPLAY_TIME_ZONE = "America/Sao_Paulo";

/** Human sync stamp: "hoje, às 03:59" in the product's operating timezone. */
export function syncStamp(iso: string, now = new Date()): string {
  const syncedAt = new Date(iso);
  const dateKey = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: DISPLAY_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  const time = new Intl.DateTimeFormat("pt-BR", {
    timeZone: DISPLAY_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(syncedAt);

  if (dateKey(syncedAt) === dateKey(now)) return `hoje, às ${time}`;

  const date = new Intl.DateTimeFormat("pt-BR", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(syncedAt);
  return `em ${date}, às ${time}`;
}

/** A fraction (0.9) as a whole-number percent ("90%"). Pair with tabular-nums. */
export function percent(fraction: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(fraction);
}
