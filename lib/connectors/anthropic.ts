import type {
  ConnectionTest,
  CostBucket,
  DateRange,
  UsageBucket,
  UsageProvider,
} from "@/lib/connectors/types";

// Anthropic Admin API connector (issue #16). Read-only: two GET endpoints.
//   Usage: /v1/organizations/usage_report/messages — tokens grouped by
//          workspace_id/api_key_id/model, daily UTC buckets. No user grain:
//          Anthropic attributes to keys/workspaces, never people (PRD §attribution).
//   Costs: /v1/organizations/cost_report — dollars grouped by
//          workspace_id/description (the API's native grain; onboarding
//          recommends one workspace per team, mirroring OpenAI's projects).
// Seam mapping: workspace_id → projectId, api_key_id → apiKeyId, userId "".
// `fetchFn` is injectable: tests and the dev fake serve canonical fixture
// pages through the exact same parsing/pagination path as production.

const BASE_URL = "https://api.anthropic.com/v1/organizations";
const API_VERSION = "2023-06-01";
const PAGE_LIMIT = 31; // max time buckets per page at 1d width ≈ one month
const MAX_PAGES = 60; // a provider cursor bug must never hang a server action

type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

type UsageResult = {
  workspace_id: string | null;
  api_key_id: string | null;
  model: string | null;
  uncached_input_tokens: number;
  cache_creation: {
    ephemeral_5m_input_tokens: number;
    ephemeral_1h_input_tokens: number;
  } | null;
  cache_read_input_tokens: number;
  output_tokens: number;
};

type CostResult = {
  workspace_id: string | null;
  description: string | null;
  /** Decimal string, e.g. "12.345678". */
  amount: string;
  currency: string;
};

type Page<T> = {
  data: { starting_at: string; results: T[] }[];
  has_more: boolean;
  next_page: string | null;
};

function rfc3339(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Input tokens billed at any rate: uncached + cache writes + cache reads. */
function totalInputTokens(result: UsageResult): number {
  const cacheCreation = result.cache_creation
    ? result.cache_creation.ephemeral_5m_input_tokens +
      result.cache_creation.ephemeral_1h_input_tokens
    : 0;
  return (
    result.uncached_input_tokens + cacheCreation + result.cache_read_input_tokens
  );
}

export class AnthropicProvider implements UsageProvider {
  readonly provider = "anthropic" as const;

  constructor(
    private readonly adminKey: string,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  private async getPage<T>(path: string, params: URLSearchParams): Promise<Page<T>> {
    const response = await this.fetchFn(`${BASE_URL}${path}?${params}`, {
      method: "GET",
      headers: {
        "x-api-key": this.adminKey,
        "anthropic-version": API_VERSION,
      },
    });
    if (!response.ok) {
      throw new Error(`anthropic ${path}: HTTP ${response.status}`);
    }
    return (await response.json()) as Page<T>;
  }

  /** Follows `next_page` cursors until the API reports no more buckets. */
  private async getAllPages<T>(
    path: string,
    baseParams: Record<string, string | string[]>,
  ): Promise<Page<T>["data"]> {
    const buckets: Page<T>["data"] = [];
    let cursor: string | null = null;
    for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(baseParams)) {
        for (const v of Array.isArray(value) ? value : [value]) {
          params.append(key, v);
        }
      }
      if (cursor) params.set("page", cursor);
      const page: Page<T> = await this.getPage<T>(path, params);
      buckets.push(...page.data);
      cursor = page.has_more ? page.next_page : null;
      if (!cursor) return buckets;
    }
    // Incomplete data must fail loudly — never render as a smaller total.
    throw new Error(`anthropic ${path}: pagination did not terminate after ${MAX_PAGES} pages`);
  }

  async testConnection(): Promise<ConnectionTest> {
    try {
      const params = new URLSearchParams({
        starting_at: rfc3339(Math.floor(Date.now() / 1000) - 24 * 3600),
        bucket_width: "1d",
        limit: "1",
      });
      const response = await this.fetchFn(
        `${BASE_URL}/usage_report/messages?${params}`,
        {
          method: "GET",
          headers: {
            "x-api-key": this.adminKey,
            "anthropic-version": API_VERSION,
          },
        },
      );
      if (response.ok) return { ok: true };
      if (response.status === 401 || response.status === 403) {
        return { ok: false, reason: "invalid_key" };
      }
      return { ok: false, reason: "unexpected" };
    } catch {
      return { ok: false, reason: "network" };
    }
  }

  async fetchUsage(range: DateRange): Promise<UsageBucket[]> {
    // Anthropic takes the bracket convention (`group_by[]=`), unlike OpenAI.
    const data = await this.getAllPages<UsageResult>("/usage_report/messages", {
      starting_at: rfc3339(range.startTime),
      ending_at: rfc3339(range.endTime),
      bucket_width: "1d",
      limit: String(PAGE_LIMIT),
      "group_by[]": ["workspace_id", "api_key_id", "model"],
    });
    return data.flatMap((bucket) =>
      bucket.results.map((result) => ({
        date: bucket.starting_at.slice(0, 10),
        projectId: result.workspace_id ?? "",
        apiKeyId: result.api_key_id ?? "",
        userId: "", // Anthropic has no per-user grain — attribution stops at key/workspace
        model: result.model ?? "",
        inputTokens: totalInputTokens(result),
        outputTokens: result.output_tokens,
      })),
    );
  }

  async fetchCosts(range: DateRange): Promise<CostBucket[]> {
    const data = await this.getAllPages<CostResult>("/cost_report", {
      starting_at: rfc3339(range.startTime),
      ending_at: rfc3339(range.endTime),
      bucket_width: "1d",
      limit: String(PAGE_LIMIT),
      "group_by[]": ["workspace_id", "description"],
    });
    return data.flatMap((bucket) =>
      bucket.results.map((result) => ({
        date: bucket.starting_at.slice(0, 10),
        projectId: result.workspace_id ?? "",
        lineItem: result.description ?? "",
        amount: Number(result.amount),
        currency: result.currency.toLowerCase(),
      })),
    );
  }
}
