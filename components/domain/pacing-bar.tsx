import { cut, pacingSegments, TICKS_BOLD, type Span } from "@/lib/bars";
import { percent } from "@/lib/format";

// The pacing bar (frontend §3.4, de-noise 2026-07-17): ONE bar where the pair
// used to stack two. The segmented tick texture comes from lib/bars. Shared by
// the Home hero and the team executive summary (2026-10-07, founder-directed),
// so both read a budget against the month the same way.
//
// Three layers, all measured from zero (2026-10-07, founder-directed): gasto,
// projeção (the close at the current pace) and orçamento (the limit). The
// shorter layer sits in front, so the order adapts to the month: a close that
// fits the budget shows before the budget's tail; a close that passes it shows
// past the budget, in the overrun red. A realized overrun is the spend turning
// solid red. pacingSegments returns each layer's visible stretch, so the
// segments never overlap and always tile the track, and the legend lists them
// in the same order the bar paints them. The meta row above pairs `dia N de M`
// with the spent percentage, the two figures the bar exists to compare.

const copy = {
  periodDay: (day: number, days: number) => `dia ${day} de ${days}`,
  spent: "Gasto",
  overspent: "Gasto acima do orçamento",
  projected: "Projeção",
  budget: "Orçamento",
  // Spoken parts of the reading-order sentence (mobile legend + screen readers).
  read: {
    spent: "o gasto",
    overspent: "o gasto acima do orçamento, em vermelho forte",
    projectedFits: "a projeção até o fechamento",
    projectedOver: "a projeção até o fechamento, em vermelho, passando do orçamento",
    budgetFits: "o orçamento que deve sobrar",
    budgetLeft: "o restante do orçamento",
  },
  legend: (parts: string) => `Da esquerda para a direita: ${parts}.`,
  collecting:
    "O ritmo de fechamento ainda está sendo coletado; a projeção aparece a partir do quinto dia.",
  /** Always present for assistive tech — the visual legend is md-and-up. */
  description: (spent: string, day: number, days: number) =>
    `Barra de ritmo: ${spent} do orçamento gasto no dia ${day} de ${days}.`,
};

type Layer = {
  key: string;
  span: Span;
  /** Literal class strings, never interpolated: Tailwind only emits what it
   *  can scan in the source. */
  tone: string;
  swatch: string;
  label: string;
  read: string;
};

function joinReading(parts: string[]): string {
  return parts.length < 2
    ? parts.join("")
    : `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
}

export function PacingBar({
  pctSpent,
  pctProjected,
  dayOfPeriod,
  daysInPeriod,
}: {
  pctSpent: number;
  pctProjected: number | null;
  dayOfPeriod: number;
  daysInPeriod: number;
}) {
  const s = pacingSegments(pctSpent, pctProjected);
  const collecting = pctProjected === null;

  const spent: Layer = {
    key: "spent",
    span: s.spent,
    tone: "text-pace-spent",
    swatch: "bg-pace-spent",
    label: copy.spent,
    read: copy.read.spent,
  };
  const overspent: Layer | null = s.overspent && {
    key: "overspent",
    span: s.overspent,
    tone: "text-pace-overspent",
    swatch: "bg-pace-overspent",
    label: copy.overspent,
    read: copy.read.overspent,
  };
  const projected: Layer | null = s.projected && {
    key: "projected",
    span: s.projected,
    tone: s.projectionOver ? "text-pace-over" : "text-pace-projected",
    swatch: s.projectionOver ? "bg-pace-over" : "bg-pace-projected",
    label: copy.projected,
    read: s.projectionOver ? copy.read.projectedOver : copy.read.projectedFits,
  };
  const budget: Layer | null = s.budget && {
    key: "budget",
    span: s.budget,
    tone: "text-pace-budget",
    swatch: "bg-pace-budget",
    label: copy.budget,
    read: projected && !s.projectionOver ? copy.read.budgetFits : copy.read.budgetLeft,
  };

  // Reading order = paint order: the shorter of projection and budget first.
  const layers = [
    spent,
    overspent,
    ...(s.projectionOver ? [budget, projected] : [projected, budget]),
  ].filter((layer): layer is Layer => layer !== null);
  const reading = copy.legend(joinReading(layers.map((layer) => layer.read)));

  return (
    // data-reveal-state is stamped by the RevealController pre-hydration.
    <div data-reveal="pacing-bar" suppressHydrationWarning>
      <p className="sr-only">
        {copy.description(percent(pctSpent), dayOfPeriod, daysInPeriod)} {reading}
        {collecting && ` ${copy.collecting}`}
      </p>

      <div aria-hidden className="mb-1.5 flex items-baseline justify-between gap-3 text-xs tabular-nums">
        <span className="text-muted-foreground">
          {copy.periodDay(dayOfPeriod, daysInPeriod)}
        </span>
        <span className="font-medium text-foreground">{percent(pctSpent)}</span>
      </div>

      {/* Taller than the app's other bars (founder-directed): this is the
          hero's own bar and carries the month's headline. */}
      <div aria-hidden className="relative h-8 w-full">
        <div className="absolute inset-0 text-foreground/8" style={TICKS_BOLD} />
        {layers.map((layer, index) => (
          <Segment
            key={layer.key}
            span={layer.span}
            tone={layer.tone}
            delay={`${80 + index * 90}ms`}
          />
        ))}
      </div>

      <p aria-hidden className="mt-2 text-xs text-muted-foreground md:hidden">
        {reading}
        {collecting && ` ${copy.collecting}`}
      </p>
      <div
        aria-hidden
        className="mt-2 hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:flex"
      >
        {layers.map((layer) => (
          <LegendItem key={layer.key} swatch={`${SWATCH} ${layer.swatch}`} label={layer.label} />
        ))}
        {collecting && <span>{copy.collecting}</span>}
      </div>
    </div>
  );
}

/** One colored stretch of the tick track: the shared full-width grid, cut to
 *  its span so tick columns align across segments. */
function Segment({ span, tone, delay }: { span: Span; tone: string; delay: string }) {
  return (
    <div
      data-reveal-bar
      className={`absolute inset-0 ${tone}`}
      style={{ ...TICKS_BOLD, clipPath: cut(span.from, span.to), animationDelay: delay }}
    />
  );
}

/** Shared swatch geometry. Each caller passes the FULL class list rather than
 *  composing widths, so no two width utilities can collide. */
const SWATCH = "h-2.5 w-2 shrink-0 rounded-xs";

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={swatch} />
      {label}
    </span>
  );
}
