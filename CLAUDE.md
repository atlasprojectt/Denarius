# CLAUDE.md — Denarius

> This is the **constitution** of the project: how to think before writing a single line of code. Three layers: **Identity** (why the product exists and what it refuses to be), **Process** (how work flows from doc to merge), **Standards** (how code must be). When instinct and this file disagree, this file wins. When this file and `docs/` disagree, flag it — don't guess.

---

## Layer 1 — Identity

### 1. Mission

- **Product:** Denarius is AI-spend governance. It connects OpenAI + Anthropic Admin APIs (read-only), turns token usage into **money**, tracks it against **budgets**, and answers *"am I in control?"* with a deterministic **verdict**, early warnings, and contextual what-if simulation.
- **User:** the CEO/CTO of a 20–200-person tech company. An executive, not an engineer. They give the product ~10 seconds per visit.
- **Problem solved:** AI spend grows fast and unpredictably; there is no budget guardrail; leaders find out about overruns when the invoice arrives, with no plan.
- **Product philosophy:** verdict-first (state the conclusion, then justify it); money is the headline, tokens are drill-down; **the system points, the CEO decides**.
- **Business context (shapes everything):** the exit thesis is 1–3 paying customers → **sale to a strategic acquirer**. Every decision passes *"does this raise sale value / survive due diligence?"* — never "does this scale to 10k customers?". Auditable simplicity beats clever architecture.

### 2. Product principles — never violate

1. **Control, not surveillance.** Per-person data only in context ("contributors to this spike"), never a leaderboard; names Admin-only; Viewers see aggregates; prompts/responses are never stored.
2. **Read-only governance.** Denarius warns and recommends; it cannot block or cap usage. Never write code or copy that implies enforcement.
3. **Honest numbers or no numbers.** Every key figure is defensible: "as of <date>" stamps, "uncosted" for unknown models, stale-sync banners, disclosed frozen FX, reconciliation notices. Show the gap, never a guess.
4. **Budgets & the verdict are the hero.** Everything on screen exists to answer "am I in control?" — features that don't serve that answer are scope creep.
5. **Semaphore discipline.** Green/amber/red are reserved for budget status only. Deltas ("+18% vs May") stay neutral — spending more isn't inherently bad.
6. **Calm by default.** Alarm language only for warnings; apontamentos observe, never alarm. Anti-fatigue rules are sacred: one alert per (team, threshold-level, period), escalation-only re-fire.

### 3. Decision criteria — conflict resolution, in order

1. Consistency with [docs/prd.md](docs/prd.md) (source of truth)
2. Security & tenant isolation
3. Simplicity (fewer parts, auditable)
4. UX clarity (the 10-second answer)
5. Performance (only when a measured problem exists)

If a change would require violating #1, **stop and flag it** — updating the PRD is a founder decision, not a silent side effect.

---

## Layer 2 — Process

### 4. Source of truth — read before implementing

| Doc | Holds |
|---|---|
| [docs/README.md](docs/README.md) | Index + reading order |
| [docs/prd.md](docs/prd.md) | **Source of truth**: stories, decisions P1–P15, scope, build order |
| [docs/architecture.md](docs/architecture.md) | System shape, data flow, tenancy, data model |
| [docs/backend.md](docs/backend.md) | Module contracts, engine formulas, env vars |
| [docs/frontend.md](docs/frontend.md) | Screens, tokens, patterns, F1–F6 — **visual reference** now that the app screens exist |

Never decide alone what a doc has already decided. Docs > memory > instinct.

### 5. Development flow — always the same

```
Read docs → Plan → Implement (small vertical slice) → Test → Self-review
→ Update docs (if behavior changed) → PR → CodeRabbit review
→ Address comments → Merge
```

Work = GitHub issues **#11–#23**, dependency-ordered. Don't start an issue whose blockers aren't closed. #11 is HITL (founder provisions infra/keys).

### 6. Checklist — before implementing

- [ ] Is there documentation for this? (docs/)
- [ ] Is it inside PRD scope? (the Out of Scope list is a contract)
- [ ] Is there an existing pattern, component, or service to reuse?
- [ ] Which issue does this belong to, and are its blockers closed?

### 7. Checklist — before considering a task done / merging

- [ ] Tests pass; lint clean; typecheck clean
- [ ] Self-reviewed the full diff
- [ ] Docs updated **in the same PR** if behavior/architecture/UX changed
- [ ] CodeRabbit comments: relevant ones fixed; dismissed ones answered with a justification
- [ ] Change is consistent with the architecture (Layer 3)
- Branch per issue (`feat/<issue>-slug`) → PR to `main`. Docs-only changes may go straight to `main`.
- Commits: imperative, English, explain the *why*.

---

## Layer 3 — Standards

