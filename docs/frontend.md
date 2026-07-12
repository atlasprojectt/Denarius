# Denarius — Frontend & UI spec

> Derives from [prd.md](prd.md) (UX Decisions P1–P16). This doc is the **visual contract** for the frontend — the design tokens (§4) and component contracts below.
> **Status:** UX decisions P1–P16 and implementation decisions F1–F6 are locked. P16 is the founder-approved 2026-07-11 UI/UX audit and supersedes conflicting earlier screen details.
>
> **The provisional skin was replaced by the v1 product UI** (2026-07-08, founder-directed): shadcn primitives used extensively, a formalized semaphore token set, shared PageHeader/EmptyState/ActionStatus domain components, consistent empty/loading/error states, and a full pass over Home/Explorar/Ajustes. The *structure* (F1–F6, screen contracts, tokens-as-CSS-variables) is unchanged. Brand identity (logo, accent, final type choices) may still be tuned before launch, but the present look is the product baseline — no longer a throwaway approximation. §9 lists what's still pending.
>
> **Visual refresh (2026-07-12, founder-directed):** preset shadcn `b3lVLrQZM` is now the app-wide visual source of truth. The refresh changes presentation only: warm Stone surfaces, the preset orange ramp, compact radii, DM Sans, Remix Icon and restrained press feedback. Routes, screen hierarchy, RSC/server-action contracts, copy, data and deterministic product logic remain unchanged. Denarius-specific semaphore tokens continue to override the preset where budget meaning requires them.

## 1. Principles

- One question drives everything: **"am I in control of AI spend?"** answered in ≤10s.
- **Verdict-first**: the screen states the conclusion (one deterministic sentence + color); details justify it below.
- Money headlines; tokens are drill-down. Semaphore colors (green/amber/red) are **reserved for budget status** — deltas and everything else stay neutral.
- Honesty in the chrome: "as of <date>" stamps, stale banners, "uncosted", disclosed FX. Never a number the system can't defend.
- Control, not surveillance: per-person data only in context ("contributors to this spike"), names Admin-only.

## 2. Navigation (3 destinations)

