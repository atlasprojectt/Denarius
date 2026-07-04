import { describe, expect, it } from "vitest";

import {
  connectionFreshness,
  freshness,
  type ConnectionStatus,
} from "@/lib/engine/freshness";

const NOW = new Date("2026-07-04T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

describe("connectionFreshness — one connection", () => {
  it("is fresh when synced within the last day", () => {
    const r = connectionFreshness(
      { provider: "openai", status: "active", lastSyncAt: hoursAgo(6) },
      NOW,
    );
    expect(r).toEqual({ provider: "openai", state: "fresh", ageHours: 6 });
  });

  it("is stale once more than a day without a successful sync", () => {
    const r = connectionFreshness(
      { provider: "anthropic", status: "active", lastSyncAt: hoursAgo(72) },
      NOW,
    );
    expect(r?.state).toBe("stale");
    expect(r?.ageHours).toBe(72);
  });

  it("is failed when the last sync errored, regardless of age", () => {
    const r = connectionFreshness(
      { provider: "openai", status: "error", lastSyncAt: hoursAgo(2) },
      NOW,
    );
    expect(r?.state).toBe("failed");
  });

  it("is never when there is no successful sync yet", () => {
    const r = connectionFreshness(
      { provider: "anthropic", status: "active", lastSyncAt: null },
      NOW,
    );
    expect(r).toEqual({ provider: "anthropic", state: "never", ageHours: null });
  });

  it("excludes revoked connections (turned off on purpose)", () => {
    const r = connectionFreshness(
      { provider: "openai", status: "revoked", lastSyncAt: hoursAgo(1) },
      NOW,
    );
    expect(r).toBeNull();
  });

  it("respects the exact staleness boundary (>24h, not ≥)", () => {
    const at24 = connectionFreshness(
      { provider: "openai", status: "active", lastSyncAt: hoursAgo(24) },
      NOW,
    );
    const past24 = connectionFreshness(
      { provider: "openai", status: "active", lastSyncAt: hoursAgo(25) },
      NOW,
    );
    expect(at24?.state).toBe("fresh");
    expect(past24?.state).toBe("stale");
  });
});

describe("freshness — banner decision across connections", () => {
  const connections: ConnectionStatus[] = [
    { provider: "openai", status: "active", lastSyncAt: hoursAgo(3) },
    { provider: "anthropic", status: "active", lastSyncAt: hoursAgo(50) },
  ];

  it("raises the banner when any connection needs attention", () => {
    const f = freshness(connections, NOW);
    expect(f.showBanner).toBe(true);
    expect(f.needsAttention.map((c) => c.provider)).toEqual(["anthropic"]);
  });

  it("stays quiet when every active connection is fresh", () => {
    const f = freshness(
      [{ provider: "openai", status: "active", lastSyncAt: hoursAgo(1) }],
      NOW,
    );
    expect(f.showBanner).toBe(false);
    expect(f.needsAttention).toEqual([]);
  });

  it("ignores revoked connections entirely", () => {
    const f = freshness(
      [{ provider: "openai", status: "revoked", lastSyncAt: null }],
      NOW,
    );
    expect(f.connections).toEqual([]);
    expect(f.showBanner).toBe(false);
  });
});
