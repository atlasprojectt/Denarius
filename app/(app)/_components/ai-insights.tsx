import { RiPieChartLine } from "@remixicon/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Observation } from "@/lib/home/queries";
import { homeCopy } from "./copy";

// "Análise da IA" (2026-08-02, founder-directed): the apontamentos moved out of
// the dashed footer they used to sit in and became a first-class card in the
// cockpit grid. Same content, same rules — what changed is that a reading of the
// period now competes for attention instead of trailing the page.
//
// Two things are deliberate and should survive future edits:
//
// 1. NO SEMAPHORE. Green/amber/red belong to budget status (principle #5).
//    These lines observe; they never judge. The card carries no status colour,
//    no badge, no border tint.
//
// 2. EMPHASIS MEANS PROVENANCE, NOT DESIGN. A run stands out only when
//    `Segment.strong` is set, which the apontamento rules set only on figures
//    the engine computed and injected (invariant #2). So what a CEO's eye lands
//    on is exactly what is auditable. Never emphasise a word for rhythm.
//    The emphasis is carried by INK (full-strength foreground against muted
//    body), not by weight — founder-directed 2026-08-02, after the bold read
//    too heavy at this type size.
//
// The name is honest about the layer, not (yet) about the mechanism: the PRD's
// Insight layer is hybrid — deterministic rules detect, a cheap LLM narrates —
// and only the first half is wired. `lib/narrate/` already holds the second.

const c = homeCopy.aiInsights;

export function AiInsights({ items }: { items: Observation[] }) {
  // Natural height, never stretched: a few sentences cannot fill a tall box,
  // they can only sit above a void. The card rides in a stack where the
  // composition card takes the leftover instead.
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RiPieChartLine className="size-4 text-muted-foreground" aria-hidden />
          {c.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          // Never a hole in the grid: an empty period is a statement, not a
          // blank cell (§11 required states).
          <p className="text-2xl/snug text-muted-foreground/70">{c.empty}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <li key={item.id} className="text-2xl/snug text-muted-foreground">
                {item.segments
                  ? item.segments.map((segment, index) =>
                      segment.strong ? (
                        <strong
                          key={index}
                          // font-normal on purpose: <strong> still carries the
                          // semantic weight for assistive tech (this run is the
                          // auditable figure), but the browser's bold default is
                          // overridden — the distinction is ink, not weight.
                          className="font-normal text-foreground tabular-nums"
                        >
                          {segment.text}
                        </strong>
                      ) : (
                        <span key={index}>{segment.text}</span>
                      ),
                    )
                  : item.text}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
