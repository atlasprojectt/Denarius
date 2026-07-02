# CLAUDE.md — Denarius

B2B SaaS for **AI-spend governance**: connects OpenAI + Anthropic Admin APIs (read-only), turns token usage into money, tracks it against budgets, and answers "am I in control?" with a deterministic **verdict**, early warnings, and contextual what-if simulation. Buyer: CEO/CTO of 20–200-person tech companies.

**The decision lens for everything:** this MVP exists to get 1–3 paying customers and be **sold to a strategic acquirer**. Every choice passes *"does this raise sale value / survive due diligence?"* — never "does this scale to 10k customers?". Prefer fewer, auditable moving parts over clever architecture.

## Read first

1. [docs/README.md](docs/README.md) — index + reading order.
2. [docs/prd.md](docs/prd.md) — **source of truth** (user stories, decisions P1–P15, build order).
3. [docs/architecture.md](docs/architecture.md) · [docs/backend.md](docs/backend.md) · [docs/frontend.md](docs/frontend.md) — per-layer specs (F1–F6 locked).
4. [`prototype/`](prototype/) — the **visual contract** for the frontend (static, mocked data). Run: `node prototype/server.js` → http://localhost:5599.

Work is sliced into GitHub issues **#11–#23**, dependency-ordered. #11 is HITL (founder provisions infra/keys). Don't start an issue whose blockers aren't closed.

## Invariants — never break these

1. **Tenant isolation:** every table has `tenant_id` + an RLS policy. No exceptions, no "temporary" tables without it. RLS lives in versioned migrations (`supabase/migrations`), never dashboard clicks.
2. **The LLM never computes.** All numbers (spend, %, margin, projection, savings) come from deterministic code and are **injected** into narration prompts. Control-plan actions come from a curated catalog — the LLM phrases, never invents. Tests must assert no non-injected figures in output.
3. **Reconciliation invariant:** `org total = Σ team totals + Unattributed`. Spend never silently disappears; unknown models show as "uncosted", never dropped.
4. **Read-only honesty:** Denarius warns and recommends; it cannot block/cap usage. Never write copy or code implying enforcement.
5. **Money is the headline; USD is the source of truth.** Stored exact as reported by providers; displayed in tenant currency via the **FX rate frozen at period start** (disclosed on screen). Tokens are drill-down detail.
6. **Semaphore discipline:** green/amber/red are reserved for **budget status only**. Deltas ("+18% vs May") stay neutral — spending more isn't inherently bad.
7. **Projection guard:** no run-rate projection (nor projected-breach warnings) before **day 5** of the period — show "collecting pace…".
8. **Alert anti-fatigue:** an event alert fires once per (team, threshold-level, period); re-fires only on a higher level; resets next period; `notification_log` is system state (never user-facing status) and never resets on budget edits. Findings are **stateless** — no "resolved" tracking.
9. **Privacy posture:** per-person data only in context ("contributors to this spike"), never a leaderboard; names Admin-only; Viewer sees aggregates. Never store prompts/responses — usage metadata only.
10. **Secrets:** provider Admin keys encrypted at rest, never in logs/plaintext/commits. `SUPABASE_SERVICE_ROLE_KEY` and friends are server-only (never `NEXT_PUBLIC_`). `.env*` is gitignored — keep it that way.

## Stack & locked patterns

- **TypeScript everywhere.** Next.js App Router + Tailwind + shadcn/ui, monolith on Vercel (single repo, single app — **not** a monorepo). Supabase (Postgres + Auth + RLS). Vercel Cron (daily sync). Resend (email). Narration: Claude Haiku 4.5, swappable via config.
- **RSC-first (F1):** pages are Server Components reading Postgres directly; mutations are server actions; no internal REST layer, no React Query, no global state. `"use client"` only for real interactivity (drawer, modal, collapse, slider).
- **Copy (F2):** UI strings in **pt-BR**, isolated in copy constants at the top of the component (or per-screen `copy.ts`) — never inline in JSX. Code, comments, docs, commits: **English**.
- **Charts (F3):** budget/pacing bars are hand-rolled CSS (progress bars, not charts). Recharts only for the cumulative line in the team drill-down.
- **Forms (F4):** shared zod schema (single validation truth) + server action + `useActionState`. Native `<form>` for trivial forms; react-hook-form only if the roster-CSV preview earns it.
- **Components (F5):** shadcn primitives in `components/ui/` (untouched); screen components colocated in `app/<route>/_components/`; cross-screen domain components in `components/domain/`; no barrel files.
- **Numbers in UI:** always `tabular-nums`; money via a single `money()` helper; sentence case; calm observation language for apontamentos, alarm language only for warnings.

## Testing (the seams that matter)

- **Fake providers, never live APIs** in tests: connectors sit behind the `UsageProvider` interface; fixtures are canonical OpenAI/Anthropic payloads.
- **Engine = pure functions** (projection, guard, margins, thresholds, verdict, dedup, FX, seat accrual) — unit-test exhaustively; this is the hero.
- **RLS isolation test is the most critical:** tenant A must not read tenant B, across all tables.
- Frontend (F6): unit for display helpers; RTL for logic-bearing components; Playwright for 3 journeys (cold-start→budget→verdict; warning→investigate; simulate→break-even) against seeded DB.
- LLM calls mocked in CI, always.

## Workflow

- **Branch per issue** (`feat/<issue>-slug`), PR to `main`. CodeRabbit reviews every PR automatically — read and address its comments. Docs-only changes may go straight to `main`.
- Commits: imperative, English, explain the *why*.
- **`gh` auth quirk (Windows/this machine):** the GCM token lacks `read:org`, so `gh auth login` fails. Use:
  `export GH_TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill | sed -n 's/^password=//p')`
- Keep docs in sync: if a change alters product behavior, update [docs/prd.md](docs/prd.md) (and the layer doc) **in the same PR**. When code and prototype/docs disagree, flag it — don't silently diverge.

## Commands

| What | Command |
|---|---|
| Prototype (visual contract) | `node prototype/server.js` → http://localhost:5599 |
| App dev (after issue #12) | `npm run dev` |
| Tests | `npm test` (unit) · `npm run test:e2e` (Playwright) |
| DB migration | new file in `supabase/migrations/` → auto-deploys via Supabase↔GitHub on merge to `main` |

## Current state (2026-07)

- Docs + prototype done; PRD hardened through product/UX/frontend grillings (P1–P15, F1–F6 all locked).
- **No application code yet** — next milestone is issue #11 (HITL: Supabase/Vercel provisioning + Admin-key API spike), then #12 (walking skeleton).
- Founder has Supabase/Vercel accounts; Admin keys for OpenAI/Anthropic pending (needs org Owner access or a dev-only org).
