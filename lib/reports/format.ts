const MONTH_YEAR = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

/** A closed month is stamped by day; a report of the running month needs the
 *  hour too — two generated the same afternoon are different documents. */
const DATE_TIME = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function reportMonth(periodMonth: string): string {
  const [year, month] = periodMonth.split("-").map(Number);
  const value = MONTH_YEAR.format(new Date(Date.UTC(year, month - 1, 1)));
  return value[0].toLocaleUpperCase("pt-BR") + value.slice(1);
}

export function reportPeriodPath(periodMonth: string): string {
  return periodMonth.slice(0, 7);
}

export function reportDate(iso: string): string {
  return DATE.format(new Date(iso));
}

export function reportDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}
