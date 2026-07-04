import { AnthropicProvider } from "@/lib/connectors/anthropic";
import { OpenAIProvider } from "@/lib/connectors/openai";

// Fake provider backends: serve canonical Admin API pages through the SAME
// parsing/pagination code path as production (the fake replaces `fetch`, not
// the provider). Used by unit tests and — behind ALLOW_FAKE_PROVIDER — by the
// dev demo while the real Admin keys are pending (issue #11).
//
// Deterministic daily OpenAI story, per UTC day in the requested range:
//   proj_eng        gpt-4o      (Ana)    1.2M in / 0.3M out  → $6.00 derived
//   proj_eng        gpt-4o-mini (Bruno)  4.0M in / 1.0M out  → $1.20 derived
//   proj_eng        omni-nova   (Diego)  0.8M in / 0.2M out  → unknown model (uncosted)
//   proj_marketing  gpt-4o      (Carla)  0.5M in / 0.12M out → $2.45 derived
// Costs API (provider truth): proj_eng $9.20/day, proj_marketing $2.45/day.
//
// Deterministic daily Anthropic story (workspace/key grain — no user grain):
//   wrkspc_eng        apikey_eng_agents  claude-sonnet-4-5-20250929
//     0.9M uncached + 0.1M cache write + 0.2M cache read / 0.25M out → $7.35 derived
//   wrkspc_eng        apikey_eng_batch   claude-haiku-4-5-20251001
//     3.0M in / 0.8M out                                            → $7.00 derived
//   wrkspc_eng        apikey_eng_lab     claude-nova-experimental
//     0.5M in / 0.1M out                                            → unknown model (uncosted)
//   wrkspc_marketing  apikey_mkt_copy    claude-sonnet-4-5-20250929
//     0.4M in / 0.1M out                                            → $2.70 derived
// Cost report (provider truth): wrkspc_eng $14.95/day, wrkspc_marketing $2.70/day.

const PAGE_SIZE = 15; // forces pagination on ranges longer than 15 days

const DAILY_USAGE = [
  { project_id: "proj_eng", user_id: "user_ana", api_key_id: "key_ana", model: "gpt-4o", input_tokens: 1_200_000, output_tokens: 300_000 },
  { project_id: "proj_eng", user_id: "user_bruno", api_key_id: "key_bruno", model: "gpt-4o-mini", input_tokens: 4_000_000, output_tokens: 1_000_000 },
  { project_id: "proj_eng", user_id: "user_diego", api_key_id: "key_diego", model: "omni-nova", input_tokens: 800_000, output_tokens: 200_000 },
  { project_id: "proj_marketing", user_id: "user_carla", api_key_id: "key_carla", model: "gpt-4o", input_tokens: 500_000, output_tokens: 120_000 },
];

const DAILY_COSTS = [
  { project_id: "proj_eng", line_item: "completions", amount: { value: 9.2, currency: "usd" } },
  { project_id: "proj_marketing", line_item: "completions", amount: { value: 2.45, currency: "usd" } },
];

const DAILY_ANTHROPIC_USAGE = [
  {
    workspace_id: "wrkspc_eng",
    api_key_id: "apikey_eng_agents",
    model: "claude-sonnet-4-5-20250929",
    uncached_input_tokens: 900_000,
    cache_creation: { ephemeral_5m_input_tokens: 60_000, ephemeral_1h_input_tokens: 40_000 },
    cache_read_input_tokens: 200_000,
    output_tokens: 250_000,
  },
  {
    workspace_id: "wrkspc_eng",
    api_key_id: "apikey_eng_batch",
    model: "claude-haiku-4-5-20251001",
    uncached_input_tokens: 3_000_000,
    cache_creation: null,
    cache_read_input_tokens: 0,
    output_tokens: 800_000,
  },
  {
    workspace_id: "wrkspc_eng",
    api_key_id: "apikey_eng_lab",
    model: "claude-nova-experimental",
    uncached_input_tokens: 500_000,
    cache_creation: null,
    cache_read_input_tokens: 0,
    output_tokens: 100_000,
  },
  {
    workspace_id: "wrkspc_marketing",
    api_key_id: "apikey_mkt_copy",
    model: "claude-sonnet-4-5-20250929",
    uncached_input_tokens: 400_000,
    cache_creation: null,
    cache_read_input_tokens: 0,
    output_tokens: 100_000,
  },
];

