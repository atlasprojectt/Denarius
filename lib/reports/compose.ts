// Denarius — the executive report composer (pure, no I/O). Issue #97.
//
// WHY THIS EXISTS. The printed report used to be the screen in light mode: the
// same sections, in the same order, at the same weight, every time. A CEO
// opening it still had to read the whole thing to find the conclusion. This
// function turns a `PeriodSnapshot` into a DOCUMENT: it states the conclusion
// first, ranks what follows by how much money it moves, collapses what carries
// no signal, and pushes method and caveats to an annex.
//
// WHAT IT DOES NOT DO. It never computes a number and it never calls an LLM
// (invariant #2). Every figure it emits is a value the engine already produced,
// formatted through `money()` / `percent()`; every sentence is assembled from
// those same values by the rules below. It writes prose the way
// `computeVerdict` and `digestTemplate` already do — deterministically, from
// injected facts.
//
// WHAT IT DELIBERATELY LEAVES ALONE: the SPINE. Sections keep a fixed order and
// fixed numbering (§1..§6) because a financial report is only useful if August
// and September are comparable — a reader must find "Composição do gasto" in
// the same place every month. The algorithm decides EMPHASIS, not order.
//
// Section titles live in the screen's copy.ts (F2); this module returns ids,
// pre-formatted values, and the sentences it is responsible for authoring.

import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import type { PeriodSnapshot, SnapshotTeam } from "@/lib/snapshot/build";
import type { ControlAction } from "@/lib/findings/catalog";
import { severityRank, type ThresholdLevel } from "@/lib/engine/thresholds";

/** "closed" documents a frozen month; "live" describes the running one. */
export type ReportVariant = "closed" | "live";

export type ReportSectionId =
  | "summary"
  | "position"
  | "composition"
  | "teams"
  | "attention"
  | "annex";

/**
 * `collapsed` means the section has nothing to say and should render as a
 * single affirmative line rather than an empty card — a blank section reads as
 * a bug, and the all-clear state is affirmative by product rule.
 */
export type SectionEmphasis = "headline" | "normal" | "collapsed";

/** A number-chave in the executive summary. Value is already formatted. */
export type KeyFigure = {
  id: "spent" | "budget" | "projection" | "projectedMargin";
  value: string;
  /** Neutral qualifier under the number ("coletando ritmo", "sem orçamento"). */
  note?: string;
};

/**
 * One ranked statement. `weight` is the materiality score that ordered it —
 * exported so tests can assert the ranking rather than the wording.
 */
export type Highlight = {
  id: string;
  kind: "breach" | "projected" | "concentration" | "composition" | "quality";
  text: string;
  weight: number;
  /**
   * Whether the statement points at a DECISION, and so belongs in §5.
   *
   * Not every true statement needs attention. "57% do gasto vem de assentos"
   * characterizes the period and earns a place in the summary; it is not
   * something to act on. A reconciliation gap or an unpriced model qualifies
   * the numbers and belongs to the annex with the other caveats. Putting all
   * of them under "Pontos de atenção" would make the section mean nothing —
   * which is exactly what it must not mean.
   */
  attention: boolean;
};

export type ReportAction = ControlAction & {
  /** Which finding earned this action — the CEO sees why it is being suggested. */
  context: string;
};

/** One line of "onde o dinheiro foi". These rows SUM to the period total. */
export type CompositionRow = {
  id: string;
  label: string;
  /** Display currency, formatted; null-safe ("Indisponível") resolved by the UI. */
  amount: number | null;
  share: number | null;
  /** USD original for API lines — the source of truth, disclosed beside it. */
  usd?: number;
};

export type ReportTeamRow = SnapshotTeam & {
  /** spend ÷ period total (0..1); null when either side is unknown. */
  share: number | null;
};

export type ReportCaveat = {
  id: "uncosted" | "reconciliation" | "fx" | "sync";
  /** Whether the caveat is a live concern or a clean bill of health. */
  flagged: boolean;
};

export type ExecutiveReport = {
  summary: {
    /** The verdict — the conclusion, stated before the evidence. */
    lead: string | null;
    figures: KeyFigure[];
    highlights: Highlight[];
  };
  /** Every statement the period earned, ranked. `summary.highlights` is its
   *  head and `attention.observations` its actionable subset — one ranking, so
   *  the two sections can never disagree about what mattered most. */
  statements: Highlight[];
  emphasis: Record<ReportSectionId, SectionEmphasis>;
  composition: CompositionRow[];
  /** True when the rows reconcile against `combinedAmount` (invariant #3). */
  compositionBalances: boolean;
  teams: ReportTeamRow[];
  /** §4's closing row: what the team cut could not place. Σ teams + this = the
   *  org total (invariant #3), which is why it is never omitted, even at zero. */
  unattributed: { amount: number | null; share: number | null; apiUsd: number };
  attention: {
    /** The ranked statements that point at a decision (`attention: true`). */
    observations: Highlight[];
    /** Curated, deduplicated actions. EMPTY for a closed month by design. */
    actions: ReportAction[];
  };
  annex: { caveats: ReportCaveat[] };
};

