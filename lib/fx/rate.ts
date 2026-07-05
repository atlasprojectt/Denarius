// Denarius — FX rate capture for the frozen-per-period budget conversion
// (PRD P8, invariant #4). USD is the source of truth for provider spend; to
// compare it against a display-currency budget we freeze one USD→display rate
// at period start and disclose it on screen. Capture is best-effort: a failure
// returns null (the budget still saves; the missing rate is disclosed, never
// guessed — error-handling rule "show the gap").
//
// The network fetch is injected (`fetchFn`) so the action can call it at the
// edge while tests stay deterministic — the same seam the connectors use.

export type FrozenRate = {
  /** Multiply a USD amount by this to get the display currency. */
  rate: number;
  /** Where the rate came from, disclosed on screen. */
  source: string;
  /** yyyy-mm-dd the rate was captured. */
  date: string;
};

type FetchFn = typeof fetch;

// Free, no-key USD reference rates. Only the edge (server action) hits it.
const RATE_ENDPOINT = "https://open.er-api.com/v6/latest/USD";

function today(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Freezes the USD→`toCurrency` rate. USD needs no conversion (identity rate 1).
 * Any failure (network, missing currency, bad shape) resolves to null so the
 * caller can save the budget and disclose the gap.
 */
export async function fetchUsdRate(
  toCurrency: string,
  fetchFn: FetchFn = fetch,
  now: Date = new Date(),
): Promise<FrozenRate | null> {
  const target = toCurrency.trim().toUpperCase();
  if (target === "" || target === "USD") {
    return { rate: 1, source: "identity", date: today(now) };
  }

  try {
    const res = await fetchFn(RATE_ENDPOINT);
    if (!res.ok) return null;
    const body = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    const rate = body.rates?.[target];
    if (body.result !== "success" || typeof rate !== "number" || !(rate > 0)) {
      return null;
    }
    return { rate, source: "open.er-api.com", date: today(now) };
  } catch {
    return null;
  }
}
