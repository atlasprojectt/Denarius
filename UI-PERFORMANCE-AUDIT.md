# UI & Frontend Performance Audit — 2026-07-18

Full UI sweep of the running app (source of truth: the current working tree, which includes the in-progress redesign). Audited live at 1440×900, 1024×768 and 390×844, light and dark themes, across every major route, via authenticated headless Chromium (QA tenant + fake-provider fixtures). Strictly a UI/implementation audit: no UX, routes, copy, permissions, data or business-logic changes.

## Executive summary

The app is in strong visual shape — the recent redesign is coherent, the chart language (grid, realized line, projection, budget reference, today marker, gradient area) is consistent between Home and the team drill-down, states (empty/collecting/stale/breached) are covered, and `tabular-nums`/sentence-case discipline holds. The audit found no broken screens and one real rendering bug (a negative-width SVG rect logged on every Home load).

The main systemic problem was **motion fragmentation**: a well-designed token system (120/160/180 ms + `cubic-bezier(0.22,1,0.36,1)`) existed in `globals.css` but only `Button` consumed it. Everything else used ad-hoc `duration-150/200/250/300`, six primitives used `transition-all`, two visually distinct deceleration curves competed across the app, and focus rings drifted between three widths/opacities. Secondary issues: settings pages rendered at three different widths, the `Card` primitive's default radius contradicted nearly every consumer, `Intl` formatters were constructed on every call (~6× per table row), and ~2,600 lines of dead chart code sat in `components/evilcharts/`.

All of the above is now fixed (see **Changes implemented**). Typecheck, lint and 346/346 unit tests pass; every route re-verified in both themes at all three breakpoints.

## Global UI inconsistencies (found → resolved)

| # | Issue | Impact | Technical cause | Fix | Severity |
|---|---|---|---|---|---|
| G1 | Two competing motion curves: token `cubic-bezier(0.22,1,0.36,1)` vs hardcoded `cubic-bezier(0.16,1,0.3,1)` in sidebar/reveals/auth/tabs/toast | Motion reads as two different products side by side | "Premium" animations were tuned inline and never tokenized | New `--motion-ease-expressive` token for signature motion; every other transition moved to `--motion-ease-standard` | High |
| G2 | Only `Button` consumed the duration tokens; ~30 components used raw `duration-150/200/250/300` | No single motion clock; drift on every new component | Tokens added late; primitives shipped with shadcn defaults | All interaction transitions now use `duration-(--motion-duration-fast/standard/max)`; rule documented in docs/frontend.md §4 | High |
| G3 | `transition-all` in `input`, `switch`, `select`, `badge`, `progress` (+ inert leftover on the sidebar rail) | Animates every property incl. layout; badge had no duration at all | shadcn defaults | Replaced with explicit property lists + tokens (rail left as-is: its `transition-all` matches no changing property — noted, zero runtime effect) | Medium |
| G4 | Focus-ring drift: `ring-2/40` (button, tabs) vs `ring-2/30` (input, switch, rows) vs `ring-[3px]/50` (badge, item) | Keyboard-focus affordance visibly inconsistent | Per-component copies | Uniform `focus-visible:ring-2 ring-ring/40` everywhere | Medium |
| G5 | `Card` shipped `rounded-md` but most consumers overrode to `rounded-xl` | Token contradicted practice; unstyled consumers looked subtly different | Default never updated after the redesign settled on xl | Card default is now `rounded-xl`; redundant per-site overrides removed | Medium |
| G6 | Settings width drift: `/ajustes` hub `max-w-5xl`, ALL its subpages `max-w-7xl` (mostly by default fall-through), `/configuracoes` `max-w-4xl` | Subpages wider than their own hub; navigation felt like three products | Missing `variant` prop on 7 subpages; explicit `wide` on 2 | Every `/ajustes/*` subpage now `variant="settings"`; `/configuracoes` stays `form` (deliberate reading measure) | Medium |
| G7 | Page rhythm: Explorar `gap-5` vs the `gap-6` norm | 4 px drift between sibling analytical screens | One-off value | Explorar → `gap-6`. Home `gap-4` (dense cockpit grid) and the hub's `gap-8` (grouped nav sections) kept as deliberate | Low |
| G8 | `accent` button variant was a byte-for-byte duplicate of `tertiary`; `default` duplicated `primary`; zero call sites used either | Dead API surface; a second name for the same pixels | Documented compat aliases whose migration had already finished | Aliases removed from `button.tsx` and the globals selectors | Low |
| G9 | Two near-identical "how was this calculated" collapsibles with different surfaces (borderless vs bordered trigger) | Same concept, two visual treatments across Explorar and team drill-down | Parallel implementations | Consolidated into `components/domain/calculation-disclosure.tsx` (one trigger/content chrome); both screens are thin wrappers | Low |
| G10 | Arbitrary type sizes `text-[12px]`/`text-[17px]` interleaved with the scale; `PreferenceSection` heading `font-semibold` vs the `CardTitle` `font-medium` standard | Type ramp noise | Ad-hoc values | `text-[12px]` → `text-xs` (identical size), `text-[17px]` → `text-lg`, heading → `font-medium` | Low |
| G11 | Dead CSS: the first `:root`/`.dark` color block in `globals.css` (~60 declarations) was fully shadowed by the Denarius theme block | Confusing double source of truth; anyone editing the first block saw no effect | Two shadcn presets pasted sequentially | Dead color vars removed; `color-scheme` and the motion tokens (the only live parts) kept | Low |

