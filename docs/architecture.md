# Denarius — Architecture

> Derives from [prd.md](prd.md) (source of truth). This doc organizes the *system shape* for whoever builds it.

## 1. System overview

```
                 ┌────────────────────────────────────────────────┐
                 │                 Vercel (single deploy)          │
                 │  Next.js App Router monolith (TypeScript)       │
                 │                                                 │
  Browser ──────▶│  RSC pages / server actions / API routes        │
                 │        │                    ▲                   │
                 │        ▼                    │                   │
                 │  Budget & control engine (pure functions)       │
                 │  Findings / apontamentos rules                  │
                 │  Narration (Haiku, numbers injected)            │
                 └───┬──────────────┬──────────────┬───────────────┘
                     │              │              │
              Supabase Postgres   Vercel Cron    Resend (email)
              (Auth + RLS)        (daily sync)
                     ▲
                     │  read-only Admin keys (encrypted at rest)
         ┌───────────┴───────────┐
         │ OpenAI Admin API      │  usage (tokens) + costs ($)
         │ Anthropic Admin API   │  usage/cost by key/workspace/model
         └───────────────────────┘
```

- **Single repo, single Next.js app** — monolith, not a monorepo. No Turborepo/Nx.
- Denarius is **read-only** toward providers: it observes and warns, never blocks or mutates anything on their side.

## 2. Stack (locked)

| Layer | Choice |
|---|---|
| Language | TypeScript everywhere (no Python) |
| Framework | Next.js (App Router) + Tailwind + shadcn/ui + Recharts |
| Backend | Next API routes / server actions (same deploy) |
| DB / Auth | Supabase (Postgres + Auth + RLS); login e-mail/senha + Google |
| Hosting / jobs | Vercel + Vercel Cron (daily sync) |
| Email | Resend (event alerts + weekly digest) behind a pluggable channel interface |
| LLM | Claude Haiku 4.5 (`claude-haiku-4-5`), swappable via config, narration-only |
| Schema | Migrations as code in `supabase/migrations`, auto-deployed via Supabase↔GitHub integration |

## 3. Planned repo layout

```
/                     Next.js app (created in issue #12)
├── app/              routes: (auth), home, explore, settings + API routes
├── lib/
│   ├── connectors/   UsageProvider seam: openai.ts, anthropic.ts, fake.ts
│   ├── engine/       pure functions: projection, margin, thresholds, verdict
│   ├── findings/     rules: budget_threshold, apontamentos, seats_vs_roster
│   ├── narrate/      prompt assembly (numbers injected), LLM client
│   └── notify/       channel interface, resend impl, dedup (notification_log)
├── supabase/
│   └── migrations/   schema + RLS policies (versioned, auto-deployed)
└── docs/             this folder
```

## 4. Multi-tenancy & security (the due-diligence spine)