/** Concentration is worth stating once the top few carry most of the money. */
const CONCENTRATION_THRESHOLD = 0.7;
/** Below this many teams, "the top 3 carry 70%" is arithmetic, not a finding. */
const CONCENTRATION_MIN_TEAMS = 4;
/** How many highlights the executive summary carries before the rest drop to §5. */
const SUMMARY_HIGHLIGHTS = 3;

// Materiality weights. A realized breach outranks a projected one (the same
// deviation from PRD P11's literal ladder the verdict already makes, and for
// the same reason: money already spent beats money forecast). Data quality
// ranks last — it qualifies the numbers, it is not itself a number.
const WEIGHT: Record<Highlight["kind"], number> = {
  breach: 400,
  projected: 300,
  concentration: 200,
  composition: 150,
  quality: 100,
};

function levelKind(level: ThresholdLevel): Highlight["kind"] {
  return level === "breach" ? "breach" : "projected";
}

/**
 * Ranks by materiality: kind first, then — within a kind — by how much money
 * the statement is about, so a R$ 4.000 overrun leads a R$ 200 one. Ties break
 * on id so the document is byte-stable across renders.
 */
function rank(highlights: Highlight[]): Highlight[] {
  return highlights
    .slice()
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
}

function pctOf(part: number | null, whole: number | null): number | null {
  if (part === null || whole === null || whole <= 0) return null;
  return part / whole;
}

/** The statements the period earns, each already phrased and weighted. */
function buildHighlights(snapshot: PeriodSnapshot): Highlight[] {
  const { currency } = snapshot;
  const out: Highlight[] = [];

  // 1. Budget crossings — the findings the engine already ordered by impact.
  //    `overrun` rides into the weight so size, not just severity, decides.
  for (const finding of snapshot.breakdown.findings) {
    const kind = levelKind(finding.level);
    const scope =
      finding.scope === "org" ? "A empresa" : `O time ${finding.targetName}`;
    const text =
      finding.level === "breach"
        ? `${scope} ultrapassou o orçamento de ${money(finding.numbers.budget, currency)} — ${money(finding.numbers.spent, currency)} gastos, ${percent(finding.numbers.pctSpent)} do previsto.`
        : finding.level === "projected_breach" && finding.numbers.projection !== null
          ? `${scope} está projetada para fechar em ${money(finding.numbers.projection, currency)}, ${money(finding.overrun, currency)} acima do orçamento.`
          : `${scope} já consumiu ${percent(finding.numbers.pctSpent)} do orçamento neste ponto do período.`;
    out.push({
      id: `finding:${finding.scope}:${finding.targetId ?? "org"}`,
      kind,
      text,
      // Severity dominates; overrun only orders findings of the same severity,
      // so it is scaled to stay inside one severity band.
      weight: WEIGHT[kind] + severityRank(finding.level),
      attention: true,
    });
  }

  // 2. Concentration — "who consumes what" is the first question an executive
  //    asks, and it is only a finding when the company is big enough to spread.
  const drivers = snapshot.breakdown.topDrivers;
  const topShare = drivers.reduce((sum, d) => sum + d.share, 0);
  if (
    drivers.length > 0 &&
    snapshot.breakdown.teams.length >= CONCENTRATION_MIN_TEAMS &&
    topShare >= CONCENTRATION_THRESHOLD
  ) {
    out.push({
      id: "concentration",
      kind: "concentration",
      text: `${drivers.map((d) => d.label).join(", ")} concentram ${percent(topShare)} do gasto do período.`,
      weight: WEIGHT.concentration,
      // Concentration points somewhere: it names where one conversation has
      // the most effect on the total.
      attention: true,
    });
  }

  // 3. Composition — seats vs API is the structural fact behind the total, and
  //    it is what tells a CEO whether the lever is contracts or usage.
  const seats = snapshot.breakdown.seats.total;
  const seatShare = pctOf(seats, snapshot.combinedAmount);
  if (seats !== null && seatShare !== null && snapshot.combinedAmount !== null) {
    const apiShare = 1 - seatShare;
    const dominant = seatShare >= apiShare ? "assentos" : "uso de API";
    out.push({
      id: "composition",
      kind: "composition",
      text: `${percent(Math.max(seatShare, apiShare))} do gasto vem de ${dominant}: ${money(seats, currency)} em assentos e ${money(snapshot.combinedAmount - seats, currency)} em API.`,
      weight: WEIGHT.composition,
      // Characterization, not a call to act — it says what the period is made
      // of, which is context for the summary and nothing to fix.
      attention: false,
    });
  }

  // 4. Data quality — stated as an observation, never as an alarm (principle
  //    #6), but never omitted either: a number without its caveat is a claim
  //    the period cannot support (principle #3).
  const unattributedShare = pctOf(
    snapshot.breakdown.unattributed.display,
    snapshot.combinedAmount,
  );
  if (unattributedShare !== null && unattributedShare > 0) {
    out.push({
      id: "unattributed",
      kind: "quality",
      text: `${percent(unattributedShare)} do gasto (${money(snapshot.breakdown.unattributed.display as number, currency)}) ainda não está atribuído a um time.`,
      weight: WEIGHT.quality + 2,
      // The one data-quality item with a decision behind it: mapping the
      // projects is something the Admin can go and do.
      attention: true,
    });
  }
  if (!snapshot.reconciliationOk) {
    const r = snapshot.breakdown.reconciliation;
    out.push({
      id: "reconciliation",
      kind: "quality",
      text: `O custo derivado dos tokens e o custo reportado pelos provedores diferem em ${money(Math.abs(r.driftUsd), "USD")} no período.`,
      weight: WEIGHT.quality + 1,
      // Qualifies the numbers; the annex is where it is answered.
      attention: false,
    });
  }
  if (snapshot.hasUncosted) {
    out.push({
      id: "uncosted",
      kind: "quality",
      text: "Há uso de modelos sem preço conhecido, que ficou fora do custo derivado — o total pode estar subestimado.",
      weight: WEIGHT.quality,
      attention: false,
    });
  }

  return rank(out);
}

