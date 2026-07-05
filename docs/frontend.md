# Denarius — Frontend & UI spec

> Derives from [prd.md](prd.md) (UX Decisions P1–P15). This doc is the **visual contract** for the frontend — the design tokens (§4) and component contracts below. (A static `prototype/` seeded these decisions and was removed once the real screens shipped in #12–#15; the running app is the live reference.)
> **Status:** UX decisions (P1–P15) and implementation decisions (F1–F6, §7) all locked.
>
> ⚠️ **The current visual skin is a PROVISIONAL front — an approximation, not the final UI.** The screens exist to make the product tangible and align everyone a little closer to the intended feel (brand accent, light/dark, logo lockup). Treat colors, spacing, and the theme system as a working draft that will be redone before launch — do **not** read the present look as the locked visual identity. The *structure* (F1–F6, screen contracts, tokens-as-CSS-variables) is what's stable; the *paint* is temporary.

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
| **Explorar** | Investigation. Root: by-team table (incl. **Não atribuído**) + by-model; drill → team detail (pace chart, contributors) with breadcrumb. **#17 shipped:** API-by-team table (USD), stale banner + reconciliation notice, and the Admin-only per-person drill at `/explorar/time/[teamId]` (shared keys / Anthropic roll up to the team, never a person). The pace chart lands with budgets (#18). |
| **Ajustes** | Connections (OpenAI/Anthropic/Copilot-soon), **atribuição (mapa projeto/workspace → time, #17)**, **orçamentos (org + por time, #18)**, roster CSV, manual seats, users/roles, privacy toggles, currency |

Budget editing is **inline** (pencil on rows / hero) → modal. The **simulator is a right-side drawer** opened in context ([Simular] on warnings/teams) — never a nav destination. **#18 shipped** the minimal budget CRUD as a settings page (`/ajustes/orcamentos`, org + per-team `<form>`s, Σ-mismatch informational notice, frozen-FX disclosure); the inline pencil→modal on the Home rows/hero arrives with the cockpit in #19.

## 3. Home component contracts

1. **Onboarding checklist** (dismissible, 4 steps, budget step pushed) — only until complete.
2. **Stale-data banner** — only when a connector hasn't synced >1 day.
3. **Verdict line** — always present; green/amber/red; sentence + meta (days left, projection).
4. **Hero**: org spend big number; paired bars **Gasto % × Mês (dia N de M)** with aligned budget marker; ghost extension = projection; callout = projected margin.
5. **Precisa de atenção (N)**: teams with `status ≠ green`, ordered by projected risk; each row = name + status pill + values, bar with ghost + marker, warning line, actions **[Investigar] [Simular] [✎]**.
6. **Sob controle (N) ✓**: collapsed list, expandable; compact bars.
7. **Observações**: calm feed (no red, no urgency), includes unattributed nudge.
8. **Para onde vai o dinheiro**: ranked provider bar list (no donut) + "tokens no drill-down".

**States that must exist:** cold-start (no data/budget → CTA hero, never empty), collecting-pace (before day 5), **all-clear** ("✓ Tudo sob controle · próximo digest sexta"), stale-data, breached.

## 4. Design tokens (implemented in `app/globals.css`)

> **Provisional (see the banner at the top).** These values are the current draft skin, not a locked palette. What's stable is the *mechanism*: every color is a CSS variable, redefined under `:root` (light) and `.dark` (dark), so re-skinning is a token edit, not a component rewrite.

| Token | Value |
|---|---|
| Brand accent | **`#FF5100` (orange)** — `--primary` / `--ring` / sidebar-primary, both themes |
| Semaphore | green `#16a34a` · amber `#d97706` · red `#dc2626` (+ soft bgs) — reserved for budget status |
| Surfaces (light) | page `#f7f8fa` · card `#fff` · ink `#0b1220` · muted `#64748b` |
| Surfaces (dark) | page `#0b0c0f` · card `#15161a` · ink `#e7e9ee` · muted `#9aa1ac` |
| Sidebar rail | dark in both themes (`#0c1322` light · `#0a0b0e` dark) |
| Radii | card 14px · controls 9px |
| Type | system sans stack; numbers **tabular-nums**; two weights (400/650-740) |
| Shadows | subtle (`0 1px 2px…`); drawer/modal stronger |

**Light + dark** (supersedes the earlier "light only" of P9 for this provisional front — a founder-directed change). The theme is the `.dark` class on `<html>`, toggled by `components/domain/theme-toggle.tsx` (no dependency; reads/writes `localStorage.theme` and is applied pre-paint by a no-FOUC inline script in `app/layout.tsx`, defaulting to the OS preference). Desktop-first; consumption screens legible at mobile width. Copy: pt-BR, sentence case, observation language for apontamentos, alarm language reserved for warnings.

**Brand logo** (`components/domain/logo.tsx`): the wordmark is used **extensively** (auth, onboarding, brand panel, sidebar) and is two-tone — the coin is the brand accent (`var(--primary)`), the letters inherit `currentColor` so they theme with the container. In the sidebar it **collapses to the coin mark alone** when the rail is in icon mode.

## 5. Interaction patterns

- **Drawer** (right, 420px): simulator — pre-loaded team, presets (ritmo atual / fechar no orçamento / −30%), slider, instant recompute. Scrim click closes.
- **Modal**: budget create/edit (scope, amount, thresholds) — prefilled when opened from a row.
- **Collapse**: "Sob controle" group; warning rows expand to show drivers + control plan (read-only).
- **Drill**: any team (bar, row, [Investigar]) → Explore team detail; breadcrumb back. Person data only inside a drill, framed as "contribuintes deste pico".

## 6. Charts

- Team/budget bars: HTML/CSS (fill + dashed ghost + marker).
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

All F-decisions are locked. When implementation contradicts this table, flag it — don't silently diverge.

## 8. UI scaffold (issue #12)

shadcn blocks are **starting scaffolding**, adapted into the F5 structure — the block is not the final structure.

- **Sidebar — base `sidebar-07`** ("collapses to icons"). On top of it, compose our two nav groups with `SidebarGroup`: **Cockpit** (Início, Explorar) and **Conta** (Ajustes). Ships as `components/domain/AppSidebar`. Restyle toward the design tokens (dark rail, tenant identity in the header, "as of <date> / FX" in the footer). `variant="inset"` is a later aesthetic opt-in, not now. (Chosen over `sidebar-08` because all blocks share the same `Sidebar`/`SidebarGroup` primitives — starting from the cleaner base and composing our own groups beats inheriting 08's secondary-nav rendering.)
- **Auth — matched pair `login-02` + `signup-02`** (two-column, form + cover image — a premium branded first impression, à la Mercury/Ramp). Live in `app/(auth)/login` and `app/(auth)/signup`. Adaptations (no block ships these):
  - Both: a **Google** button wired to Supabase Auth (email/password + Google).
  - Signup: a **company name** field → the submit server action creates the `tenant`.
  - Cover column: slot for the value prop / a cockpit screenshot.
- **Placement (F5):** shadcn primitives untouched in `components/ui/`; auth compositions in `app/(auth)/`; screen components in `app/<route>/_components/`; shared domain components (`AppSidebar`, `VerdictLine`, `BudgetBar`, `StatusPill`) in `components/domain/`.
