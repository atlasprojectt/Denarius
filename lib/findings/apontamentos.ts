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

/**
 * One run of the sentence. `strong` marks a figure the ENGINE computed and this
 * module injected — never a word chosen for emphasis. The UI renders those runs
 * bold, which makes the styling carry provenance: what is bold is exactly what
 * is auditable (invariant #2). Keep that rule when adding copy.
 */
export type Segment = { text: string; strong?: boolean };

/** Plain run. */
const plain = (text: string): Segment => ({ text });
/** Engine-computed figure. */
const figure = (text: string): Segment => ({ text, strong: true });

const copy = {
  halfwayOne: (team: string): Segment[] => [
    plain(`${team} cruzou `),
    figure("50%"),
    plain(" do limite do período."),
  ],
  halfwayMany: (teams: string): Segment[] => [
    plain(`${teams} cruzaram `),
    figure("50%"),
    plain(" dos seus limites."),
  ],
  accelerationOne: (team: string, pct: string): Segment[] => [
    plain(`${team} acelerou `),
    figure(pct),
    plain(" em relação à semana anterior."),
  ],
  // The many-team case interleaves names and percentages, so it is assembled by
  // the caller rather than from a fixed shape.
  accelerationMany: (parts: Segment[]): Segment[] => [
    ...parts,
    plain(" aceleraram em relação à semana anterior."),
  ],
  concentration: (count: number, share: string): Segment[] => [
    figure(`${count} times`),
    plain(" concentram "),
    figure(share),
    plain(" do gasto do período."),
  ],
  unattributed: (amount: string): Segment[] => [
    figure(amount),
    plain(
      " sem atribuição a times — mapear projetos em Ajustes completa o quadro.",
    ),
  ],
};

export type Apontamento = {
  /** Stable key for rendering (rule + target). */
  id: string;
  kind: "halfway" | "acceleration" | "concentration" | "unattributed";
  segments: Segment[];
  /** Derived from `segments` — the flat sentence, for consumers that want a
   *  plain string (the "Próximas ações" list, tests, any future email). */
  text: string;
};

/** The one place segments become a sentence, so the two can never disagree. */
function flatten(segments: Segment[]): string {
  return segments.map((segment) => segment.text).join("");
}

function apontamento(
  id: string,
  kind: Apontamento["kind"],
  segments: Segment[],
): Apontamento {
  return { id, kind, segments, text: flatten(segments) };
}

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
    out.push(
      apontamento(
        "halfway",
        "halfway",
        halfway.length === 1
          ? copy.halfwayOne(halfway[0])
          : copy.halfwayMany(listNames(halfway)),
      ),
    );
  }

  // 2. Week-over-week acceleration — a pace observation, distinct from any
  //    budget-threshold event, so it applies to every team. Neutral wording:
  //    spending more isn't inherently bad (product principle #5). ONE line no
  //    matter how many teams accelerate, so this rule can never crowd the
  //    other kinds out of the MAX_APONTAMENTOS cap.
  const accelerating = input.weekByTeam
    .filter((t) => t.pct !== null && t.pct >= ACCELERATION_MIN_PCT)
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  if (accelerating.length === 1) {
    out.push(
      apontamento(
        "acceleration",
        "acceleration",
        copy.accelerationOne(
          accelerating[0].name,
          percent(accelerating[0].pct as number),
        ),
      ),
    );
  } else if (accelerating.length > 1) {
    // Same "A, B e C" joining as listNames(), but emitted as segments so each
    // percentage stays a marked figure instead of melting into one string.
    const parts: Segment[] = [];
    accelerating.forEach((team, index) => {
      if (index > 0) {
        parts.push(plain(index === accelerating.length - 1 ? " e " : ", "));
      }
      parts.push(plain(`${team.name} (+`));
      parts.push(figure(percent(team.pct as number)));
      parts.push(plain(")"));
    });
    out.push(
      apontamento("acceleration", "acceleration", copy.accelerationMany(parts)),
    );
  }

  if (input.spendMix !== null) {
    const { teamDrivers, unattributed } = input.spendMix;

    // 3. Concentration — top teams hold most of the spend. Only meaningful
    //    when there are enough spending teams for the share to be a signal.
    const top = topDrivers(teamDrivers, CONCENTRATION_TOP);
    const spendingTeams = teamDrivers.filter((d) => d.value > 0).length;
    const topShare = top.reduce((sum, d) => sum + d.share, 0);
    if (spendingTeams >= CONCENTRATION_MIN_TEAMS && topShare >= CONCENTRATION_MIN_SHARE) {
      out.push(
        apontamento(
          "concentration",
          "concentration",
          copy.concentration(top.length, percent(topShare)),
        ),
      );
    }

    // 4. Unattributed nudge — spend that maps to no team, once it matters.
    const teamTotal = teamDrivers.reduce((sum, d) => sum + d.value, 0);
    const orgTotal = teamTotal + unattributed;
    if (orgTotal > 0 && unattributed / orgTotal >= UNATTRIBUTED_MIN_SHARE) {
      out.push(
        apontamento(
          "unattributed",
          "unattributed",
          copy.unattributed(money(unattributed, input.currency)),
        ),
      );
    }
  }

  return out.slice(0, MAX_APONTAMENTOS);
}
