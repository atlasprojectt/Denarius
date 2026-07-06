// Denarius — email rendering (pure, no I/O). Turns a finding (or digest body)
// into a RenderedNotification: pt-BR copy, every figure preformatted by
// money()/percent() (deterministic display — the LLM never touches alerts),
// and a deep link that lands on the Home (mobile-legible target, PRD P4).

import type { BudgetThresholdFinding } from "@/lib/findings/budget-threshold";
import type { ThresholdLevel } from "@/lib/engine/thresholds";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";

import type { RenderedNotification } from "./channel";

const copy = {
  subjectByLevel: {
    warning: (name: string) => `Aviso de orçamento — ${name}`,
    projected_breach: (name: string) => `Projeção acima do orçamento — ${name}`,
    breach: (name: string) => `Orçamento estourado — ${name}`,
  } satisfies Record<ThresholdLevel, (name: string) => string>,
  headlineByLevel: {
    warning: (pct: string) => `atingiu ${pct} do orçamento do período.`,
    projected_breach: (over: string, end: string) =>
      `no ritmo atual, fecha ${over} acima do orçamento em ${end}.`,
    breach: (over: string) => `já passou o orçamento do período em ${over}.`,
  },
  spent: "Gasto até agora",
  budget: "Orçamento",
  projection: "Projeção de fechamento",
  projectedMargin: "Margem projetada",
  drivers: "Principais consumidores",
  plan: "O que você pode fazer",
  planNote:
    "Recomendações — o Denarius aponta, a decisão é sua. Nada é aplicado automaticamente.",
  open: "Abrir o Denarius",
  digestSubject: (month: string) => `Resumo semanal do Denarius — ${month}`,
  footer: "Você recebe este e-mail por ser administrador no Denarius.",
};

/** Minimal single-column HTML shell — legible on a phone, no CSS framework. */
function htmlShell(title: string, bodyHtml: string, appUrl: string): string {
  return `<div style="max-width:480px;margin:0 auto;padding:24px 16px;font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a">
<p style="font-weight:700;font-size:14px;letter-spacing:0.02em">Denarius</p>
<h1 style="font-size:18px;line-height:1.4;margin:16px 0">${title}</h1>
${bodyHtml}
<p style="margin:24px 0"><a href="${appUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px">${copy.open}</a></p>
<p style="font-size:12px;color:#6b7280">${copy.footer}</p>
</div>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export type AlertRenderInput = {
  finding: BudgetThresholdFinding;
  to: string[];
  appUrl: string;
  /** e.g. "31 de julho" — the period close, for the projected sentence. */
  periodEndLabel: string;
};

/** Event alert email for one budget-threshold finding. */
export function renderAlertEmail(input: AlertRenderInput): RenderedNotification {
  const { finding, to, appUrl, periodEndLabel } = input;
  const { numbers, currency, level, targetName } = finding;

  const over = money(finding.overrun, currency);
  const headline =
    level === "warning"
      ? `${targetName} ${copy.headlineByLevel.warning(percent(numbers.pctSpent))}`
      : level === "projected_breach"
        ? `${targetName}: ${copy.headlineByLevel.projected_breach(over, periodEndLabel)}`
        : `${targetName} ${copy.headlineByLevel.breach(over)}`;

  const facts: [string, string][] = [
    [copy.spent, `${money(numbers.spent, currency)} (${percent(numbers.pctSpent)})`],
    [copy.budget, money(numbers.budget, currency)],
  ];
  if (numbers.projection !== null && numbers.projectedMargin !== null) {
    facts.push([copy.projection, money(numbers.projection, currency)]);
    facts.push([copy.projectedMargin, money(numbers.projectedMargin, currency)]);
  }

  const driverLines = finding.drivers.map(
    (d) => `${d.label}: ${money(d.value, currency)} (${percent(d.share)})`,
  );
  const planLines = finding.controlPlan.map((a) => a.title);

  const textParts = [
    headline,
    "",
    ...facts.map(([label, value]) => `${label}: ${value}`),
  ];
  if (driverLines.length > 0) {
    textParts.push("", `${copy.drivers}:`, ...driverLines.map((l) => `- ${l}`));
  }
  if (planLines.length > 0) {
    textParts.push(
      "",
      `${copy.plan}:`,
      ...planLines.map((l) => `- ${l}`),
      copy.planNote,
    );
  }
  textParts.push("", appUrl);

  const factsHtml = facts
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">${escapeHtml(label)}</td><td style="padding:4px 0;font-size:14px;font-variant-numeric:tabular-nums"><strong>${escapeHtml(value)}</strong></td></tr>`,
    )
    .join("");
  const driversHtml =
    driverLines.length > 0
      ? `<p style="font-size:14px;margin:16px 0 4px;color:#6b7280">${copy.drivers}</p><ul style="margin:0;padding-left:20px;font-size:14px">${driverLines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`
      : "";
  const planHtml =
    planLines.length > 0
      ? `<p style="font-size:14px;margin:16px 0 4px;color:#6b7280">${copy.plan}</p><ul style="margin:0;padding-left:20px;font-size:14px">${planLines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul><p style="font-size:12px;color:#6b7280">${copy.planNote}</p>`
      : "";

  return {
    to,
    subject: copy.subjectByLevel[level](targetName),
    text: textParts.join("\n"),
    html: htmlShell(
      escapeHtml(headline),
      `<table style="border-collapse:collapse">${factsHtml}</table>${driversHtml}${planHtml}`,
      appUrl,
    ),
  };
}

export type DigestRenderInput = {
  /** Already-validated body: LLM narration or the deterministic template. */
  body: string;
  monthLabel: string;
  to: string[];
  appUrl: string;
};

/** Weekly digest email — the body arrives assembled (and number-checked). */
export function renderDigestEmail(input: DigestRenderInput): RenderedNotification {
  const { body, monthLabel, to, appUrl } = input;
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="font-size:14px;line-height:1.6;white-space:pre-line">${escapeHtml(p.trim())}</p>`)
    .join("");

  return {
    to,
    subject: copy.digestSubject(monthLabel),
    text: `${body}\n\n${appUrl}`,
    html: htmlShell(escapeHtml(copy.digestSubject(monthLabel)), paragraphs, appUrl),
  };
}

/** Deep-link base, disclosed nowhere client-side; prod default is the live app. */
export function appBaseUrl(): string {
  return process.env.APP_BASE_URL ?? "https://denarius-nine.vercel.app";
}