/** §1's four numbers, in the order an executive reads them. */
function buildFigures(snapshot: PeriodSnapshot): KeyFigure[] {
  const { currency, combinedAmount, budgetAmount, projection } = snapshot;
  const unavailable = "—";
  const figures: KeyFigure[] = [
    {
      id: "spent",
      value: combinedAmount === null ? unavailable : money(combinedAmount, currency),
    },
    {
      id: "budget",
      value: budgetAmount === null ? unavailable : money(budgetAmount, currency),
    },
  ];

  // A closed month has nothing left to project — its realized total IS where it
  // landed — so the projection pair only appears while the period is running.
  if (budgetAmount !== null) {
    figures.push({
      id: "projection",
      value: projection === null ? unavailable : money(projection, currency),
      note: projection === null ? "collecting" : undefined,
    });
    figures.push({
      id: "projectedMargin",
      value:
        projection === null ? unavailable : money(budgetAmount - projection, currency),
      note: projection === null ? "collecting" : undefined,
    });
  }

  return figures;
}

/**
 * §3 — one table that closes, BY SOURCE. Providers (converted at the frozen
 * rate) + seats add up to the period total; showing them in two separate
 * sections, as the first version did, left the reader to wonder whether they
 * summed at all.
 *
 * Unattributed is deliberately NOT a row here: it is not a third source of
 * spend, it is the part of this same money that the team cut could not place.
 * Adding it would double-count. It belongs to §4, where the team totals plus
 * Unattributed reconcile to the org total (invariant #3). A `null` amount keeps
 * its row rather than being dropped — spend never silently disappears.
 */
function buildComposition(snapshot: PeriodSnapshot): CompositionRow[] {
  const rows: CompositionRow[] = snapshot.breakdown.providers.map((p) => ({
    id: `provider:${p.provider}`,
    label: p.provider,
    amount: p.display,
    share: pctOf(p.display, snapshot.combinedAmount),
    usd: p.usd,
  }));

  const seats = snapshot.breakdown.seats;
  rows.push({
    id: "seats",
    label: "seats",
    amount: seats.total,
    share: pctOf(seats.total, snapshot.combinedAmount),
  });

  return rows;
}

/**
 * The rows reconcile when what §3 lists adds up to what §2 states. Rendering a
 * table that silently misses money would be worse than rendering none.
 */
function balances(rows: CompositionRow[], total: number | null): boolean {
  if (total === null) return false;
  const sum = rows.reduce((acc, r) => acc + (r.amount ?? 0), 0);
  if (rows.some((r) => r.amount === null)) return false;
  // Currency rounding only; anything larger is a real gap, not float noise.
  return Math.abs(sum - total) < 0.01;
}