### 8. Engineering philosophy

- Simplicity over abstraction. **YAGNI. KISS.** Don't build infra for customers that don't exist.
- Explicit over clever; readability over brevity; small functions, small files.
- Composition over inheritance. Pure functions at the core, I/O at the edges.
- **Every new dependency must earn its place** — each one is due-diligence surface. Prefer the platform (Next/Postgres/CSS) over a library.
- Optimize only with evidence of a real problem.

### 9. Architecture rules

**Never:**
- Business logic in React components — the engine lives in `lib/engine/` as pure functions; the UI only displays.
- DB access from client components — reads via RSC, writes via server actions only.
- The LLM computing or deciding anything numeric (see invariant below).
- A query that crosses tenants outside the deliberate service-role paths (cron).
- Duplicating a rule that already exists in `lib/`.

**Always:**
- Connectors behind the `UsageProvider` seam; notification channels behind an interface.
- Schema changes as versioned migrations in `supabase/migrations` (auto-deploy via GitHub integration) — never dashboard clicks.
- Reuse existing services/helpers before writing new ones.

### 10. Technical invariants — never break

1. **Tenant isolation:** every table has `tenant_id` + an RLS policy. No exceptions, no "temporary" tables without it.
2. **The LLM never computes.** All numbers (spend, %, margin, projection, savings) come from deterministic code and are **injected** into narration; control-plan actions come from a curated catalog — the LLM phrases, never invents. Tests assert no non-injected figures.
3. **Reconciliation invariant:** `org total = Σ team totals + Unattributed`. Spend never silently disappears; unknown models surface as "uncosted", never dropped.
4. **USD is the source of truth**, stored exactly as providers report; display converts via the **FX rate frozen at period start**, disclosed on screen.
5. **Projection guard:** no run-rate projection (nor projected-breach warnings) before **day 5** of the period — show "collecting pace…".
6. **Findings are stateless** (no user-facing "resolved"); `notification_log` is system state only and never resets on budget edits.

### 11. Frontend standards (F1–F6 locked — details in [docs/frontend.md](docs/frontend.md))

- **RSC-first (F1):** pages are Server Components reading Postgres; mutations are server actions; no internal REST, no React Query, no global state. `"use client"` only for real interactivity (drawer, modal, collapse, slider).
- **Copy (F2):** UI strings in **pt-BR**, isolated in copy constants at the top of the component or per-screen `copy.ts` — never inline in JSX. Code, comments, docs, commits: English.
- **Charts (F3):** budget/pacing bars are hand-rolled CSS (progress bars, not charts); Recharts only for the cumulative line in the team drill-down.
- **Forms (F4):** shared zod schema (single validation truth) + server action + `useActionState`; native `<form>` for trivial forms; react-hook-form only if the roster-CSV preview earns it.
- **Organization (F5):** shadcn primitives in `components/ui/` (untouched); screen components colocated in `app/<route>/_components/`; cross-screen domain components (BudgetBar, VerdictLine, StatusPill) in `components/domain/`; no barrel files.
- **When to create:** a domain component when used by 2+ screens; a hook only when stateful logic repeats; a util as a pure function in `lib/`. Reuse before creating.
- **Required states per screen:** cold-start (CTA, never empty), collecting-pace (before day 5), all-clear (affirmative, not blank), stale-data (banner), breached. Loading via RSC streaming/skeletons — no client spinners for daily data.
- **Numbers:** always `tabular-nums`; one `money()` helper; sentence case everywhere.

### 12. Backend standards

- **Fake providers, never live APIs, in tests** — canonical OpenAI/Anthropic payload fixtures behind the seam.
- **The engine is exhaustively unit-tested** (projection, guard, margins, thresholds, verdict, dedup, FX, seat accrual) — it's the hero; a wrong number here kills the product's trust.
- **The RLS isolation test is the most critical test in the repo:** tenant A must not read tenant B, across all tables.
- LLM calls mocked in CI, always. Sync jobs idempotent (upsert by natural key).

### 13. Quality bar