- Shared Postgres with **`tenant_id` on every table** + **Row-Level Security policies** as second layer: a query bug cannot leak across customers.
- RLS policies live in versioned migrations → an acquirer can audit the isolation history commit by commit.
- Provider credentials: read-only Admin keys, **encrypted at rest**, never in plaintext/logs, rotatable/revocable. `service_role` key only in server-side env (never `NEXT_PUBLIC_`).
- Stores **metadata only** (counts, cost, model, key/user id, date). **Never prompts/responses** — structural consequence of having no proxy.
- RBAC: Admin / Viewer + "who can see names" toggle (Admin-only default) + "store per-person data" toggle (LGPD data minimization).
- **Administrative actions leave a trail** (`audit_log`, issue #73): append-only, tenant-scoped, readable by that tenant's Admins and nobody else — no update or delete path exists in code or in RLS. Actor identity is snapshotted (e-mail on the row), so a departure does not blank the history of what that person did. Contract: [backend.md §8](backend.md).

## 5. Data flow (ingestion → decision)

1. **Ingest** (daily cron + on-connect sync): each connector implements `UsageProvider`, returning canonical usage/cost payloads. Buckets are **daily, UTC**.
2. **Normalize** into `usage_daily` / `cost_daily`; derive money from tokens × `model_price` (versioned, append-only) where the provider doesn't give $ at the needed grain. Unknown model → **"uncosted"**, never dropped.
3. **Attribute**: key/project/workspace → team; per-person only where per-person keys/user ids exist; anything unmappable → **Unattributed** bucket. Invariant: **org total = Σ teams + Unattributed**.
4. **Reconcile**: derived cost vs provider Costs total at the shared grain; drift beyond tolerance → data-quality notice.
5. **Engine** (pure functions): spend vs budget, **projected margin**, linear run-rate projection with **day-5 guard**, threshold crossings, top drivers, **verdict** (green/amber/red + one deterministic sentence).
6. **Findings**: `budget_threshold` (warnings), `apontamento` (calm observations), `seats_vs_roster` (secondary waste). Stateless — no user-facing status.
7. **Notify**: event alert once per (team, threshold-level, period), escalation-only re-fire, via `notification_log`; weekly digest to Admins (opt-out). Numbers injected into narration; the LLM never computes.

## 6. Conceptual data model

See the full table in [prd.md → Data & security](prd.md). Entities: `tenant`, `user`, `employee`, `team` (+ implicit Unattributed), `provider_connection`, `subscription` (daily accrual), `usage_daily`, `cost_daily`, `budget` (thresholds + frozen FX), `model_price` (append-only), `finding`, `notification_log`, `invitation`, `audit_log` (append-only, Admin-read).

Implementation note: the conceptual `user` entity is the **`app_user`** table (`user` is reserved in Postgres; `auth.users` belongs to Supabase Auth). `app_user.display_name` is presentation-only profile metadata for the Denarius UI; authentication email remains owned by Supabase Auth. The Unattributed bucket is a `team` row flagged `is_unattributed` (internal name, UI renders its label from the flag).

## 7. Currency & FX

- Source of truth **USD** (provider-native), stored exact.
- Display in tenant `display_currency`; budget comparisons use the **FX rate frozen at period start** (stored on `budget`), disclosed on screen — so "spend vs budget" reflects usage change, not dollar swings.
- **One rate per tenant per period (2026-07-11 audit):** display conversion everywhere resolves through `periodFx()` in `lib/engine/money-model.ts` (org budget's captured rate, else earliest team capture) — Home, Explore, team detail, attribution and e-mails can never convert the same USD figure differently. Per-budget FX triples remain as the audit trail. USD-native figures render display-currency-first with the original USD attached (`UsdDisplay`); a missing rate is disclosed, never guessed, and never summed into a display figure. Full contract: [backend.md §11](backend.md).

## 7b. Cache & revalidation boundary (2026-07-11 audit, QA-02)

App pages are request-dynamic RSCs (RLS cookies), so the server always reads fresh Postgres; the boundary that matters is the **client router cache**. The rule: every spend-affecting server action ends with `revalidatePath("/", "layout")` — whole-tree invalidation — because budgets, connections, attribution, seats and roster all feed Home, Explore and the dynamic team-detail routes at once. Enumerated per-path revalidation is forbidden (it caused QA-02: stale banners and totals surviving navigation). Contract details: [backend.md §12](backend.md).

## 7c. Controlled client state over server actions (2026-07-11 audit, QA-11)

Forms whose selections must survive a racing revalidation (attribution mapping) follow the draft/baseline model: the client owns a controlled draft; the **baseline advances only to the payload the server action confirmed it saved** (`saved` in the action result); revalidated props may add new rows but never overwrite client state. Pure state helpers live in `lib/` (`lib/attribution/draft.ts`), unit-tested without a DOM.

## 8. Environments

| Env | What |
|---|---|
| Local | Next dev + Supabase project (or local CLI); `.env.local` (gitignored) |
| Production | Vercel project linked to repo; Supabase project; secrets as Vercel env vars |

MVP runs on free tiers; DB/secret rigor from day one. Move off free tier at first paying customer.

## 9. Testing strategy (summary)

Nine seams, detailed in [prd.md → Testing Decisions](prd.md). The pattern: **fake provider injection** for ingestion; **pure-function tests** for engine/findings/planning; **RLS isolation** integration test (tenant A cannot read tenant B — the most critical due-diligence test); RBAC/privacy; HTTP seam with transactional rollback.

## 10. Dependency & supply-chain policy (2026-08-05, issue #76)

Every dependency is due-diligence surface. The policy is enforced in the pipeline, not by convention.

**Install from the lockfile, everywhere.** CI installs with `npm ci`, and Vercel does too (`installCommand` in `vercel.json`). Both matter: `npm ci` in CI alone would still let Vercel resolve a fresh tree at build time, so what a reviewer approved and what production runs would be different trees.

**One gate, two consumers.** `.github/workflows/quality.yml` (install → audit → lint → typecheck → test → **build**) is a `workflow_call` reused by `ci.yml` (pull requests) and `deploy-prod.yml` (push to `main`, which deploys). Deploy runs behind `needs: quality`. Duplicating the gate would let the PR side and the deploy side drift apart.

**Why `next build` is in the gate.** Lint, typecheck and vitest all pass on code the Next compiler rejects — a `"use server"` module may export nothing but async functions, and one exported constant makes the compiler drop *every* export in the file. That reached `main` green and failed at deploy (PR #105). Without the build step, the production deploy is the first place such a failure appears. The build needs no secrets: every page is dynamic, so it compiles with no env vars present.

**Audit threshold: high.** `npm audit --audit-level=high` fails the build; moderate and low are reported without failing. **No exception is accepted today** — the tree audits clean (0 advisories as of 2026-08-05). An advisory published against a dependency will therefore block `main` with no code change; that is the intended behaviour. Clearing it means bumping the dependency, or — if no fix exists — an entry in this section stating the advisory, why the risk is accepted, and the date, added in the same PR as the workflow change that skips it.

**Actions pinned to commit SHAs.** `actions/checkout` and `actions/setup-node` are pinned to SHAs with the version in a trailing comment. A tag is mutable; `@v4` means "whatever that tag points at today".

**Dependabot** (`.github/dependabot.yml`) runs weekly on Mondays for both `npm` and `github-actions` — the second is what keeps the SHA pins from rotting. Minor and patch updates are grouped (dev and production separately); majors arrive as individual pull requests. Every Dependabot PR passes through `ci.yml` before it can merge.

**The lockfile is generated on Linux. This is a rule, not a detail.** `deploy-prod.yml` used to justify `npm install` on the grounds that a Windows-generated lockfile could not satisfy `npm ci` on Linux. Tested on 2026-08-05, and **the claim was substantially right** — the diagnosis was just incomplete. npm does record every optional platform variant regardless of host (`oxide-linux-x64-gnu`, `oxide-win32-x64-msvc` and the rest were all present), so the `oxide`/`lightningcss` part of the story was wrong. What npm does *not* do is walk the dependencies of a package it considers uninstallable on the current host. Generated on Windows, the tree reached `@napi-rs/wasm-runtime` and `@img/sharp-wasm32`, both of which depend on `@emnapi/runtime`, and recorded no resolution for it. `npm ci` on `ubuntu-latest` then failed with `Missing: @emnapi/runtime@1.11.3 from lock file`. It is not a pruning quirk that only affects Linux — that lockfile was incomplete on any platform; Linux is simply where it was caught.

No npm flag fixes this from Windows. `--package-lock-only`, a delete-and-regenerate, and `--os=linux --cpu=x64 --libc=glibc` were each tried on 2026-08-05 and each produced the same 849-package file with `@emnapi/runtime` absent. npm has no `supportedArchitectures` (that is pnpm). The committed lockfile was therefore generated by `npm install --package-lock-only` on `ubuntu-latest`: 860 packages, `@emnapi/runtime@1.11.3` present, and the win32/darwin variants all retained. `npm ci` was then confirmed green on **both** `ubuntu-latest` and Windows, so local development is unaffected.

**The consequence to remember:** running `npm install` on Windows can silently re-prune the lockfile and reintroduce the gap. The safety net is that `ci.yml` now runs `npm ci` on every pull request, so a re-pruned lockfile fails in review instead of at deploy. If it happens, do not hand-edit the file — regenerate it on Linux. Nothing about this is Windows' fault or npm's version; assume it recurs.

**Node version.** CI pins Node 22 in `setup-node`; the Vercel project must stay on the same major. Not enforced by `engines` yet.