## Route-by-route findings

**Home (`/`)** — Coherent in both themes; 2×2 grid stretches correctly, `min-w-0` guards hold. One real bug: a `<rect> width: -7.5` console error on every load (chart end-label geometry — fixed, see P1). At 390 px the forced-table variant of `TeamBudgetTable` horizontally scrolls inside the card — this is the documented "Home never flips layout" decision, left as-is. The below-the-fold chart appearing blank in headless full-page captures is the scroll-triggered reveal system working as designed (IntersectionObserver never fires without real scrolling), not a defect.

**Times (`/times`)** — Clean at all breakpoints; the `xl` fixed-track grid falls back to the card list below `xl`, safe at 390 px. Row hovers/chevrons were on ad-hoc 150 ms — now tokens. Card radius overrides removed.

**Team drill-down (`/times/[teamId]`)** — Chart language intact at every size. The spend-calculation collapsible had a bordered trigger unlike Explorar's borderless one — now the shared disclosure. The historical `text-primary` dark-contrast defect (docs §9) is confirmed **already fixed** in the current tree (old `team-diagnosis-card` deleted; no first-party resting-ink `text-primary` remains — verified by grep).

**Explorar (`/explorar`)** — Solid, incl. the tabs and 390 px card fallbacks. Was the only analytical page at `gap-5`; summary tile used `text-[17px]`; footer/notices `text-[12px]` — all normalized.

**Ajustes (`/ajustes` + subpages)** — The hub was `settings` width but all 9 subpages rendered `wide`; now aligned. `settings-navigation` used the standard curve inline instead of the token — repointed.

**Configurações (`/configuracoes`)** — Fine; `PreferenceSection` heading weight normalized.

**Auth (`/login`)** — Entrance choreography kept (signature). The mode slider/company-field reveal ran at 300 ms — retimed to the 180 ms token with the expressive curve; tab label color fade to 160 ms.

## Motion issues

- Standardized clock: **120 ms** micro moves (chevrons, icon shifts, sort-icon fades), **160 ms** hover/row/content color, **180 ms** overlay enter/exit (dropdown, popover, select, tooltip, dialog, sheet — sheet was 250 ms, dialog 200 ms). All on `cubic-bezier(0.22,1,0.36,1)`. `motion-reduce` fallbacks (75/100 ms) and gates preserved throughout.
- Signature motion kept intact per decision, now tokenized as `--motion-ease-expressive`: sidebar collapse 320 ms, chart reveal builds 560/1150/1400 ms, verdict pulse 2200 ms, auth entrance 600/900 ms.
- Movement amplitudes already complied (≤3 px hovers, 6 px page-enter, overlay slide-ins 8 px); no bounce/scale/glow beyond the existing subtle switch press — unchanged.
- `prefers-reduced-motion` audit: every keyframe animation is media-query-gated and every reveal has an explicit reduce block — no regressions introduced (verified by review; the gates were not touched).

## Performance issues

| # | Issue | Impact | Cause | Fix | Severity |
|---|---|---|---|---|---|
| P1 | Negative-width SVG `<rect>` error on every Home load | Console error ×N per session; invalid SVG each first render pass | `EndLabel` in `monthly-pace-chart.tsx` computed `width = anchorX − rectX` which goes negative when the plot-left clamp passes the anchor (zero-width first layout) | Clamped to `Math.max(0, …)` | Medium |
| P2 | `Intl.NumberFormat`/`DateTimeFormat` constructed per call in `lib/money.ts` and `lib/format.ts` — 92 call sites, ~6× per `TeamBudgetTable` row, densest in charts/tooltips | Repeated construction of an expensive object on every render pass | No caching | Module-scope formatter cache keyed by currency/options; behavior identical (guarded by `tests/money.test.ts`) | Medium |
| P3 | `NextActionsButton` double-fetched: mount prefetch + unconditional refetch on open | Duplicate server-action POST per first open | Open handler ignored the prefetch | Open now reuses the prefetch and only fetches when it hasn't landed/failed. Verified live: opening the popover issues **0** additional requests | Low |
| P4 | ~2,600 lines of dead client chart code in `components/evilcharts/` (area-chart, evil-brush, chart, tooltip, legend, dot) | Repo/maintenance surface (not bundled — never imported) | Vendored kit; only `background.tsx` used | Deleted after import-graph verification; `background.tsx` (recharts + react only) kept | Low |
| P5 | Verified healthy, no action: `ChartContainer` debounce + frozen-SVG stretch, `react cache()` dedup of `assembleCockpit`, reveal observers (leak-safe), RSC streaming skeletons, no client spinners for daily data | — | — | — | — |

