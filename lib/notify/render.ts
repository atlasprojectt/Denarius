// Denarius — email rendering (pure, no I/O). Turns a finding (or digest body)
// into a RenderedNotification: pt-BR copy, every figure preformatted by
// money()/percent() (deterministic display — the LLM never touches alerts),
// and a deep link that lands on the Home (mobile-legible target, PRD P4).

import {
  emailButton,
  emailFacts,
  emailList,
  emailPanel,
  emailPanelNote,
  emailParagraph,
  renderEmailLayout,
} from "@/lib/email/layout";
import type { BudgetThresholdFinding } from "@/lib/findings/budget-threshold";
import type { ThresholdLevel } from "@/lib/engine/thresholds";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";

import type { RenderedNotification } from "./channel";

const copy = {
  titleByLevel: {
    warning: "Aviso de orçamento",
    projected_breach: "Projeção acima do orçamento",
    breach: "Orçamento estourado",
  } satisfies Record<ThresholdLevel, string>,
  subject: (title: string, name: string) => `${title} — ${name}`,
  alertEyebrow: (name: string) => `Alerta de orçamento · ${name}`,
  headlineByLevel: {
    warning: (pct: string) => `atingiu ${pct} do orçamento do período.`,
    projected_breach: (over: string, end: string) =>
      `no ritmo atual, fecha ${over} acima do orçamento em ${end}.`,
    breach: (over: string) => `já passou o orçamento do período em ${over}.`,
  },
  facts: "Situação do período",
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
  digestEyebrow: "Resumo semanal",
  digestTitle: (month: string) => `Seu gasto com IA em ${month}`,
  footerNote: "Você recebe este e-mail por ser administrador no Denarius.",
};

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

  const body = [
    emailParagraph(headline),
    emailPanel(copy.facts, emailFacts(facts)),
    driverLines.length > 0 ? emailPanel(copy.drivers, emailList(driverLines)) : "",
    planLines.length > 0
      ? emailPanel(copy.plan, emailList(planLines) + emailPanelNote(copy.planNote))
      : "",
    emailButton(appUrl, copy.open),
  ].join("");

  const title = copy.titleByLevel[level];
  return {
    to,
    subject: copy.subject(title, targetName),
    text: textParts.join("\n"),
    html: renderEmailLayout({
      preheader: headline,
      eyebrow: copy.alertEyebrow(targetName),
      title,
      body,
      footerNote: copy.footerNote,
    }),
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
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return {
    to,
    subject: copy.digestSubject(monthLabel),
    text: `${body}\n\n${appUrl}`,
    html: renderEmailLayout({
      preheader: paragraphs[0] ?? copy.digestSubject(monthLabel),
      eyebrow: copy.digestEyebrow,
      title: copy.digestTitle(monthLabel),
      body: paragraphs.map(emailParagraph).join("") + emailButton(appUrl, copy.open),
      footerNote: copy.footerNote,
    }),
  };
}
