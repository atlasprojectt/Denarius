import { describe, expect, it } from "vitest";

import type { BudgetEvaluation } from "@/lib/engine/budget";
import { activeLevels } from "@/lib/engine/thresholds";
import { buildBudgetThresholdFinding } from "@/lib/findings/budget-threshold";
import type {
  NotificationChannel,
  RenderedNotification,
  SendResult,
} from "@/lib/notify/channel";
import { ResendChannel } from "@/lib/notify/channel";
import { planAlert } from "@/lib/notify/plan";
import { alertRecipients, digestRecipients } from "@/lib/notify/recipients";
import { renderAlertEmail, renderDigestEmail } from "@/lib/notify/render";

// The acceptance-criteria "second fake implementation" of the channel seam:
// records what it was asked to send, succeeds or fails on demand.
class FakeChannel implements NotificationChannel {
  sent: RenderedNotification[] = [];
  failNext = false;

  async send(msg: RenderedNotification): Promise<SendResult> {
    if (this.failNext) {
      this.failNext = false;
      return { ok: false, error: "fake failure" };
    }
    this.sent.push(msg);
    return { ok: true };
  }
}

function evaluation(overrides: Partial<BudgetEvaluation> = {}): BudgetEvaluation {
  return {
    budget: 10_000,
    spent: 8_500,
    projection: 12_000,
    currentMargin: 1_500,
    projectedMargin: -2_000,
    pctSpent: 0.85,
    pctElapsed: 0.6,
    collecting: false,
    breached: false,
    projectedBreach: true,
    ...overrides,
  };
}

describe("planAlert — the de-dup acceptance criteria (PRD P11)", () => {
  it("a first crossing fires once and logs every newly-crossed level", () => {
    const plan = planAlert(["warning", "projected_breach"], []);
    // One email (the most severe), both levels recorded as sent.
    expect(plan.emailLevel).toBe("projected_breach");
    expect(plan.logLevels).toEqual(["warning", "projected_breach"]);
  });

  it("the same crossing on a later sync never re-fires", () => {
    const plan = planAlert(
      ["warning", "projected_breach"],
      ["warning", "projected_breach"],
    );
    expect(plan.emailLevel).toBeNull();
    expect(plan.logLevels).toEqual([]);
  });

  it("escalation to a higher level fires again", () => {
    const plan = planAlert(["breach"], ["warning", "projected_breach"]);
    expect(plan.emailLevel).toBe("breach");
    expect(plan.logLevels).toEqual(["breach"]);
  });

  it("a re-crossed LOWER level after an edit stays silent (log never resets)", () => {
    // Budget edited up mid-period: only the warning is active again, but the
    // projected_breach was already sent — nothing may fire (invariant #6).
    const plan = planAlert(["warning"], ["warning", "projected_breach"]);
    expect(plan.emailLevel).toBeNull();
  });

  it("next period resets: an empty log fires like the first time", () => {
    // The log is keyed by period_month — a new period reads back no rows.
    const plan = planAlert(["warning"], []);
    expect(plan.emailLevel).toBe("warning");
  });

  it("a straight jump to breach sends exactly one email", () => {
    const levels = activeLevels(
      evaluation({ spent: 11_000, pctSpent: 1.1, breached: true }),
    );
    const plan = planAlert(levels, []);
    expect(plan.emailLevel).toBe("breach");
    expect(plan.logLevels).toEqual(["breach"]);
  });
});

describe("recipients", () => {
  const users = [
    { email: "ceo@acme.dev", role: "admin", digestOptOut: false },
    { email: "cto@acme.dev", role: "admin", digestOptOut: true },
    { email: "dev@acme.dev", role: "viewer", digestOptOut: false },
  ];

  it("event alerts go to every admin, never to viewers", () => {
    expect(alertRecipients(users)).toEqual(["ceo@acme.dev", "cto@acme.dev"]);
  });

  it("the digest honors the opt-out (acceptance criterion)", () => {
    expect(digestRecipients(users)).toEqual(["ceo@acme.dev"]);
  });
});

