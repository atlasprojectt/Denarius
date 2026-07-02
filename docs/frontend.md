# Denarius — Frontend & UI spec

> Derives from [prd.md](prd.md) (UX Decisions P1–P15). The static prototype in [`prototype/`](../prototype/) is the **visual contract** — when this doc and the prototype disagree, flag it, don't guess.
> **Status:** UX decisions (P1–P15) and implementation decisions (F1–F6, §7) all locked.

## 1. Principles

- One question drives everything: **"am I in control of AI spend?"** answered in ≤10s.
- **Verdict-first**: the screen states the conclusion (one deterministic sentence + color); details justify it below.
- Money headlines; tokens are drill-down. Semaphore colors (green/amber/red) are **reserved for budget status** — deltas and everything else stay neutral.
- Honesty in the chrome: "as of <date>" stamps, stale banners, "uncosted", disclosed FX. Never a number the system can't defend.
- Control, not surveillance: per-person data only in context ("contributors to this spike"), names Admin-only.

## 2. Navigation (3 destinations)

| Screen | Job |
|---|---|
| **Início (Home)** | The cockpit. Verdict → hero (spend vs budget + pacing pair + projected-margin callout) → "Precisa de atenção" (at-risk teams, rich rows) → "Sob controle (N)" collapsed → Observações (apontamentos) → provider composition |
| **Explorar** | Investigation. Root: by-team table (incl. **Não atribuído**) + by-model; drill → team detail (pace chart, contributors) with breadcrumb |
| **Ajustes** | Connections (OpenAI/Anthropic/Copilot-soon), roster CSV, manual seats, users/roles, privacy toggles, currency |

Budget editing is **inline** (pencil on rows / hero) → modal. The **simulator is a right-side drawer** opened in context ([Simular] on warnings/teams) — never a nav destination.

## 3. Home component contracts (matching prototype)

1. **Onboarding checklist** (dismissible, 4 steps, budget step pushed) — only until complete.
2. **Stale-data banner** — only when a connector hasn't synced >1 day.
3. **Verdict line** — always present; green/amber/red; sentence + meta (days left, projection).
4. **Hero**: org spend big number; paired bars **Gasto % × Mês (dia N de M)** with aligned budget marker; ghost extension = projection; callout = projected margin.
5. **Precisa de atenção (N)**: teams with `status ≠ green`, ordered by projected risk; each row = name + status pill + values, bar with ghost + marker, warning line, actions **[Investigar] [Simular] [✎]**.
6. **Sob controle (N) ✓**: collapsed list, expandable; compact bars.
7. **Observações**: calm feed (no red, no urgency), includes unattributed nudge.
8. **Para onde vai o dinheiro**: ranked provider bar list (no donut) + "tokens no drill-down".

**States that must exist:** cold-start (no data/budget → CTA hero, never empty), collecting-pace (before day 5), **all-clear** ("✓ Tudo sob controle · próximo digest sexta"), stale-data, breached.

## 4. Design tokens (from prototype `styles.css`)

| Token | Value |
|---|---|
| Brand | `#4f46e5` (indigo) · soft `#eef2ff` |
| Semaphore | green `#16a34a` · amber `#d97706` · red `#dc2626` (+ soft bgs) |
| Ink / muted / faint | `#0b1220` / `#64748b` / `#94a3b8` |
| Surfaces | page `#f7f8fa` · card `#fff` · sidebar `#0c1322` |
| Radii | card 14px · controls 9px |
| Type | system sans stack; numbers **tabular-nums**; two weights (400/650-740) |
| Shadows | subtle (`0 1px 2px…`); drawer/modal stronger |

Light mode only (P9). Desktop-first; consumption screens legible at mobile width (email click-through target). Copy: pt-BR, sentence case, observation language for apontamentos, alarm language reserved for warnings.

## 5. Interaction patterns

- **Drawer** (right, 420px): simulator — pre-loaded team, presets (ritmo atual / fechar no orçamento / −30%), slider, instant recompute. Scrim click closes.
- **Modal**: budget create/edit (scope, amount, thresholds) — prefilled when opened from a row.
- **Collapse**: "Sob controle" group; warning rows expand to show drivers + control plan (read-only).
- **Drill**: any team (bar, row, [Investigar]) → Explore team detail; breadcrumb back. Person data only inside a drill, framed as "contribuintes deste pico".

## 6. Charts

- Team/budget bars: HTML/CSS (fill + dashed ghost + marker) — as in prototype.
- Cumulative line (spend vs budget + dashed projection): lives only in drill-down, not Home.

## 7. Implementation decisions (F1–F6 — locked)

| # | Question | Status |
|---|---|---|
| F1 | Rendering/data strategy | **LOCKED — RSC-first + server actions.** Pages are Server Components reading Postgres directly; mutations are server actions; no internal REST layer, no React Query, no global state. `"use client"` only for real interactivity (drawer, modal, collapse, slider). Rationale: data changes 1×/day (daily sync); engine is server-side and deterministic; fewer moving parts = easier due-diligence audit. |
| F2 | UI copy language strategy | **LOCKED — pt-BR hardcoded, no i18n framework, but isolated.** UI strings live in copy constants at the top of the component file (or a per-screen `copy.ts`), never inline in JSX. Keeps today's cost ~zero while making a future EN build (for an acquirer demo) or i18n extraction a mechanical job. Don't build i18n infra for a customer who doesn't exist yet. |
| F3 | Charts | **LOCKED — CSS bars + Recharts only for the cumulative line.** Rule: a progress bar is not a chart. Budget bars (fill + budget marker + dashed ghost), the pacing pair, and provider composition are hand-rolled CSS (semantic UI, and Recharts fights the marker/ghost pattern). The only real chart — the cumulative spend-vs-budget line in the team drill-down — uses Recharts for free hover tooltips, axis ticks, and responsive resize. |
| F4 | Forms & validation | **LOCKED — shared zod + `useActionState`; react-hook-form only if earned.** The zod schema is the single source of validation truth, imported by client and server; the server action validates authoritatively and returns typed errors via `useActionState`. Trivial forms (budget, key, invite, toggles) are native `<form>` + action — progressive enhancement for free. Only the roster-CSV preview (line-by-line errors, US#7) may justify react-hook-form, if it proves complex. |
| F5 | Component organization | **LOCKED — colocation by route + shadcn convention.** `components/ui/` holds shadcn primitives (untouched); screen-specific components colocate with their route (`app/home/_components/`); cross-screen domain components (BudgetBar, VerdictLine, StatusPill) live in `components/domain/`; display helpers in `lib/`. No barrel files. |
| F6 | Frontend testing | **LOCKED — lean pyramid.** Unit tests for display helpers (money formatting, bar-width math, verdict copy states). RTL only for logic-bearing components (BudgetBar states, verdict variants, simulator arithmetic). Playwright e2e for 3 critical journeys against seeded DB + fake providers (never live APIs): (1) cold start → connect → set budget → verdict appears; (2) warning → [Investigar] → team detail → contributors; (3) [Simular] drawer → break-even preset closes on budget. |

All F-decisions are locked. When implementation contradicts this table or the prototype, flag it — don't silently diverge.
