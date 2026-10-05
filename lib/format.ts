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
const percentFormatters = new Map<string, Intl.NumberFormat>();

/** Human sync stamp: "hoje, às 03:59" in the product's operating timezone. */
export function syncStamp(iso: string, now = new Date()): string {
  const syncedAt = new Date(iso);
  const time = TIME_FORMAT.format(syncedAt);

  if (DATE_KEY_FORMAT.format(syncedAt) === DATE_KEY_FORMAT.format(now))
    return `hoje, às ${time}`;

  return `em ${DATE_FORMAT.format(syncedAt)}, às ${time}`;
}

/** Absolute stamp for evidence surfaces: "05/08/2026, às 17:41". The audit
 *  trail never says "há 2 dias" — a relative date is not evidence. */
export function absoluteStamp(iso: string): string {
  const at = new Date(iso);
  return `${DATE_FORMAT.format(at)}, às ${TIME_FORMAT.format(at)}`;
}

function percentFormatter(
  fractionDigits: number,
  signed: boolean,
): Intl.NumberFormat {
  const key = `${fractionDigits}:${signed}`;
  let formatter = percentFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("pt-BR", {
      style: "percent",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      signDisplay: signed ? "exceptZero" : "auto",
    });
    percentFormatters.set(key, formatter);
  }
  return formatter;
}

/** A fraction (0.9) as a whole-number percent ("90%"). Pair with tabular-nums. */
export function percent(fraction: number, fractionDigits = 0): string {
  return percentFormatter(fractionDigits, false).format(fraction);
}

/** A difference against a reference the copy names ("+12,4%", "−3,1%"): the
 *  sign states above/below, so the copy never adds "acima" or "abaixo"
 *  (frontend "Relations as symbols"). A value that rounds to zero is unsigned. */
export function signedPercent(fraction: number, fractionDigits = 0): string {
  return trueMinus(percentFormatter(fractionDigits, true).format(fraction));
}

/** Intl writes a hyphen-minus; signed figures use the true minus (U+2212),
 *  which matches the plus sign's width in tabular columns. */
export function trueMinus(formatted: string): string {
  return formatted.replace("-", "−");
}
