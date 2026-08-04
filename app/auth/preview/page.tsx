// PREVIEW-ONLY route — not part of the product. It exists because the real
// tenant is on day 1 of the period, so every live chart is a single point.
// Here the pure engine is fed a synthetic mid-month series (day 18 of 31) so
// the charts and their hover focus can actually be reviewed. Public because it
// sits under /auth (see proxy.ts PUBLIC_PREFIXES). Delete this folder when the
// visual review is done.

import { MonthlyPaceChart } from "@/app/(app)/_components/monthly-pace-chart";
import { PacingBar } from "@/app/(app)/_components/pacing-bar";
import { ProviderComposition } from "@/app/(app)/_components/provider-composition";
import { CumulativeChart } from "@/app/(app)/times/_components/cumulative-chart";
import { buildMonthlyPace } from "@/lib/engine/monthly-pace";
import { ThemeSwitch } from "./theme-switch";

const DAYS_IN_PERIOD = 31;
const DAY_OF_PERIOD = 18;

/** Deterministic, uneven daily API spend — a flat ramp would hide the fact that
 *  the cumulative curve has a shape at all. */
function dailyUsd(day: number): number {
  const base = 620 + Math.sin(day * 1.1) * 180 + Math.cos(day * 0.4) * 120;
  const weekendDip = day % 7 === 0 || day % 7 === 6 ? 0.45 : 1;
  const spike = day === 9 ? 2.4 : day === 14 ? 1.7 : 1;
  return Math.round(base * weekendDip * spike);
}

export default function PreviewPage() {
  const apiByDay = Array.from({ length: DAY_OF_PERIOD }, (_, i) => ({
    date: `2026-08-${String(i + 1).padStart(2, "0")}`,
    usd: dailyUsd(i + 1),
  }));

  const pace = buildMonthlyPace({
    apiByDay,
    fxRate: 5.4,
    seatAccrued: 21000,
    budget: 100000,
    projection: 118400,
    dayOfPeriod: DAY_OF_PERIOD,
    daysInPeriod: DAYS_IN_PERIOD,
  });

  const entries = [
    { key: "openai", label: "OpenAI", amount: 38200, share: 0.52 },
    { key: "anthropic", label: "Anthropic", amount: 21400, share: 0.29 },
    { key: "seats", label: "Assentos", amount: 9800, share: 0.13 },
    { key: "outros", label: "Outros", amount: 4400, share: 0.06 },
  ];

  const teamPoints = Array.from({ length: DAY_OF_PERIOD }, (_, i) => {
    let spent = 0;
    for (let d = 1; d <= i + 1; d++) spent += dailyUsd(d) * 2.1;
    return { day: i + 1, spent: Math.round(spent) };
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Preview dos gráficos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dados sintéticos (dia {DAY_OF_PERIOD} de {DAYS_IN_PERIOD}) — passe o
            mouse sobre o gráfico e sobre as linhas do &ldquo;Gasto por
            fonte&rdquo;.
          </p>
        </div>
        <ThemeSwitch />
      </header>

      {/* The hero's bar, which uses the BOLD tick variant — the only place it
          appears, and otherwise unreachable without logging in. Both states:
          the breached one is the only way to see the red path without forcing
          a tenant over its budget. */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border p-6">
          <h2 className="mb-1 font-heading text-sm font-medium">
            Gasto do mês · sob controle
          </h2>
          <p className="mb-4 text-4xl font-medium tracking-tight tabular-nums">
            R$ 42.100,00
          </p>
          {/* The only case where the neutral track is visible: the projection
              lands under budget, so there is room left unclaimed. */}
          <PacingBar
            pctSpent={0.42}
            pctProjected={0.86}
            pctElapsed={DAY_OF_PERIOD / DAYS_IN_PERIOD}
            dayOfPeriod={DAY_OF_PERIOD}
            daysInPeriod={DAYS_IN_PERIOD}
          />
        </section>
        <section className="rounded-xl border p-6">
          <h2 className="mb-1 font-heading text-sm font-medium">Gasto do mês</h2>
          <p className="mb-4 text-4xl font-medium tracking-tight tabular-nums">
            R$ 79.082,40
          </p>
          <PacingBar
            pctSpent={0.79}
            pctProjected={1.18}
            pctElapsed={DAY_OF_PERIOD / DAYS_IN_PERIOD}
            dayOfPeriod={DAY_OF_PERIOD}
            daysInPeriod={DAYS_IN_PERIOD}
          />
        </section>
        <section className="rounded-xl border p-6">
          <h2 className="mb-1 font-heading text-sm font-medium">
            Gasto do mês · estourado
          </h2>
          <p className="mb-4 text-4xl font-medium tracking-tight tabular-nums">
            R$ 112.400,00
          </p>
          <PacingBar
            pctSpent={1.12}
            pctProjected={1.34}
            pctElapsed={DAY_OF_PERIOD / DAYS_IN_PERIOD}
            dayOfPeriod={DAY_OF_PERIOD}
            daysInPeriod={DAYS_IN_PERIOD}
          />
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="h-[460px] rounded-xl border px-4">
          <MonthlyPaceChart pace={pace} currency="BRL" monthLabel="agosto" />
        </div>
        <ProviderComposition
          entries={entries}
          currency="BRL"
          unattributed={null}
        />
      </div>

      <section className="rounded-xl border p-6">
        <h2 className="mb-4 font-heading text-sm font-medium">
          Drill-down de time · gasto acumulado
        </h2>
        <CumulativeChart
          points={teamPoints}
          projection={44000}
          budget={38000}
          currency="BRL"
          daysInPeriod={DAYS_IN_PERIOD}
          emptyLabel="Sem gasto no período."
        />
      </section>
    </main>
  );
}