describe("renderAlertEmail", () => {
  const finding = buildBudgetThresholdFinding({
    scope: "team",
    targetId: "team-1",
    targetName: "Marketing",
    evaluation: evaluation(),
    thresholds: [0.8, 1.0],
    currency: "BRL",
  })!;

  const msg = renderAlertEmail({
    finding,
    to: ["ceo@acme.dev"],
    appUrl: "https://denarius.example",
    periodEndLabel: "31 de julho",
  });

  it("names the target and level in the subject", () => {
    expect(msg.subject).toContain("Marketing");
    expect(msg.subject).toContain("Projeção acima do orçamento");
  });

  it("carries only engine-computed, formatted figures", () => {
    // Highest active level is projected_breach → overrun = projection − budget.
    expect(msg.text).toContain("31 de julho");
    expect(msg.text).toContain("85%"); // pctSpent
    expect(msg.text).toMatch(/8\.500,00/); // spent
    expect(msg.text).toMatch(/10\.000,00/); // budget
    expect(msg.text).toMatch(/12\.000,00/); // projection
  });

  it("recommends only catalog actions and deep-links to the app", () => {
    for (const action of finding.controlPlan) {
      expect(msg.text).toContain(action.title);
    }
    expect(msg.html).toContain("https://denarius.example");
    expect(msg.to).toEqual(["ceo@acme.dev"]);
  });

  it("escapes HTML in interpolated names", () => {
    const hostile = renderAlertEmail({
      finding: { ...finding, targetName: "<img src=x>" },
      to: ["ceo@acme.dev"],
      appUrl: "https://denarius.example",
      periodEndLabel: "31 de julho",
    });
    expect(hostile.html).not.toContain("<img src=x>");
  });
});

describe("renderDigestEmail", () => {
  it("wraps the body and deep-links to the app", () => {
    const msg = renderDigestEmail({
      body: "Primeiro parágrafo.\n\nSegundo parágrafo.",
      monthLabel: "julho",
      to: ["ceo@acme.dev"],
      appUrl: "https://denarius.example",
    });
    expect(msg.subject).toContain("julho");
    expect(msg.text).toContain("Primeiro parágrafo.");
    expect(msg.html).toContain("Segundo parágrafo.");
    expect(msg.html).toContain("https://denarius.example");
  });
});

describe("channel seam", () => {
  it("the fake implementation satisfies the interface end to end", async () => {
    const channel = new FakeChannel();
    const msg: RenderedNotification = {
      to: ["a@b.c"],
      subject: "s",
      text: "t",
      html: "<p>t</p>",
    };
    expect(await channel.send(msg)).toEqual({ ok: true });
    expect(channel.sent).toEqual([msg]);

    channel.failNext = true;
    expect((await channel.send(msg)).ok).toBe(false);
  });

  it("ResendChannel posts the message and reports non-2xx as failure", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchFn = (async (url: unknown, init?: RequestInit) => {
      calls.push({ url: String(url), init: init! });
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    const channel = new ResendChannel("re_key", "Denarius <x@y.z>", fetchFn);
    const result = await channel.send({
      to: ["ceo@acme.dev"],
      subject: "s",
      text: "t",
      html: "<p>t</p>",
    });
    expect(result.ok).toBe(true);
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.to).toEqual(["ceo@acme.dev"]);
    expect(body.from).toBe("Denarius <x@y.z>");

    const failing = new ResendChannel(
      "re_key",
      "x@y.z",
      (async () => new Response("nope", { status: 422 })) as typeof fetch,
    );
    const failed = await failing.send({ to: ["a"], subject: "s", text: "t", html: "h" });
    expect(failed).toEqual({ ok: false, error: "resend responded 422" });
  });
});
