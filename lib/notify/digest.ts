import "server-only";

import { weekOverWeek } from "@/lib/engine/week-change";
import { topDrivers } from "@/lib/engine/drivers";
import type { Narrator } from "@/lib/narrate/client";
import {
  buildDigestFacts,
  digestPrompt,
  digestTemplate,
  injectedStrings,
  narrationIsSafe,
} from "@/lib/narrate/digest";

import type { NotificationChannel } from "./channel";
import { digestRecipients } from "./recipients";
import { appBaseUrl, renderDigestEmail } from "./render";
import { tenantSnapshot } from "./snapshot";

// Weekly digest for ONE tenant (issue #20): assemble deterministic facts from
// the snapshot, let the LLM rephrase them (narration), verify the output
// contains no non-injected figure, and email Admins who haven't opted out.

export type DigestRunResult = {
  tenantId: string;
  outcome: "sent" | "failed" | "no-budget" | "no-recipients" | "no-channel";
  /** True when the LLM narration was used; false = deterministic template. */
  narrated: boolean;
};

export async function sendWeeklyDigest(
  tenantId: string,
  channel: NotificationChannel | null,
  narrator: Narrator | null,
  now: Date = new Date(),
): Promise<DigestRunResult> {
  const snapshot = await tenantSnapshot(tenantId, now);

  // No org budget → cold start; there is no verdict to summarize yet.
  if (snapshot.cockpit.state !== "ready") {
    return { tenantId, outcome: "no-budget", narrated: false };
  }
  const recipients = digestRecipients(snapshot.users);
  if (recipients.length === 0) {
    return { tenantId, outcome: "no-recipients", narrated: false };
  }
  if (channel === null) {
    return { tenantId, outcome: "no-channel", narrated: false };
  }

  const { cockpit } = snapshot;
  const facts = buildDigestFacts({
    verdict: cockpit.verdict,
    monthLabel: snapshot.monthLabel,
    currency: snapshot.currency,
    spent: cockpit.org.spent,
    budget: cockpit.org.budget,
    pctSpent: cockpit.org.pctSpent,
    projection: cockpit.org.projection,
    projectedMargin: cockpit.org.projectedMargin,
    weekChange: weekOverWeek(snapshot.recentCosts, now),
    drivers: topDrivers(snapshot.teamSpendDrivers),
  });

  // Narration is best-effort: unavailable, failed, or unsafe → the template.
  const narration = narrator ? await narrator.narrate(digestPrompt(facts)) : null;
  const safeNarration =
    narration !== null && narrationIsSafe(narration, injectedStrings(facts))
      ? narration
      : null;
  const body = safeNarration ?? digestTemplate(facts);

  const sendResult = await channel.send(
    renderDigestEmail({
      body,
      monthLabel: snapshot.monthLabel,
      to: recipients,
      appUrl: appBaseUrl(),
    }),
  );

  return {
    tenantId,
    outcome: sendResult.ok ? "sent" : "failed",
    narrated: safeNarration !== null,
  };
}
