// Denarius — apontamento rules (pure, no I/O). Decision-support observations
// BELOW the warning threshold (PRD stories 37/38, P14): deterministic, calm,
// in-app only — never emailed, never styled as alarms. The system points, the
// CEO decides. Every figure is engine-computed and formatted by money()/
// percent(); no LLM is involved anywhere in this path.

import type { TeamSpendMix } from "@/lib/engine/team-spend";
import { topDrivers } from "@/lib/engine/drivers";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";

// Deterministic rule thresholds — tuned for signal, all in one place.
export const HALFWAY_PCT = 0.5;
export const CONCENTRATION_TOP = 3;
export const CONCENTRATION_MIN_SHARE = 0.7;
/** Below this many spending teams, concentration is trivially true — noise. */
export const CONCENTRATION_MIN_TEAMS = 4;
export const ACCELERATION_MIN_PCT = 0.4;
export const UNATTRIBUTED_MIN_SHARE = 0.05;
/** The footer stays a footer: at most this many observations per sync. */
export const MAX_APONTAMENTOS = 4;

const copy = {
  halfwayOne: (team: string) => `${team} cruzou 50% do limite do período.`,
  halfwayMany: (teams: string) => `${teams} cruzaram 50% dos seus limites.`,
  acceleration: (team: string, pct: string) =>
    `${team} acelerou ${pct} em relação à semana anterior.`,
  concentration: (n: number, share: string) =>
    `${n} times concentram ${share} do gasto do período.`,
  unattributed: (amount: string) =>
    `${amount} sem atribuição a times — mapear projetos em Ajustes completa o quadro.`,
};

export type Apontamento = {
  /** Stable key for rendering (rule + target). */
  id: string;
  kind: "halfway" | "acceleration" | "concentration" | "unattributed";
  text: string;
};

export type ApontamentoInput = {
  currency: string;
  /** Budgeted teams: % of own budget spent + whether a WARNING already covers
   *  them (a warned team never re-appears here — same event, one channel). */
  budgetedTeams: { name: string; pctSpent: number; hasWarning: boolean }[];
  /** Per-team week-over-week API change (USD ratio); null = no prior week. */
  weekByTeam: { name: string; pct: number | null }[];
  /** Combined display-currency spend mix; null when the FX rate is missing —
   *  concentration and the unattributed nudge stay silent rather than mix
   *  currencies (invariant #3). */
  spendMix: TeamSpendMix | null;
};

/** pt-BR list: "A, B e C". */
function listNames(names: string[]): string {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

/**
 * All observations that hold right now, in fixed rule order, capped at
 * MAX_APONTAMENTOS. Stateless — recomputed each sync, no "resolved" state
 * (invariant #6).
 */
export function buildApontamentos(input: ApontamentoInput): Apontamento[] {
  const out: Apontamento[] = [];

  // 1. Crossed 50% of the limit — only teams NOT already carrying a warning
  //    (acceptance: warnings and apontamentos never duplicate the same event).
  const halfway = input.budgetedTeams
    .filter((t) => !t.hasWarning && t.pctSpent >= HALFWAY_PCT)
    .map((t) => t.name)
    .sort();
  if (halfway.length > 0) {
    out.push({
      id: "halfway",
      kind: "halfway",
      text:
        halfway.length === 1
          ? copy.halfwayOne(halfway[0])
          : copy.halfwayMany(listNames(halfway)),
    });
  }

  // 2. Week-over-week acceleration — a pace observation, distinct from any
  //    budget-threshold event, so it applies to every team. Neutral wording:
  //    spending more isn't inherently bad (product principle #5).
  const accelerating = input.weekByTeam
    .filter((t) => t.pct !== null && t.pct >= ACCELERATION_MIN_PCT)
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  for (const team of accelerating) {
    out.push({
      id: `acceleration:${team.name}`,
      kind: "acceleration",
      text: copy.acceleration(team.name, percent(team.pct as number)),
    });
  }

  if (input.spendMix !== null) {
    const { teamDrivers, unattributed } = input.spendMix;

    // 3. Concentration — top teams hold most of the spend. Only meaningful
    //    when there are enough spending teams for the share to be a signal.
    const top = topDrivers(teamDrivers, CONCENTRATION_TOP);
    const spendingTeams = teamDrivers.filter((d) => d.value > 0).length;
    const topShare = top.reduce((sum, d) => sum + d.share, 0);
    if (spendingTeams >= CONCENTRATION_MIN_TEAMS && topShare >= CONCENTRATION_MIN_SHARE) {
      out.push({
        id: "concentration",
        kind: "concentration",
        text: copy.concentration(top.length, percent(topShare)),
      });
    }

    // 4. Unattributed nudge — spend that maps to no team, once it matters.
    const teamTotal = teamDrivers.reduce((sum, d) => sum + d.value, 0);
    const orgTotal = teamTotal + unattributed;
    if (orgTotal > 0 && unattributed / orgTotal >= UNATTRIBUTED_MIN_SHARE) {
      out.push({
        id: "unattributed",
        kind: "unattributed",
        text: copy.unattributed(money(unattributed, input.currency)),
      });
    }
  }

  return out.slice(0, MAX_APONTAMENTOS);
}
