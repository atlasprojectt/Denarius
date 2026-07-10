# Denarius — Frontend & UI spec

> Derives from [prd.md](prd.md) (UX Decisions P1–P15). This doc is the **visual contract** for the frontend — the design tokens (§4) and component contracts below. (A static `prototype/` seeded these decisions and was removed once the real screens shipped in #12–#15; the running app is the live reference.)
> **Status:** UX decisions (P1–P15) and implementation decisions (F1–F6, §7) all locked.
>
> **The provisional skin was replaced by the v1 product UI** (2026-07-08, founder-directed): shadcn primitives used extensively, a formalized semaphore token set, shared PageHeader/EmptyState/ActionStatus domain components, consistent empty/loading/error states, and a full pass over Home/Explorar/Ajustes. The *structure* (F1–F6, screen contracts, tokens-as-CSS-variables) is unchanged. Brand identity (logo, accent, final type choices) may still be tuned before launch, but the present look is the product baseline — no longer a throwaway approximation. §9 lists what's still pending.

## 1. Principles

- One question drives everything: **"am I in control of AI spend?"** answered in ≤10s.
- **Verdict-first**: the screen states the conclusion (one deterministic sentence + color); details justify it below.
- Money headlines; tokens are drill-down. Semaphore colors (green/amber/red) are **reserved for budget status** — deltas and everything else stay neutral.
- Honesty in the chrome: "as of <date>" stamps, stale banners, "uncosted", disclosed FX. Never a number the system can't defend.
- Control, not surveillance: per-person data only in context ("contributors to this spike"), names Admin-only.

## 2. Navigation (3 destinations)

| Screen | Job |
|---|---|
| **Início (Home)** | The cockpit — a stable, read-only overview (redesigned 2026-07-09). Full-width rows: verdict → hero (spend vs budget + pacing pair + projected-margin callout) + provider composition donut (2/3 · 1/3) → monthly-pace line → **one stable teams table** (all budgeted teams, at-risk first, no expanding rows) → Observações (apontamentos). Nothing on Home expands, opens drawers or edits — acting on a team is a click through to its drill-down; editing budgets is a click to `/ajustes/orcamentos` |
| **Explorar** | Investigation. Root: by-team table (incl. **Não atribuído**) + by-model; drill → team detail (breadcrumb). **#17 shipped:** API-by-team table (USD), stale banner + reconciliation notice, and the Admin-only per-person drill at `/explorar/time/[teamId]` (shared keys / Anthropic roll up to the team, never a person). **Redesign 2026-07-09:** the team drill-down is now where a team's situation is *acted on* — it carries a **budget context card** (status pill + bar + spend/budget/projection + warning line + "editar em Ajustes"), the **control plan card** (`finding.controlPlan`, catalog-only, moved off Home), and the **[Simular] drawer** in its header. |
| **Ajustes** | Hub for company and operational setup: company name, read-only display currency, Connections (OpenAI/Anthropic/Copilot-soon), **atribuição (mapa projeto/workspace → time, #17)**, **orçamentos (org + por time, #18)**, roster CSV, manual seats, users/roles, privacy toggles, currency |

Budget editing lives on the **`/ajustes/orcamentos`** settings page (org + per-team `<form>`s, Σ-mismatch notice, frozen-FX disclosure) — reached from the Home teams table's "Gerenciar orçamentos" action and the drill-down's "editar em Ajustes" link. The **simulator is a right-side drawer** opened in context ([Simular] in the team drill-down header) — never a nav destination. **#18 shipped** the budget CRUD page. **#19 shipped** the Home cockpit; its inline pencil→modal (`BudgetEditDialog`) was **removed in the 2026-07-09 redesign** — Home is read-only, so editing is one click away on the settings page rather than a per-row dialog. The [Simular] drawer (interactive presets/slider from #21) now opens only from the team drill-down, not from Home rows.

## 3. Home component contracts

1. **Onboarding checklist** (dismissible, 4 steps, budget step pushed) — only until complete.
2. **Stale-data banner** — only when a connector hasn't synced >1 day.
3. **Verdict line** — always present; green/amber/red; sentence + meta (days left, projection).
4. **Hero**: org spend big number (the product's identity — never demote it to a KPI tile); paired bars **Gasto % × Mês (dia N de M)** with aligned budget marker; ghost extension = projection; KPI strip (projection / projected margin / day of month) + projected-margin callout. **Read-only** since 2026-07-09 — no inline pencil.
5. **Orçamentos por time (table)**: ONE stable table for every budgeted team, at-risk first (cockpit ordering). Columns: Time (+ muted warning line for at-risk) · Situação (status pill) · Gasto · Orçamento · Consumo (bar + %) · Projeção · chevron → drill-down. No expanding rows, no collapsed "Sob controle" group, no inline actions — the whole row links to `/explorar/time/[id]`; a single "Gerenciar orçamentos" action heads to `/ajustes/orcamentos`. (Replaced the rich `TeamRow` + `UnderControl` collapse.)
6. **Observações**: calm feed (no red, no urgency), includes unattributed nudge.
7. **Dashboard panels**: "Para onde vai o dinheiro" (provider/seat donut + ranked legend, beside the hero) and the monthly pace line (full-width, current spend + linear projection). Team distribution stays in the teams table, not as a second donut.

**States that must exist:** cold-start (no data/budget → CTA hero, never empty), collecting-pace (before day 5), **all-clear** ("✓ Tudo sob controle · próximo digest sexta"), stale-data, breached.

**#19 implementation:** the page is a Server Component reading `getHomeData()` (`lib/home/queries.ts`), which gathers raw spend parts under RLS and hands them to the pure engine `buildCockpit()` (`lib/engine/cockpit.ts`) — all arithmetic, the seats+API frozen-FX combine, the verdict, the per-team findings, and the needs-attention/under-control partition live there, not in the components (architecture §9). The org spend headline uses provider-**reported** cost (`cost_daily`, the USD source of truth); per-team spend uses **derived** cost (`usage_daily`, the only grain with team attribution). Provider composition converts each provider's reported USD at the org frozen FX and adds the seat slice; when FX is missing the API cost is dropped from the list and disclosed as unconverted (never mixed currencies). New cross-screen domain components: `VerdictLine`, `StatusPill`, `BudgetBar` (fill + dashed run-rate ghost + budget marker, geometry in the pure `lib/bars.ts`).

## 4. Design tokens (implemented in `app/globals.css`)

> Every color is a CSS variable, redefined under `:root` (light) and `.dark` (dark), so re-skinning is a token edit, not a component rewrite.

| Token | Value |
|---|---|
| Brand accent | **`#FF5100` (orange)** — `--primary` / `--ring` / sidebar-primary, both themes |
| Semaphore | **formalized as tokens, three roles per color** (`--status-{green,amber,red}` strong = bar fills/dots · `-soft` = pill/callout backgrounds · `-fg` = text on a soft background), exposed as Tailwind utilities (`bg-status-green`, `text-status-red-fg`, …) via `@theme`. Light: green `#16a34a` · amber `#d97706` · red `#dc2626`; dark uses brighter fills (`#22c55e`/`#f59e0b`/`#ef4444`) for legibility. Reserved for budget status (principle #5) — form success messages are **neutral**, never green (see `ActionStatus`). |
| Surfaces (light) | page `#f7f7f8` · card `#fff` · ink `#17181c` · muted `#6b6f76` — **neutral grayscale, no blue/slate cast** |
| Surfaces (dark) | page `#0c0c0d` · card `#161618` · ink `#e9e9ea` · muted `#9b9ca0` — neutral charcoal |
| Sidebar rail | **light in light mode** (off-white `#f4f4f5`, ink `#3f4046`), dark neutral charcoal in dark mode (`#0a0a0b`) — the earlier navy tint (`#0c1322`) that read as purple was removed (the auth brand panel likewise moved to neutral charcoal `#0e0e10`) |
| Radii | **standardized scale** — cards/panels `rounded-xl` (14px) · inner rows/boxes `rounded-lg` (10px) · controls & menus `rounded-md` (8px) · pills/avatars `rounded-full`. shadcn primitives now use the `base-mira` preset (2026-07-08 founder-directed) with local compatibility for the app's existing `asChild` call sites. |
| Type | DM Sans for app text (`--font-sans`; `--font-heading` maps to sans); Geist Mono (`--font-mono`) only for key-like strings (Admin key input); numbers **tabular-nums**; two weights (400/600) |
| Shadows | cards `shadow-xs`; drawer/modal stronger |
| Content column | pages are `max-w-4xl mx-auto` inside `main` (`px-4 py-8 md:px-8`); **Home is full-width** (`w-full`, founder-directed 2026-07-09 — the cockpit uses the whole monitor, no dead margins); app header is sticky with backdrop blur and holds only the sidebar trigger + tenant name. Theme is chosen in `/configuracoes` (the `ThemePicker`), **not** the header — a header toggle was tried and removed (2026-07-09, founder-directed: it read as clutter and duplicated the settings control) |

**Light + dark** (supersedes the earlier "light only" of P9 for this provisional front — a founder-directed change). The theme is the `.dark` class on `<html>`, toggled by `components/domain/theme-toggle.tsx` (no dependency; reads/writes `localStorage.theme` and is applied pre-paint by a no-FOUC inline script in `app/layout.tsx`, defaulting to the OS preference). Desktop-first; consumption screens legible at mobile width. Copy: pt-BR, sentence case, observation language for apontamentos, alarm language reserved for warnings.

**Personal settings:** `/configuracoes` is a real authenticated route, but it is accessed from the profile pop-up in the sidebar footer rather than the main nav. It lets the signed-in user edit their own display name, shows email/role as read-only, renders a profile avatar from initials (no file upload/storage in this slice), and reuses the existing local `ThemeToggle`. Company settings stay in **Ajustes**: Admins can edit the tenant name there, while display currency remains read-only to avoid dishonest FX/budget reinterpretation.

**Brand logo** (`components/domain/logo.tsx`): the wordmark is used **extensively** (auth, onboarding, brand panel, sidebar) and is two-tone — the coin is the brand accent (`var(--primary)`), the letters inherit `currentColor` so they theme with the container. In the sidebar it **collapses to the coin mark alone** when the rail is in icon mode.

## 5. Interaction patterns

- **Drawer** (right, 420px): simulator — pre-loaded team, presets (ritmo atual / fechar no orçamento / −30%), slider, instant recompute. Scrim click closes.
- **Modal**: budget create/edit (scope, amount, thresholds) — prefilled when opened from a row.
- **Drill**: any team row on Home → Explore team detail; breadcrumb back. The drill-down carries the budget context, the control plan (read-only) and the [Simular] drawer — Home itself never expands or opens a drawer (redesign 2026-07-09). Person data only inside a drill, framed as "contribuintes deste pico".

## 6. Charts

- Team/budget bars: HTML/CSS (fill + dashed ghost + marker).
- Home dashboard visuals use shadcn Chart + Recharts: the provider/seat donut uses already computed composition shares; the monthly pace line is explicitly current spend plus linear projection, not a historical series.
- Cumulative historical line (spend vs budget + dashed projection): **implemented 2026-07-09** in the team drill-down — `CumulativeChart` (colocated in `explorar/time/[teamId]/_components/`) over the pure `buildCumulativeSpend()` (`lib/engine/cumulative.ts`, unit-tested): real day-by-day series using the same combine as the evaluation (frozen FX, FX-missing drops API, seats spread evenly), so the line's last point IS the card's "Gasto"; dashed tail to `evaluation.projection`; budget `ReferenceLine` labeled.

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

- **Sidebar — base `sidebar-07`** ("collapses to icons"). On top of it, compose our two nav groups with `SidebarGroup`: **Cockpit** (Início, Explorar) and **Conta** (Ajustes). Ships as `components/domain/AppSidebar`. The footer is a profile pop-up: the trigger shows initials + name/email when expanded and opens **Configurações** (`/configuracoes`) plus **Sair**. `variant="inset"` is a later aesthetic opt-in, not now. (Chosen over `sidebar-08` because all blocks share the same `Sidebar`/`SidebarGroup` primitives — starting from the cleaner base and composing our own groups beats inheriting 08's secondary-nav rendering.)
- **Auth — matched pair `login-02` + `signup-02`** (two-column, form + cover image — a premium branded first impression, à la Mercury/Ramp). Live in `app/(auth)/login` and `app/(auth)/signup`. Adaptations (no block ships these):
  - Both: a **Google** button wired to Supabase Auth (email/password + Google).
  - Signup: a **company name** field → the submit server action creates the `tenant`.
  - Cover column: slot for the value prop / a cockpit screenshot.
- **Placement (F5):** shadcn primitives untouched in `components/ui/`; auth compositions in `app/(auth)/`; screen components in `app/<route>/_components/`; shared domain components (`AppSidebar`, `VerdictLine`, `BudgetBar`, `StatusPill`) in `components/domain/`.

## 9. v1 product UI (2026-07) — inventory, state patterns, pendências

### 9.1 shadcn primitives (`components/ui/`)

Base set from #12 (button, input, label, dialog, sheet, dropdown-menu, tooltip, sidebar, skeleton, separator, collapsible, avatar, breadcrumb, field) plus, added in the v1 UI pass: **card, badge, alert, table, select, switch, progress, empty, item, chart**. Primitives are generated from shadcn `base-mira`; local changes are limited to compatibility shims required by existing app contracts (`asChild`, tooltip delay alias) and the documented token/type alignment. App icons are standardized on **Tabler Icons** via `@tabler/icons-react`.

**Base UI dropdown gotchas** (found 2026-07-09 fixing the sidebar profile menu): (1) `DropdownMenuLabel` wraps Base UI `Menu.GroupLabel`, which **throws "MenuGroupContext is missing" outside a `<Menu.Group>`** — for a plain identity header inside the menu, use a styled `<div>`, not `DropdownMenuLabel`. (2) Composing `DropdownMenuTrigger asChild` through another render-prop component (e.g. `SidebarMenuButton`, itself a `TooltipTrigger`) **swallows the trigger's open/close handlers and the menu never opens** — use a plain `DropdownMenuTrigger` (it renders its own native button) styled to match, with an `aria-label` for the collapsed rail.

**Button icon-size gotcha** (found 2026-07-09 — the header sidebar toggle rendered a 12px speck): the `Button` base carries `[&_svg:not([class*='size-'])]:size-3`, whose `:not([class*=…])` gives it **higher specificity than any parent `[&_svg]:size-*` override** — such overrides silently lose. The intended escape hatch is a `size-*` class **on the svg itself** (that's what the `:not()` guard checks). Any icon inside a `Button` that should not be 12px must carry its own size class (e.g. `SidebarTrigger` now renders `<IconLayoutSidebar className="size-5" />`).

**`Item` primitive gotcha** (found 2026-07-09 — `/configuracoes` rendered a blank card): `Item` is built on Base UI `useRender`, which only renders children it receives via `props`. The generated component destructured `children` out and never forwarded it, so a plain `<Item>…</Item>` (no `asChild`) rendered an empty `<div>` — dropping the whole card content. `/ajustes` was unaffected only because its Items all use `asChild` (children come from the `<Link>` in `render`). Fixed by forwarding `children: childRender ? undefined : children` into the `useRender` props, mirroring `SidebarMenuButton`. Any `useRender`-based primitive here must forward children the same way.

### 9.2 Cross-screen domain components (`components/domain/`)

| Component | Job |
|---|---|
| `PageHeader` | Every screen's opening: optional back link, title, one-line description, right-aligned action slot, optional "as of" honesty stamp (`meta`) |
| `EmptyState` | The one way to render "no data": icon + title + one useful sentence + primary/secondary CTA, composed from the shadcn `Empty` primitives |
| `ActionStatus` | Inline result line for `useActionState` forms — error in `destructive` with icon, **success neutral** (green is budget-only, principle #5) |
| `VerdictLine` | Status dot (with soft halo) + the engine's deterministic sentence, semaphore tokens |
| `StatusPill` | Budget status pill: dot + label on the soft/fg token pair |
| `BudgetBar` | Fill + dashed run-rate ghost + budget marker (geometry in `lib/bars.ts`), semaphore fills |
| `StaleBanner` | Data-quality notice on shadcn `Alert` — deliberately neutral, never semaphore |
| `SimulateDrawer` | Contextual what-if drawer (Sheet), presets + slider, result panel on muted surface |
| `AppSidebar`, `ThemeToggle`, `Logo` | Shell chrome (unchanged contracts from #12/#19) |

Screen-local compositions stay colocated (F5): the cockpit pieces (`Hero` with its KPI strip, `TeamBudgetTable`, `MonthlyPaceChart`, `AllClear`, `ObservationsFooter`, `ProviderComposition`, `PacingPair`) in `app/(app)/_components/`, settings forms under their routes. **Retired in the 2026-07-09 redesign:** `TeamRow` (per-team expanding card with 4 inline actions), `UnderControl` (collapsible healthy-teams group) and `BudgetEditDialog` (inline pencil→modal) — their jobs moved to the stable `TeamBudgetTable` on Home and to the team drill-down / `/ajustes/orcamentos` for acting.

### 9.3 State patterns (required states, §3, now uniform)

- **Empty**: always `EmptyState` (or an affirmative panel) — never a bare table or "no data". Cold-start Home is a CTA hero listing what a budget + a source unlock; Explore/atribuição/roster/assinaturas/drill-down each have a contextual empty with the obvious next action; Admin-gated screens show a lock-icon `EmptyState` explaining "controle, não vigilância".
- **Loading**: per-route skeletons that mirror each screen's real shape and column width (RSC streaming, no client spinners, F1) — `app/(app)/loading.tsx` mirrors the full-width Home cockpit; `explorar/loading.tsx`, `explorar/time/[teamId]/loading.tsx`, `ajustes/loading.tsx` (also covers the `/ajustes/*` subpages) and `configuracoes/loading.tsx` mirror their own layouts, so no screen jumps between skeleton and content (refinement 2026-07-09).
- **Error / data quality**: `StaleBanner` for stale/failed syncs; `Alert` for informational notices (Σ-mismatch); `ActionStatus` for mutation results; uncosted/unattributed/FX-missing always disclosed in card footers ("as of" stamps, reconciliation lines).
- **All-clear**: affirmative soft-green panel (`AllClear`), never a blank section.
- **Settings hub**: `/ajustes` is grouped (Empresa · Fontes de gasto · Governança) with uppercase group labels; link-out areas are `Item` rows (icon + status line + chevron) inside cards; inline areas (privacy switches, users list) are cards with `Switch`/`Item` primitives.

### 9.4 Pendências (deliberately deferred)

- **Onboarding checklist** on Home (§3.1) — the cold-start hero covers the gap meanwhile.
- **Brand identity final pass** (logo refinement, accent audit, marketing surfaces) — the v1 skin is the product baseline, not necessarily the launch brand.
- **Roster-CSV react-hook-form upgrade** (F4) — the native preview flow proved sufficient so far.
