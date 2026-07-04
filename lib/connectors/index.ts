import "server-only";

import { AnthropicProvider } from "@/lib/connectors/anthropic";
import {
  createFakeAnthropicProvider,
  createFakeOpenAIProvider,
} from "@/lib/connectors/fake";
import { OpenAIProvider } from "@/lib/connectors/openai";
import type { UsageProvider } from "@/lib/connectors/types";

// Reserved fake-key prefixes, one per provider (both are shaped like real
// keys so the zod schemas accept them in dev).
const FAKE_PREFIX = { openai: "sk-fake", anthropic: "sk-ant-fake" } as const;

/**
 * Provider factory. The fake backend only ever activates when BOTH the
 * server-side env flag is set and the key uses the reserved fake prefix —
 * a real deployment without ALLOW_FAKE_PROVIDER always talks to the provider.
 */
export function providerFor(
  provider: "openai" | "anthropic",
  adminKey: string,
): UsageProvider {
  const fake =
    process.env.ALLOW_FAKE_PROVIDER === "1" &&
    adminKey.startsWith(FAKE_PREFIX[provider]);

  if (provider === "anthropic") {
    return fake ? createFakeAnthropicProvider() : new AnthropicProvider(adminKey);
  }
  return fake ? createFakeOpenAIProvider() : new OpenAIProvider(adminKey);
}