const DAILY_ANTHROPIC_COSTS = [
  { workspace_id: "wrkspc_eng", description: "Claude usage", amount: "14.95", currency: "USD" },
  { workspace_id: "wrkspc_marketing", description: "Claude usage", amount: "2.70", currency: "USD" },
];

const DAY_SECONDS = 24 * 3600;

function dayStarts(startTime: number, endTime: number): number[] {
  const first = Math.floor(startTime / DAY_SECONDS) * DAY_SECONDS;
  const days: number[] = [];
  for (let t = first; t < endTime; t += DAY_SECONDS) days.push(t);
  return days;
}

function page(
  days: number[],
  cursor: number,
  results: (start: number) => unknown[],
): unknown {
  const slice = days.slice(cursor, cursor + PAGE_SIZE);
  const hasMore = cursor + PAGE_SIZE < days.length;
  return {
    object: "page",
    data: slice.map((start) => ({
      object: "bucket",
      start_time: start,
      end_time: start + DAY_SECONDS,
      results: results(start),
    })),
    has_more: hasMore,
    next_page: hasMore ? String(cursor + PAGE_SIZE) : null,
  };
}

/** Drop-in for fetch: answers the two OpenAI Admin endpoints with fixtures. */
export const fakeOpenAIFetch = async (
  url: string,
  _init: RequestInit,
): Promise<Response> => {
  const parsed = new URL(url);
  const params = parsed.searchParams;
  const startTime = Number(params.get("start_time") ?? 0);
  const endTime = Number(params.get("end_time") ?? Date.now() / 1000);
  const cursor = Number(params.get("page") ?? 0);
  const days = dayStarts(startTime, endTime);

  let body: unknown;
  if (parsed.pathname.endsWith("/usage/completions")) {
    body = page(days, cursor, () =>
      DAILY_USAGE.map((r) => ({ object: "organization.usage.completions.result", ...r })),
    );
  } else if (parsed.pathname.endsWith("/costs")) {
    body = page(days, cursor, () =>
      DAILY_COSTS.map((r) => ({ object: "organization.costs.result", ...r })),
    );
  } else {
    return new Response("not found", { status: 404 });
  }
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

/** Anthropic pages: RFC 3339 bucket stamps, same cursor pagination shape. */
function anthropicPage(
  days: number[],
  cursor: number,
  results: unknown[],
): unknown {
  const slice = days.slice(cursor, cursor + PAGE_SIZE);
  const hasMore = cursor + PAGE_SIZE < days.length;
  return {
    data: slice.map((start) => ({
      starting_at: new Date(start * 1000).toISOString().replace(/\.\d{3}Z$/, "Z"),
      ending_at: new Date((start + DAY_SECONDS) * 1000).toISOString().replace(/\.\d{3}Z$/, "Z"),
      results,
    })),
    has_more: hasMore,
    next_page: hasMore ? String(cursor + PAGE_SIZE) : null,
  };
}

/** Drop-in for fetch: answers the two Anthropic Admin endpoints with fixtures. */
export const fakeAnthropicFetch = async (
  url: string,
  _init: RequestInit,
): Promise<Response> => {
  const parsed = new URL(url);
  const params = parsed.searchParams;
  const startTime = Date.parse(params.get("starting_at") ?? "1970-01-01T00:00:00Z") / 1000;
  const endingAt = params.get("ending_at");
  const endTime = endingAt ? Date.parse(endingAt) / 1000 : Date.now() / 1000;
  const cursor = Number(params.get("page") ?? 0);
  const days = dayStarts(startTime, endTime);

  let body: unknown;
  if (parsed.pathname.endsWith("/usage_report/messages")) {
    body = anthropicPage(days, cursor, DAILY_ANTHROPIC_USAGE);
  } else if (parsed.pathname.endsWith("/cost_report")) {
    body = anthropicPage(days, cursor, DAILY_ANTHROPIC_COSTS);
  } else {
    return new Response("not found", { status: 404 });
  }
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export function createFakeOpenAIProvider(): OpenAIProvider {
  return new OpenAIProvider("sk-fake-demo", fakeOpenAIFetch);
}

export function createFakeAnthropicProvider(): AnthropicProvider {
  return new AnthropicProvider("sk-ant-fake-demo", fakeAnthropicFetch);
}