## Standardization opportunities (implemented)

- One motion vocabulary: tokens + two named curves, written as `duration-(--motion-duration-*)` / `ease-(--motion-ease-*)` utilities — the rule is now in docs/frontend.md §4 so new components inherit it.
- One focus ring, one card radius, one settings width, one calculation-disclosure surface.

## Changes implemented

1. `app/globals.css` — added `--motion-ease-expressive`; repointed reveal/sidebar/auth keyframes to it; removed the dead first `:root`/`.dark` color block (kept `color-scheme` + motion tokens); simplified button selectors after alias removal.
2. `components/ui/` — `input`, `switch`, `select`, `badge`, `progress`: `transition-all` → explicit property lists on tokens; `tabs`, `dialog`, `sheet`, `dropdown-menu` (content, sub-content, items), `popover`, `tooltip`, `select` content: durations/easings → tokens; focus rings → `ring-2 ring-ring/40`; `card`: default radius `rounded-md` → `rounded-xl`; `button`: dead `default`/`accent` aliases removed; `item`: ring normalized. `sidebar.tsx` untouched (F5) — its motion continues to be governed by the unlayered `data-slot` overrides.
3. `components/domain/` — new `calculation-disclosure.tsx`; `app-sidebar` (curves → expressive token), `next-actions-button` (fetch guard + token motion), `team-budget-table`, `sidebar-notice`, `toast-provider`, `money-input` aligned.
4. Route components — `times/page`, `team-index`, `explore-table`, `explorar/page`, `settings-navigation`, `preference-section`, `auth-form`, `setup-checklist`, `info-tip`, `diagnosis-sections`: motion/type/ring alignment; both calculation-details components rebuilt on the shared disclosure (call-site APIs unchanged); redundant `rounded-xl` card overrides dropped.
5. Width/rhythm — all 9 `/ajustes/*` subpages → `PageContainer variant="settings"`; Explorar → `gap-6`.
6. Performance — formatter caches in `lib/money.ts`/`lib/format.ts`; `EndLabel` rect clamp; next-actions fetch dedup; `components/evilcharts/` pruned to `ui/background.tsx`.
7. Docs — motion standardization rule + expressive token added to `docs/frontend.md` §4.

## Deferred improvements

- **11px/13px micro type pair** (`text-[11px]`/`text-[13px]`, dozens of sites): collapsing onto `text-xs` would visibly change density on Times/Explorar metric labels — defer to a deliberate type-ramp pass.
- **Internal hairline opacities** (`border-border/60` vs `/70` on in-card dividers): a 10% alpha difference on 1px lines; churn outweighs benefit right now.
- **Home cold-start card** hand-rolls its surface (`border`+`shadow-xs` instead of the Card `ring` idiom) and doesn't use `EmptyState` — visual-only divergence on a rarely-seen state; touching it borders on layout redesign.
- **`components/ui/radio-group.tsx`** is a zero-style passthrough unlike every other primitive — fine while `ThemePicker` is its only consumer; give it baseline styles when a second consumer appears.
- **Skeleton dimension drift**: each route's `loading.tsx` hardcodes its own row heights (e.g. `h-[74px]`); a shared skeleton-row helper would keep them honest as the real rows evolve.
- **Sheet 40px slide-in distance** (shadcn default) exceeds the 4–6 px content-motion guideline; shortening it changes drawer feel — flag for a motion-design decision.

## Validation results

- `tsc --noEmit` clean · `eslint` clean · `vitest` **346/346 passed** (43 files).
- Re-swept `/`, `/times`, `/times/[teamId]`, `/explorar`, `/ajustes` (+ orcamentos), `/configuracoes`, `/login` at 1440×900, 1024×768, 390×844 in light **and** dark: no layout breaks, chart language unchanged, no regressions observed.
- Console: the negative-rect error is **gone** on all routes/viewports (previously fired on every Home load).
- Computed-style spot checks (live): input transitions `color, background-color, border-color, box-shadow` @ `0.12s cubic-bezier(0.22,1,0.36,1)` ✓ · Card radius `14px` ✓ · `/ajustes/orcamentos` container `1024px` (`settings`) ✓ · sidebar collapse still `0.32s cubic-bezier(0.16,1,0.3,1)` ✓ · body font `DM Sans` ✓ (the serif rendering in some headless captures is a font-download artifact of the test browser, not an app issue).
- Next-actions popover: opening after the mount prefetch issues **0** extra server-action requests.
- Reduced-motion gates untouched and re-reviewed (keyframes remain inside `no-preference` queries; reduce blocks intact).

*QA note: audited with the standing "QA Fase1 Triagem" tenant (kept alive per its open-cleanup note); no new test data was created.*
