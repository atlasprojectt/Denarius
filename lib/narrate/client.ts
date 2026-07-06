// Denarius — narration client (issue #20, backend spec §7). A thin,
// provider-agnostic seam over "turn this prompt into prose": the model is
// swappable via NARRATION_MODEL, the transport is an injectable fetchFn (the
// connectors' pattern — no SDK dependency), and EVERY failure resolves to
// null so callers fall back to the deterministic template. The LLM phrases;
// it never computes (invariant #2) — enforcement lives in digest.ts.

export type Narrator = {
  narrate(input: { system: string; prompt: string }): Promise<string | null>;
};

type FetchFn = typeof fetch;

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
// Claude Haiku 4.5 (PRD P4): narration is cheap, short-form phrasing.
const DEFAULT_MODEL = "claude-haiku-4-5";

type MessagesResponse = {
  content?: { type: string; text?: string }[];
  stop_reason?: string;
};

export function anthropicNarrator(fetchFn: FetchFn = fetch): Narrator | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const model = process.env.NARRATION_MODEL ?? DEFAULT_MODEL;

  return {
    async narrate({ system, prompt }) {
      try {
        const response = await fetchFn(ANTHROPIC_ENDPOINT, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            max_tokens: 600,
            system,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (!response.ok) return null;
        const body = (await response.json()) as MessagesResponse;
        if (body.stop_reason === "refusal") return null;
        const text = body.content?.find((b) => b.type === "text")?.text;
        return typeof text === "string" && text.trim() !== "" ? text.trim() : null;
      } catch {
        return null;
      }
    },
  };
}
