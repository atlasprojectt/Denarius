import "server-only";

import { weekOverWeek } from "@/lib/engine/week-change";
import { topDrivers } from "@/lib/engine/drivers";
import { logFailure, logSkipped } from "@/lib/logging/server-log";
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
    logSkipped("notify.digest", tenantId, { reason: "no org budget" });
    return { tenantId, outcome: "no-budget", narrated: false };
  }
  const recipients = digestRecipients(snapshot.users);
  if (recipients.length === 0) {
    logSkipped("notify.digest", tenantId, { reason: "no recipients" });
    return { tenantId, outcome: "no-recipients", narrated: false };
  }
  if (channel === null) {
    logSkipped("notify.digest", tenantId, { reason: "no channel configured" });
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

  if (!sendResult.ok) {
    logFailure("notify.digest", tenantId, { reason: sendResult.error });
  } else if (safeNarration === null) {
    // Sent, but on the deterministic template. Worth a line: a narrator that
    // is failing or answering with un-injected numbers degrades silently by
    // design, and silence is exactly how it would stay unnoticed.
    logSkipped("notify.digest_narration", tenantId, {
      reason: narrator === null ? "no narrator configured" : "narration rejected",
    });
  }

  return {
    tenantId,
    outcome: sendResult.ok ? "sent" : "failed",
    narrated: safeNarration !== null,
  };
}
