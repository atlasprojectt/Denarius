import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { renderPasswordChangeCode } from "@/lib/auth/password-change-email";
import { EMAIL_CARD_STYLE, escapeHtml, renderEmailLayout } from "@/lib/email/layout";
import { renderInvite } from "@/lib/invitations/email";
import { renderAlertEmail, renderDigestEmail } from "@/lib/notify/render";
import { renderAccountDeletionCode } from "@/lib/privacy/deletion-email";
import { buildBudgetThresholdFinding } from "@/lib/findings/budget-threshold";

const LOGO = 'src="https://app.usedenarius.pro/brand/denarius-avatar.png"';
const BRAND_FOOTER = "Denarius · Governança de gasto com IA";

describe("e-mail layout", () => {
  it("escapes every interpolated plain string", () => {
    const html = renderEmailLayout({
      preheader: "<p>",
      eyebrow: '"x"',
      title: "<script>alert(1)</script>",
      body: "",
      footerNote: "a & b",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;x&quot;");
    expect(html).toContain("a &amp; b");
  });

  it("escapes quotes so a value cannot leave an attribute", () => {
    expect(escapeHtml(`"' <>&`)).toBe("&quot;&#39; &lt;&gt;&amp;");
  });
});

describe("every Denarius e-mail shares the layout", () => {
  const finding = buildBudgetThresholdFinding({
    scope: "org",
    targetId: "org",
    targetName: "Acme",
    evaluation: {
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
    },
    thresholds: [0.8, 1.0],
    currency: "USD",
  })!;

  const rendered = {
    invite: renderInvite({
      to: "a@b.c",
      companyName: "Acme",
      role: "viewer",
      inviteUrl: "https://app.usedenarius.pro/convite/tok",
    }).html,
    passwordChange: renderPasswordChangeCode({ to: "a@b.c", code: "123456" }).html,
    accountDeletion: renderAccountDeletionCode({ to: "a@b.c", code: "123456" }).html,
    digest: renderDigestEmail({
      body: "Um.\n\nDois.",
      monthLabel: "julho",
      to: ["a@b.c"],
      appUrl: "https://app.usedenarius.pro",
    }).html,
    alert: renderAlertEmail({
      finding,
      to: ["a@b.c"],
      appUrl: "https://app.usedenarius.pro",
      periodEndLabel: "31 de julho",
    }).html,
  };

  it.each(Object.entries(rendered))("%s", (_, html) => {
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain(EMAIL_CARD_STYLE);
    expect(html).toContain(LOGO);
    expect(html).toContain(BRAND_FOOTER);
  });

  it("code e-mails show the code in the same block as the signup template", () => {
    expect(rendered.passwordChange).toContain("letter-spacing:10px");
    expect(rendered.passwordChange).toContain(">123456</p>");
    expect(rendered.accountDeletion).toContain(">123456</p>");
  });

  it("the call to action is the brand pill, never a status color", () => {
    expect(rendered.digest).toContain("background:#ff5100");
    expect(rendered.digest).toContain("border-radius:999px");
  });
});

describe("Supabase auth templates mirror the layout", () => {
  // Supabase renders these itself, so they are hand-copies of the layout.
  it.each(["confirmation.html", "recovery.html"])("%s", (file) => {
    const html = readFileSync(join(process.cwd(), "supabase/templates", file), "utf8");
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain(EMAIL_CARD_STYLE);
    expect(html).toContain(LOGO);
    expect(html).toContain(BRAND_FOOTER);
  });
});
