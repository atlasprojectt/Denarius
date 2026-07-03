import "server-only";

import { createFakeOpenAIProvider } from "@/lib/connectors/fake";
import { OpenAIProvider } from "@/lib/connectors/openai";
import type { UsageProvider } from "@/lib/connectors/types";

/**
 * Provider factory. The fake backend only ever activates when BOTH the
 * server-side env flag is set and the key uses the reserved fake prefix —
 * a real deployment without ALLOW_FAKE_PROVIDER always talks to OpenAI.
 */
export function providerFor(
  _provider: "openai", // Anthropic joins the union in issue #16
  adminKey: string,
): UsageProvider {
  if (
    process.env.ALLOW_FAKE_PROVIDER === "1" &&
    adminKey.startsWith("sk-fake")
  ) {
    return createFakeOpenAIProvider();
  }
  return new OpenAIProvider(adminKey);
}
