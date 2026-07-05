import { describe, expect, it, vi } from "vitest";

import { fetchUsdRate } from "@/lib/fx/rate";

const NOW = new Date("2026-07-04T12:00:00Z");

function fakeFetch(
  response: { ok: boolean; body?: unknown } | Error,
): typeof fetch {
  return vi.fn(async () => {
    if (response instanceof Error) throw response;
    return {
      ok: response.ok,
      json: async () => response.body,
    } as Response;
  }) as unknown as typeof fetch;
}

describe("fetchUsdRate — frozen FX capture (invariant #4, best-effort)", () => {
  it("USD needs no conversion: identity rate, no network call", async () => {
    const fetchFn = fakeFetch(new Error("should not be called"));
    const frozen = await fetchUsdRate("USD", fetchFn, NOW);
    expect(frozen).toEqual({ rate: 1, source: "identity", date: "2026-07-04" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("freezes a live rate for a foreign currency", async () => {
    const frozen = await fetchUsdRate(
      "BRL",
      fakeFetch({ ok: true, body: { result: "success", rates: { BRL: 5.42 } } }),
      NOW,
    );
    expect(frozen).toEqual({
      rate: 5.42,
      source: "open.er-api.com",
      date: "2026-07-04",
    });
  });

  it("returns null (never a guess) when the request fails", async () => {
    expect(await fetchUsdRate("BRL", fakeFetch({ ok: false }), NOW)).toBeNull();
    expect(await fetchUsdRate("BRL", fakeFetch(new Error("network")), NOW)).toBeNull();
  });

  it("returns null on a bad payload or missing currency", async () => {
    expect(
      await fetchUsdRate("BRL", fakeFetch({ ok: true, body: { result: "error" } }), NOW),
    ).toBeNull();
    expect(
      await fetchUsdRate(
        "BRL",
        fakeFetch({ ok: true, body: { result: "success", rates: { EUR: 0.9 } } }),
        NOW,
      ),
    ).toBeNull();
  });
});