/**
 * §4 — severity first, then size. "Who is in trouble" precedes "who is big",
 * and an unbudgeted team (no status to judge) sorts by spend alone, below
 * everyone the budget has something to say about.
 *
 * A team with no budget AND no spend is dropped: it says nothing, and a row of
 * zeros in an executive table is noise, not disclosure. Nothing is hidden by
 * it — a zero contributes zero, so the column still sums to the org total. A
 * BUDGETED team at zero spend keeps its row: the budget is itself a governance
 * fact worth reporting against.
 */
function orderTeams(
  teams: SnapshotTeam[],
  total: number | null,
): ReportTeamRow[] {
  const severity = (team: SnapshotTeam): number => {
    if (team.status === "red") return 3;
    if (team.status === "amber") return 2;
    if (team.status === "green") return 1;
    return 0;
  };
  return teams
    .filter((team) => team.budget !== null || (team.spend ?? 0) > 0)
    .map((team) => ({ ...team, share: pctOf(team.spend, total) }))
    .sort(
      (a, b) =>
        severity(b) - severity(a) ||
        (b.spend ?? 0) - (a.spend ?? 0) ||
        a.teamName.localeCompare(b.teamName, "pt-BR"),
    );
}

/**
 * The curated control plan, flattened and deduplicated across findings, most
 * severe finding first. Advisory only (product principle #2) — every action is
 * something the CEO does, in Denarius or in the provider's own console.
 */
function buildActions(snapshot: PeriodSnapshot): ReportAction[] {
  const seen = new Set<string>();
  const actions: ReportAction[] = [];
  for (const finding of snapshot.breakdown.findings) {
    for (const action of finding.controlPlan) {
      if (seen.has(action.id)) continue;
      seen.add(action.id);
      actions.push({ ...action, context: finding.targetName });
    }
  }
  return actions;
}

/**
 * Composes the document. Pure: the same snapshot always produces the same
 * report, which is what makes the printed artifact reproducible.
 */
export function composeReport(
  snapshot: PeriodSnapshot,
  variant: ReportVariant,
): ExecutiveReport {
  const highlights = buildHighlights(snapshot);
  // §5 lists only what points at a decision. The rest still earns the summary
  // (it characterizes the period) or the annex (it qualifies the numbers) —
  // a "Pontos de atenção" that always has entries is a section nobody reads.
  const observations = highlights.filter((h) => h.attention);
  const composition = buildComposition(snapshot);
  const teams = orderTeams(snapshot.breakdown.teams, snapshot.combinedAmount);

  // A closed month is documentation, not advice: it already happened, so there
  // is nothing left to do about it. Its crossings still appear in §5 — as
  // observations. (Founder decision, 2026-08-08.)
  const actions = variant === "live" ? buildActions(snapshot) : [];

  const providerCount = snapshot.breakdown.providers.length;
  const hasSeats = (snapshot.breakdown.seats.total ?? 0) > 0;
  const budgetedTeamCount = teams.filter((t) => t.budget !== null).length;
  const spendingTeamCount = teams.filter((t) => (t.spend ?? 0) > 0).length;

  return {
    summary: {
      lead: snapshot.verdictSentence,
      figures: buildFigures(snapshot),
      highlights: highlights.slice(0, SUMMARY_HIGHLIGHTS),
    },
    statements: highlights,
    emphasis: {
      // The conclusion and the money are the document; they never step down.
      summary: "headline",
      position: "headline",
      // Nothing to compose with a single source of spend.
      composition:
        providerCount + (hasSeats ? 1 : 0) > 1 ? "normal" : "collapsed",
      // A comparison needs at least two things to compare, or one budget to
      // compare against.
      teams:
        budgetedTeamCount > 0 || spendingTeamCount > 1 ? "normal" : "collapsed",
      // Collapsed renders the affirmative all-clear, never an empty card.
      attention:
        observations.length > 0 || actions.length > 0 ? "normal" : "collapsed",
      // Method and caveats travel with the numbers, always (principle #3).
      annex: "normal",
    },
    composition,
    compositionBalances: balances(composition, snapshot.combinedAmount),
    teams,
    unattributed: {
      amount: snapshot.breakdown.unattributed.display,
      share: pctOf(snapshot.breakdown.unattributed.display, snapshot.combinedAmount),
      apiUsd: snapshot.breakdown.unattributed.apiUsd,
    },
    attention: { observations, actions },
    annex: {
      caveats: [
        { id: "uncosted", flagged: snapshot.hasUncosted },
        { id: "reconciliation", flagged: !snapshot.reconciliationOk },
        { id: "fx", flagged: snapshot.fxMissing },
        { id: "sync", flagged: snapshot.staleSync },
      ],
    },
  };
}
