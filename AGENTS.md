# AGENTS.md — Denarius

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
| [docs/prd.md](docs/prd.md) | **Source of truth**: stories, product rules, scope, and build history |
| [docs/architecture.md](docs/architecture.md) | System shape, data flow, tenancy, data model |
| [docs/backend.md](docs/backend.md) | Module contracts, engine formulas, env vars |
| [docs/frontend.md](docs/frontend.md) | Route contracts, states, accessibility, and F1–F6. Visual values are intentionally minimal during the UI reformulation. |

Never decide alone what a doc has already decided. Docs > memory > instinct.

### 5. Development flow — always the same

```
Read docs → Plan → Implement (small vertical slice) → Test → Self-review
→ Update docs (if behavior changed) → PR → CodeRabbit review
→ Address comments → Merge
```

Work is dependency-ordered. The original v1 issues are historical; use [docs/current-state.md](docs/current-state.md) for shipped behavior, limits, and remaining operational checks. Do not start work whose documented blockers are open.

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
- Schema changes live in versioned files in `supabase/migrations`. CI applies the chain from zero. Production application follows the approved deployment path; never use dashboard-only edits.
- Reuse existing services/helpers before writing new ones.

### 10. Technical invariants — never break

1. **Tenant isolation:** every tenant-owned table has `tenant_id` + an RLS policy. Global catalogs and server-only state are explicit exceptions with restricted access; never add an unscoped product table.
2. **The LLM never computes.** All numbers (spend, %, margin, projection, savings) come from deterministic code and are **injected** into narration; control-plan actions come from a curated catalog — the LLM phrases, never invents. Tests assert no non-injected figures.
3. **Reconciliation invariant:** `org total = Σ team totals + Unattributed`. Spend never silently disappears; unknown models surface as "uncosted", never dropped.
4. **USD is the source of truth**, stored exactly as providers report; display converts via the **FX rate frozen at period start**, disclosed on screen.
5. **Projection guard:** no run-rate projection (nor projected-breach warnings) before **day 5** of the period — show "collecting pace…".
6. **Findings are stateless** (no user-facing "resolved"); `notification_log` is system state only and never resets on budget edits.

### 11. Frontend standards (F1–F6 locked — details in [docs/frontend.md](docs/frontend.md))

- **RSC-first (F1):** pages are Server Components reading Postgres; mutations are server actions; no internal REST, no React Query, no global state. `"use client"` only for real interactivity (drawer, modal, collapse, slider).
- **Copy (F2):** UI strings in **pt-BR**, isolated in copy constants at the top of the component or per-screen `copy.ts` — never inline in JSX. Code, comments, docs, commits: English.
- **Charts (F3):** budget and pacing bars are hand-rolled CSS. Recharts is limited to cumulative time-series views; the current app uses it on Home and team diagnosis.
- **Forms (F4):** shared zod schema (single validation truth) + server action + `useActionState`; native `<form>` for trivial forms; react-hook-form only if the roster-CSV preview earns it.
- **Organization (F5):** shadcn primitives in `components/ui/` (untouched); screen components colocated in `app/<route>/_components/`; cross-screen domain components (BudgetBar, VerdictLine, StatusPill) in `components/domain/`; no barrel files.
- **When to create:** a domain component when used by 2+ screens; a hook only when stateful logic repeats; a util as a pure function in `lib/`. Reuse before creating.
- **Required states per screen:** cold-start (CTA, never empty), collecting-pace (before day 5), all-clear (affirmative, not blank), stale-data (banner), breached. Loading via RSC streaming/skeletons — no client spinners for daily data.
- **Numbers:** always `tabular-nums`; one `money()` helper; sentence case everywhere.

### 12. Backend standards

- **Fake providers, never live APIs, in tests** — canonical OpenAI/Anthropic payload fixtures behind the seam.
- **The engine is exhaustively unit-tested** (projection, guard, margins, thresholds, verdict, dedup, FX, seat accrual) — it's the hero; a wrong number here kills the product's trust.
- **The RLS isolation test is the most critical test in the repo:** tenant A must not read tenant B across tenant-owned tables; catalog and server-only exceptions get explicit access tests.
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
| DB migration | add a file in `supabase/migrations/`; CI applies the chain from zero, then apply production migrations through the approved deployment path |

- **`gh` auth quirk (this machine):** the GCM token lacks `read:org`, so `gh auth login` fails. Use:
  `export GH_TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill | sed -n 's/^password=//p')`
- **Current state (2026-10-04):** the v1 cockpit and pre-launch hardening are implemented. Read [docs/current-state.md](docs/current-state.md) for the audited feature list, limits, and unresolved database, forecast, and search conflicts. The UI is in a planned visual reformulation; [docs/frontend.md](docs/frontend.md) records structural contracts only. Real provider validation, production database separation, and other human-provisioned checks remain open.
