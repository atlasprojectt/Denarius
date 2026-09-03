import type { PeriodProgress } from "./accrual";

export type DailySpendPoint = { date: string; amount: number };
export type ForecastInput = {
  dailySpend: DailySpendPoint[];
  spent: number;
  period: PeriodProgress & { startDate?: string };
  history?: DailySpendPoint[];
  budget?: number;
};
export type ForecastResult = {
  status: "collecting" | "ready";
  centralEstimate: number | null;
  probableRange: { low: number; high: number } | null;
  recentPace: number | null;
  volatility: number | null;
  confidence: "none" | "low" | "medium" | "high";
  breachRisk: "none" | "possible" | "likely" | null;
};

const GUARD_DAY = 5;
const MIN_RECURRENCE_POINTS = 14;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function empty(status: ForecastResult["status"]): ForecastResult {
  return { status, centralEstimate: null, probableRange: null, recentPace: null, volatility: null, confidence: "none", breachRisk: null };
}
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function validatePoints(points: DailySpendPoint[], period: ForecastInput["period"], enforceBounds = true): DailySpendPoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const seen = new Set<string>();
  for (const point of sorted) {
    if (!ISO_DATE.test(point.date) || Number.isNaN(Date.parse(`${point.date}T00:00:00Z`))) throw new Error("Forecast dates must be valid UTC dates");
    if (!Number.isFinite(point.amount) || point.amount < 0) throw new Error("Forecast amounts must be finite and non-negative");
    if (seen.has(point.date)) throw new Error("Forecast dates must be unique");
    seen.add(point.date);
  }
  if (enforceBounds && period.startDate) {
    if (!ISO_DATE.test(period.startDate)) throw new Error("Forecast period start must be a UTC date");
    const start = Date.parse(`${period.startDate}T00:00:00Z`);
    const end = start + period.daysInPeriod * 86_400_000;
    if (sorted.some((point) => { const time = Date.parse(`${point.date}T00:00:00Z`); return time < start || time >= end; })) throw new Error("Forecast point is outside the period");
  }
  return sorted;
}
function robustValues(values: number[]): number[] {
  if (values.length < 2) return values;
  const center = median(values);
  const mad = median(values.map((value) => Math.abs(value - center)));
  const limit = mad > 0 ? 3 * mad : Math.max(Math.abs(center) * 2, 1);
  return values.map((value) => Math.max(0, Math.min(value, center + limit)));
}
function weekdayPace(points: DailySpendPoint[]): number | null {
  if (points.length < MIN_RECURRENCE_POINTS) return null;
  const byDay = new Map<number, number[]>();
  for (const point of points) {
    const day = new Date(`${point.date}T00:00:00Z`).getUTCDay();
    byDay.set(day, [...(byDay.get(day) ?? []), point.amount]);
  }
  if (byDay.size < 4) return null;
  return [...byDay.values()].map((values) => median(robustValues(values))).reduce((sum, value) => sum + value, 0) / byDay.size;
}

/** Deterministic, date-aware behavior forecast. It never removes realized spend. */
export function forecast(input: ForecastInput): ForecastResult {
  const { dailySpend, period, spent, budget } = input;
  if (!Number.isFinite(spent) || spent < 0 || period.daysInPeriod <= 0 || period.dayOfPeriod < 0 || period.dayOfPeriod > period.daysInPeriod) throw new Error("Invalid forecast period or spent value");
  if (period.dayOfPeriod < GUARD_DAY) return empty("collecting");
  const observed = validatePoints(dailySpend, period);
  if (observed.length === 0) return empty("ready");
  const values = observed.map((point) => point.amount);
  const recent = values.slice(-Math.min(7, values.length));
  const stable = robustValues(values);
  const overall = stable.reduce((sum, value) => sum + value, 0) / stable.length;
  const recentStable = robustValues(recent);
  const recentMean = recentStable.reduce((sum, value) => sum + value, 0) / recentStable.length;
  const historical = input.history ? validatePoints(input.history, period, false) : [];
  const historyMean = historical.length >= MIN_RECURRENCE_POINTS ? historical.reduce((sum, point) => sum + point.amount, 0) / historical.length : null;
  const recurring = weekdayPace([...observed, ...historical]);
  const baseline = recurring ?? (historyMean === null ? overall : 0.7 * overall + 0.3 * historyMean);
  const recentWeight = observed.length >= 7 ? 0.7 : 0.6;
  const pace = recentWeight * recentMean + (1 - recentWeight) * baseline;
  const remaining = Math.max(0, period.daysInPeriod - period.dayOfPeriod);
  const estimate = spent + pace * remaining;
  const volatility = Math.sqrt(stable.reduce((sum, value) => sum + (value - pace) ** 2, 0) / stable.length);
  const confidence = observed.length >= 14 ? "high" : observed.length >= 7 ? "medium" : "low";
  const uncertaintyFactor = confidence === "low" ? 2 : confidence === "medium" ? 1.5 : 1;
  const spread = volatility * Math.sqrt(Math.max(1, remaining)) * uncertaintyFactor;
  const probableRange = { low: Math.max(spent, estimate - spread), high: estimate + spread };
  const breachRisk = budget && budget > 0 ? estimate >= budget ? "likely" : probableRange.high >= budget ? "possible" : "none" : null;
  return { status: "ready", centralEstimate: estimate, probableRange, recentPace: recentMean, volatility, confidence, breachRisk };
}