- TypeScript strict; no `any` without a written justification on the line.
- No dead code, no commented-out code, no forgotten TODOs (a TODO either becomes an issue or doesn't get written).
- Comments only for constraints the code can't express — never to narrate what the next line does.

### 14. Security

**Never:** expose or log secrets/tokens/keys; store credentials in plaintext; skip authorization checks; trust client input; put `SUPABASE_SERVICE_ROLE_KEY` or provider keys anywhere client-reachable (`NEXT_PUBLIC_*`, logs, commits).
**Always:** validate input with zod **server-side**; check tenant + role on every server action; encrypt provider Admin keys at rest; keep `.env*` gitignored.

### 15. Living documentation

After any meaningful decision, ask: **"does this need to enter the documentation?"** If unsure, it does — in the **same PR**:

| Changed | Update |
|---|---|
| Architecture / data flow | [docs/architecture.md](docs/architecture.md) |
| Product behavior / UX / scope | [docs/prd.md](docs/prd.md) (+ the layer doc) |
| New backend contract or formula | [docs/backend.md](docs/backend.md) |
| New frontend pattern or token | [docs/frontend.md](docs/frontend.md) |

---

## Appendix — practical

| What | Command |
|---|---|
| App dev | `npm run dev` → http://localhost:3000 |
| Tests | `npm test` · `npm run test:e2e` (Playwright) |
| DB migration | new file in `supabase/migrations/` → auto-deploys on merge to `main` |

- **`gh` auth quirk (this machine):** the GCM token lacks `read:org`, so `gh auth login` fails. Use:
  `export GH_TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill | sed -n 's/^password=//p')`
- **Current state (2026-07):** docs done; PRD hardened (P1–P15, F1–F6 locked). The static `prototype/` (its job done once the real screens shipped) was **removed** — docs/frontend.md §4 holds the tokens and the running app is the visual reference. **Merged: #12 walking skeleton** (auth + tenant + RLS), **#13 roster CSV** (pure parser, atomic `roster_import` RPC), **#14 manual seats** (subscription CRUD, daily-accrual engine, Explore reconciliation), **#15 OpenAI connector** (UsageProvider seam + fake behind `ALLOW_FAKE_PROVIDER`, AES-256-GCM key storage, immediate sync, uncosted models, USD display pending FX in #18), **#16 Anthropic connector** (second provider through the same seam; workspace/key grain, no per-user data; shared key-lifecycle actions + `runProviderSync(tenant, provider)` replacing the OpenAI-specific sync; Claude prices seeded in `model_price`; live validation vs a real Admin key still pending #11), **#17 daily cron + attribution** (Vercel Cron route `app/api/cron/sync/route.ts` guarded by `CRON_SECRET`, scheduled in `vercel.json` — the one cross-tenant path, reusing `runProviderSync`; `project_map` table + `/ajustes/atribuicao` mapping UI + `teamApiSpend()`/`teamDetail()` for by-team and Admin-only per-person cost at `/explorar/time/[teamId]`; pure `reconcile()` + `freshness()` engine functions with a `StaleBanner`, both unit-tested). Migrations #12–#15 applied on Supabase manually via SQL editor — **#16's price seed, #17's `20260704140000_attribution.sql`, and #18's `20260704160000_budgets.sql` need the same manual apply**. **Merged: #18 budget engine (the HERO)** — `budget` table (org + per-team, thresholds, frozen-FX triple); pure engine `lib/engine/budget.ts` (run-rate projection + day-5 guard, current/projected margin, pacing, `combinedSpend` = seats + API-USD×frozenFX), `thresholds.ts` (crossings, severity, `notificationsToFire` dedup/escalation), `drivers.ts` (`topDrivers`), `verdict.ts` (green/amber/red + neutral collecting, deterministic sentence — LLM never computes); findings in `lib/findings/` (catalog-only control plans, `buildBudgetThresholdFinding` + `orderFindings`); FX capture `lib/fx/rate.ts` (best-effort, null-disclosed); admin-guarded CRUD `lib/budgets/actions.ts` + minimal UI `/ajustes/orcamentos`. Exhaustively unit-tested; `budget` added to the RLS isolation test. **Flagged for founder:** severity ranks a *realized* breach above a *projected* one (verdict-consistent), a reasoned deviation from PRD P11's literal "80→100→projected" ladder. **Merged: #19 home cockpit** (verdict line, pacing pair, needs-attention rows, under-control collapse — `buildCockpit` in `lib/engine/cockpit.ts`). **Merged: #20 notifications** — `notification_log` table (migration `20260706120000_notifications.sql`, **needs the same manual apply**; also adds `app_user.digest_opt_out`) backing the once-per-(target, level, period) dedup, RLS with NO policies (system state, service-role only); channel seam `lib/notify/channel.ts` (`NotificationChannel` + `ResendChannel` via raw fetch, fake impl in tests; no send → no log, so alerts retry once email is configured); event alerts wired into the daily sync cron for every budgeted tenant (seats-only included) via `lib/notify/{snapshot,plan,alerts,render}.ts` — one email per scope per run at the most severe new level, all new levels logged; weekly digest cron `app/api/cron/digest/route.ts` (Fridays, `CRON_SECRET`-guarded) with narration `lib/narrate/` (Claude Haiku `claude-haiku-4-5` via raw fetch, swappable `NARRATION_MODEL`; deterministic `digestTemplate` fallback; `narrationIsSafe` rejects any non-injected number — invariant #2 enforced in code and tests); digest opt-out toggle in `/configuracoes` (Admins). **HITL for #20:** founder must set `RESEND_API_KEY` (alerts+digest are skipped without it, undelivered crossings retry daily) and `ANTHROPIC_API_KEY` (digest falls back to the deterministic template without it) in Vercel prod. **Merged: #21 contextual planning** — pure scenario engine `lib/engine/scenario.ts` (`simulatePace` levers only REMAINING spend — the past is never unspent; `breakEvenDelta` for the "fechar no orçamento" preset, unreachable disclosed) recomputed client-side in the rewritten `SimulateDrawer` (slider ±100%, presets ritmo atual / fechar no orçamento / −30%; collecting state before day 5), opened from Home team rows and Explore team detail; apontamentos via pure `buildApontamentos()` in `lib/findings/apontamentos.ts` (halfway 50% excluding warned teams — one event one channel; top-3 concentration ≥70% among ≥4 teams; per-team week-over-week acceleration ≥40%; unattributed ≥5%; capped at 4) rendered in the calm `ObservationsFooter`; shared `combineTeamSpend()` in `lib/engine/team-spend.ts` (null when FX missing) now also feeds the notification snapshot; `mapKey`/`isoDaysAgo` exported for single-source attribution keys and date windows. **Merged: #22 seats-vs-roster waste** — pure `buildSeatWaste()` in `lib/findings/seats-vs-roster.ts` (team-bound subscriptions compare against that team's roster headcount, shared ones against the whole roster; empty roster slice → no claim; savings = excess × seat price; top-3 by savings), rendered below the apontamentos in the Observations footer with the v1.5 Copilot-connector caveat; never emailed. **Implemented: #23 privacy & roles** — two typed tenant switches (migration `20260707120000_privacy.sql`, **needs the same manual apply**: `tenant.show_names` + `tenant.store_per_person`, default true); pure `lib/privacy/policy.ts` (`canSeeNames` — Viewers never see names, switch-off hides them even from Admins; `canRemoveUser` — not self) enforced at the DATA layer in `teamDetail()` (anonymizes person ids to `Colaborador N` server-side before they reach the client); pure `collapsePersonGrain()` in `lib/privacy/minimize.ts` wired into `runProviderSync` (store-per-person off → sum to team/project grain, blank user_id before persistence, totals exact); admin server actions `updatePrivacySettings` / `removeUser` (delete auth user → app_user cascades → RLS denies immediately) / `updateDisplayCurrency` (day-zero only, protects frozen FX); privacy toggles + users list + currency UI on `/ajustes`; prompts/responses never stored (metadata only). Unit-tested (`tests/privacy.test.ts`) + remove-user integration test (`tests/rbac-privacy.test.ts`, self-skips until the migration is applied). **HITL for #23:** founder applies the privacy migration on Supabase before merge (the `/ajustes` page selects the new columns). Build order complete (#12–#23); real Admin keys (#11) still pending. Real Admin keys (#11) still pending (needs org Owner) — the fake provider covers the demo path meanwhile. **HITL for #17:** the founder must set `CRON_SECRET` in Vercel prod env for the daily cron to run (fail-closed until then). **Deployed to Vercel prod** (project `denarius`, live at `denarius-nine.vercel.app`); prod env has the Supabase + `CREDENTIAL_ENCRYPTION_KEY` vars but deliberately **not** `ALLOW_FAKE_PROVIDER`. **Push-to-`main` auto-deploys** via `.github/workflows/deploy-prod.yml` (lint+typecheck+test gate → `vercel deploy --prod`; source deploy, not prebuilt, because the Supabase vars are Sensitive and `vercel pull` can't read them). Vercel's native Git integration is unavailable — Hobby plan won't connect a private org repo — hence the CLI workflow. Prod and local dev currently share one Supabase project (split before the first paying customer). CodeRabbit is seatless (Free plan) — PRs get a local 8-angle review instead. **The provisional skin was replaced by the v1 product UI** (2026-07-08, founder-directed): shadcn used extensively (card/badge/alert/table/select/switch/empty/item/progress added and radius/type-aligned per docs/frontend.md §4), semaphore formalized as `--status-*` tokens (strong/soft/fg, both themes; form success is neutral — green is budget-only), shared domain components `PageHeader`/`EmptyState`/`ActionStatus` joining the existing ones, contextual empty states everywhere, route-group loading skeleton, grouped `/ajustes` hub, `max-w-4xl` content column + sticky header with `ThemeToggle` (brand accent `#FF5100`, light/dark via `.dark` + no-FOUC script, two-tone wordmark collapsing to the coin). Structure (F1–F6) unchanged; brand identity may still be tuned before launch — inventory, state patterns, and pendências (drill-down Recharts line, onboarding checklist) in docs/frontend.md §9.
