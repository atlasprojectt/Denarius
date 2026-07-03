import type {
  ConnectionTest,
  CostBucket,
  DateRange,
  UsageBucket,
  UsageProvider,
} from "@/lib/connectors/types";

// OpenAI Admin API connector (issue #15). Read-only: two GET endpoints.
//   Usage: /v1/organization/usage/completions — tokens grouped by
//          project_id/user_id/api_key_id/model, daily UTC buckets.
//   Costs: /v1/organization/costs — dollars grouped by project_id/line_item
//          (the API's only grain; that's why onboarding recommends one
//          project per team).
// `fetchFn` is injectable: tests and the dev fake serve canonical fixture
// pages through the exact same parsing/pagination path as production.

const BASE_URL = "https://api.openai.com/v1/organization";
const PAGE_LIMIT = 31; // one page ≈ one month of daily buckets

type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

type UsageResult = {
  project_id: string | null;
  user_id: string | null;
  api_key_id: string | null;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
};

type CostResult = {
  project_id: string | null;
  line_item: string | null;
  amount: { value: number; currency: string };
};

type Page<T> = {
  data: { start_time: number; results: T[] }[];
  has_more: boolean;
  next_page: string | null;
};

function utcDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

export class OpenAIProvider implements UsageProvider {
  readonly provider = "openai" as const;

  constructor(
    private readonly adminKey: string,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  private async getPage<T>(path: string, params: URLSearchParams): Promise<Page<T>> {
    const response = await this.fetchFn(`${BASE_URL}${path}?${params}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${this.adminKey}` },
    });
    if (!response.ok) {
      throw new Error(`openai ${path}: HTTP ${response.status}`);
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
    do {
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
    } while (cursor);
    return buckets;
  }

  async testConnection(): Promise<ConnectionTest> {
    try {
      const params = new URLSearchParams({
        start_time: String(Math.floor(Date.now() / 1000) - 24 * 3600),
        limit: "1",
      });
      const response = await this.fetchFn(
        `${BASE_URL}/usage/completions?${params}`,
        { method: "GET", headers: { Authorization: `Bearer ${this.adminKey}` } },
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
    const data = await this.getAllPages<UsageResult>("/usage/completions", {
      start_time: String(range.startTime),
      end_time: String(range.endTime),
      bucket_width: "1d",
      limit: String(PAGE_LIMIT),
      "group_by[]": ["project_id", "user_id", "api_key_id", "model"],
    });
    return data.flatMap((bucket) =>
      bucket.results.map((result) => ({
        date: utcDate(bucket.start_time),
        projectId: result.project_id ?? "",
        apiKeyId: result.api_key_id ?? "",
        userId: result.user_id ?? "",
        model: result.model ?? "",
        inputTokens: result.input_tokens,
        outputTokens: result.output_tokens,
      })),
    );
  }

  async fetchCosts(range: DateRange): Promise<CostBucket[]> {
    const data = await this.getAllPages<CostResult>("/costs", {
      start_time: String(range.startTime),
      end_time: String(range.endTime),
      limit: String(PAGE_LIMIT),
      "group_by[]": ["project_id", "line_item"],
    });
    return data.flatMap((bucket) =>
      bucket.results.map((result) => ({
        date: utcDate(bucket.start_time),
        projectId: result.project_id ?? "",
        lineItem: result.line_item ?? "",
        amount: result.amount.value,
        currency: result.amount.currency,
      })),
    );
  }
}
