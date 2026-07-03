// The UsageProvider seam (architecture §3): every provider — real or fake —
// speaks these canonical shapes; everything downstream (sync, engine, UI)
// never sees a provider-specific payload.

/** Unix seconds, UTC. End is exclusive. */
export type DateRange = { startTime: number; endTime: number };

/** Tokens for one (day, project, key, user, model) cell. Daily UTC buckets. */
export type UsageBucket = {
  /** yyyy-mm-dd (UTC). */
  date: string;
  projectId: string;
  apiKeyId: string;
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

/** Provider-reported dollars for one (day, project, line item) cell. */
export type CostBucket = {
  /** yyyy-mm-dd (UTC). */
  date: string;
  projectId: string;
  lineItem: string;
  amount: number;
  /** Lowercase ISO code as the provider reports it (invariant #4: USD truth). */
  currency: string;
};

export type ConnectionTest =
  | { ok: true }
  | { ok: false; reason: "invalid_key" | "network" | "unexpected" };

export interface UsageProvider {
  readonly provider: "openai" | "anthropic";
  testConnection(): Promise<ConnectionTest>;
  fetchUsage(range: DateRange): Promise<UsageBucket[]>;
  fetchCosts(range: DateRange): Promise<CostBucket[]>;
}