| Screen | Job |
|---|---|
| **Início (Home)** | Condensed freshness → verdict/meta → linked **Próximas ações** → hero/provider composition → monthly pace → one stable teams table → remaining calm Observações. Full-row team links use a static chevron. |
| **Explorar** | `#por-time`, `#por-modelo`, and `#assentos` anchored sections with sorting, search above ten rows, BRL-primary values, secondary USD detail, prominent reconciliation, and responsive cards. Team drill adds a governed-spend bridge and independent team/company scenario outcomes. |
| **Ajustes** | Navigation-only index. Dedicated routes: Empresa, Conexões, Atribuição, Roster, Assinaturas, Orçamentos, Privacidade, and Usuários. |

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
| Brand accent | shadcn preset `b3lVLrQZM` **orange ramp** — primary `oklch(0.553 0.195 38.402)` in light mode and `oklch(0.47 0.157 37.304)` in dark mode; neutral focus rings remain separate from brand color |
| Semaphore | **formalized as tokens, three roles per color** (`--status-{green,amber,red}` strong = bar fills/dots · `-soft` = pill/callout backgrounds · `-fg` = text on a soft background), exposed as Tailwind utilities (`bg-status-green`, `text-status-red-fg`, …) via `@theme`. Light: green `#16a34a` · amber `#d97706` · red `#dc2626`; dark uses brighter fills (`#22c55e`/`#f59e0b`/`#ef4444`) for legibility. Reserved for budget status (principle #5) — form success messages are **neutral**, never green (see `ActionStatus`). |
| Surfaces (light) | Stone-based preset: white page/card, warm near-black ink, warm muted surfaces and borders — no blue/slate cast |
| Surfaces (dark) | Stone-based preset: warm near-black page, lifted dark card/popover, warm muted surfaces and borders |
| Sidebar rail | Preset Stone sidebar tokens in both themes; the rail remains visually quieter than the content and uses the orange ramp only for active emphasis |
| Radii | Preset base radius `0.625rem`, expanded through the shadcn scale: compact controls, 10px cards/inner panels and full pills/avatars. Primitives remain `base-mira` with local compatibility for existing `asChild` call sites. |
| Type | DM Sans for app text (`--font-sans`; `--font-heading` maps to sans); Geist Mono (`--font-mono`) only for key-like strings (Admin key input); numbers **tabular-nums**; two weights (400/600) |
| Shadows | cards `shadow-xs`; drawer/modal stronger |
| Content column | one `PageContainer` system, two widths only (founder 2026-07-11): `full` = `max-w-none` exclusively for the Home cockpit (fills the monitor — the big spend number is the product identity); `wide` = `max-w-7xl` (the default) for EVERY other screen — Explorar, team detail, Ajustes and its subpages, Configurações. No width jumps between routes (audit S7/QA-12). All share the same gutters and centering. |

**Light + dark** (supersedes the earlier "light only" of P9). The theme is the `.dark` class on `<html>`, toggled by `components/domain/theme-toggle.tsx` (no dependency; reads/writes `localStorage.theme` and is applied pre-paint by a no-FOUC inline script in `app/layout.tsx`, defaulting to the OS preference). Desktop-first; consumption screens legible at mobile width. Copy: pt-BR, sentence case, observation language for apontamentos, alarm language reserved for warnings.

**Personal settings:** `/configuracoes` is a real authenticated route, but it is accessed from the profile pop-up in the sidebar footer rather than the main nav. It lets the signed-in user edit their own display name, shows email/role as read-only, renders a profile avatar from initials (no file upload/storage in this slice), and reuses the existing local `ThemeToggle`. Company settings stay in **Ajustes**: Admins can edit the tenant name there, while display currency remains read-only to avoid dishonest FX/budget reinterpretation.

**Brand logo** (`components/domain/logo.tsx`): the wordmark is used **extensively** (auth, onboarding, brand panel, sidebar) and is two-tone — the coin is the brand accent (`var(--primary)`), the letters inherit `currentColor` so they theme with the container. In the sidebar it **collapses to the coin mark alone** when the rail is in icon mode.

## 5. Interaction patterns

- **Drawer** (right, 420px): simulator — pre-loaded team, presets (ritmo atual / fechar no orçamento / −30%), slider, instant recompute. Scrim click closes.
- **Confirmation dialog**: required before every Revogar/Remover action; consequence copy, safe initial focus, disabled while pending.
- **Feedback**: field validation remains inline; cross-screen mutation success/error uses a Base UI toast (5 seconds, maximum three, neutral success and destructive error).
- **Drill**: any team row on Home → Explore team detail; breadcrumb back. The drill-down carries the budget context, the control plan (read-only) and the [Simular] drawer — Home itself never expands or opens a drawer (redesign 2026-07-09). Person data only inside a drill, framed as "contribuintes deste pico".
- **Motion layer** (updated 2026-07-12): Base UI remains the primitive base. Controls use the preset's restrained one-pixel press response rather than hover lift or icon scaling; popovers/dialogs retain short soft entrances and respect `prefers-reduced-motion`. Do **not** adopt a sliding menu hover indicator; sidebar and menus stay restrained with simple color/focus states.

## 6. Charts

- Team/budget bars: HTML/CSS (fill + dashed ghost + marker).
- Home dashboard visuals use shadcn Chart + Recharts: the provider/seat donut uses already computed composition shares; the monthly pace line is explicitly current spend plus linear projection, not a historical series. A small Home-only client controller replays chart construction on Home entry/back-forward restores and starts each chart when it enters the viewport: CSS budget/pacing bars grow from the left, the composition donut sweeps in, and the monthly pace chart reveals left-to-right. Recharts line animation remains disabled so the dashed projection stays a single continuous segment.
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

- **Sidebar — base `sidebar-08`** ("inset sidebar with secondary navigation"), founder-directed on 2026-07-12. It ships as `components/domain/AppSidebar` with `variant="inset"` and `collapsible="icon"`: **Início** and **Explorar** form the primary Cockpit navigation, while **Ajustes** is secondary navigation pinned above the profile footer. The expanded header shows the Denarius wordmark and collapses to the coin; every destination keeps its Remix Icon and tooltip in icon mode. The footer trigger shows initials + name/email when expanded and opens **Configurações** (`/configuracoes`) plus **Sair**. The tenant name remains in the main app header. Demo-only block content (projects, support, feedback and team switching) is deliberately excluded.
- **Auth — matched pair `login-02` + `signup-02`** (two-column, form + cover image — a premium branded first impression, à la Mercury/Ramp). Live in `app/(auth)/login` and `app/(auth)/signup`. Adaptations (no block ships these):
  - Both: a **Google** button wired to Supabase Auth (email/password + Google).
  - Signup: a **company name** field → the submit server action creates the `tenant`.
  - Cover column: slot for the value prop / a cockpit screenshot.
- **Placement (F5):** shadcn primitives untouched in `components/ui/`; auth compositions in `app/(auth)/`; screen components in `app/<route>/_components/`; shared domain components (`AppSidebar`, `VerdictLine`, `BudgetBar`, `StatusPill`) in `components/domain/`.

## 9. v1 product UI (2026-07) — inventory, state patterns, pendências

### 9.1 shadcn primitives (`components/ui/`)

Base set from #12 (button, input, label, dialog, sheet, dropdown-menu, tooltip, sidebar, skeleton, separator, collapsible, avatar, breadcrumb, field) plus, added in the v1 UI pass: **card, badge, alert, table, select, switch, progress, empty, item, chart**. Primitives use shadcn `base-mira` with the `b3lVLrQZM` Stone/orange configuration; local changes are limited to compatibility shims required by existing app contracts (`asChild`, tooltip delay alias) and the documented semantic tokens. App icons are standardized on **Remix Icon** via `@remixicon/react`.

**Motion policy** (updated 2026-07-12): shared controls follow the preset's restrained press feedback, while Home chart construction remains controlled by the Home-only replay controller and CSS/Web Animations so it can restart on navigation and viewport entry. Keep transitions short and executive-calm. Never use hover lift, icon zoom or a sliding menu hover indicator; menus/sidebar remain simple color/focus interactions.

**Base UI dropdown gotchas** (found 2026-07-09 fixing the sidebar profile menu): (1) `DropdownMenuLabel` wraps Base UI `Menu.GroupLabel`, which **throws "MenuGroupContext is missing" outside a `<Menu.Group>`** — for a plain identity header inside the menu, use a styled `<div>`, not `DropdownMenuLabel`. (2) Composing `DropdownMenuTrigger asChild` through another render-prop component (e.g. `SidebarMenuButton`, itself a `TooltipTrigger`) **swallows the trigger's open/close handlers and the menu never opens** — use a plain `DropdownMenuTrigger` (it renders its own native button) styled to match, with an `aria-label` for the collapsed rail.

**Button icon-size gotcha** (found 2026-07-09 — the header sidebar toggle rendered a 12px speck): the `Button` base carries `[&_svg:not([class*='size-'])]:size-3`, whose `:not([class*=…])` gives it **higher specificity than any parent `[&_svg]:size-*` override** — such overrides silently lose. The intended escape hatch is a `size-*` class **on the svg itself** (that's what the `:not()` guard checks). Any icon inside a `Button` that should not be 12px must carry its own size class (e.g. `SidebarTrigger` now renders `<RiSidebarFoldLine className="size-5" />`).

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
- **Settings hub**: `/ajustes` contains navigation Items only. Inline Company, Privacy, and Users sections move to `/ajustes/empresa`, `/ajustes/privacidade`, and `/ajustes/usuarios`.

### 9.4 Pendências (deliberately deferred)

- **Onboarding checklist** on Home (§3.1) — the cold-start hero covers the gap meanwhile.
- **Brand identity final pass** (logo refinement, accent audit, marketing surfaces) — the v1 skin is the product baseline, not necessarily the launch brand.
- **Roster-CSV react-hook-form upgrade** (F4) — the native preview flow proved sufficient so far.

### 9.5 Hydration & theme — QA-01 resolution (2026-07-11 audit)

Diagnosed per the audit plan: in a **clean browser** (no extensions), light and dark saved preferences, OS preference, first authenticated load, navigation and refresh all hydrate with **zero console errors**. The audit's mismatch (QA-01) reproduces only with the auditor's browser extension injecting `chrome-extension://…/youtube-hulu-vast-ads.js` into `<head>` — QA-01b confirmed; not a `themeScript` bug. The inline theme script stays as-is; `suppressHydrationWarning` on `<html>` (app/layout.tsx) is the narrowest justified boundary — it covers exactly the pre-paint `.dark` class the no-FOUC script adds — and no broader suppression was added. A DOM-level regression test would require a browser-test dependency the repo deliberately doesn't carry; the manual matrix above is the documented verification, and any future hydration error in a clean browser should be treated as a new bug, not as this known issue.
