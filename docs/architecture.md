# Denarius — Architecture

## Product data flow

The product's canonical flow is **Spend Visibility → Budget → Forecast → Model Comparison → Usage Economics → Executive Digest → Reports**. Connectors provide observed usage and provider-reported USD; pure engine modules derive forecasts, budget risk, equivalent model costs, and efficiency metrics. The narration layer receives those facts as inputs and may only condense them. No component infers business outcomes or makes an operational decision.

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
│   ├── notify/       channel interface, resend impl, dedup (notification_log)
│   └── snapshot/     pure freeze builder, closed-window reads, closing job
├── supabase/
│   └── migrations/   schema + RLS policies (versioned, auto-deployed)
└── docs/             this folder
```

## 4. Multi-tenancy & security (the due-diligence spine)

- Shared Postgres with **`tenant_id` on every table** + **Row-Level Security policies** as second layer: a query bug cannot leak across customers.
- RLS policies live in versioned migrations → an acquirer can audit the isolation history commit by commit.
- Data API privileges are explicit in migrations, not inherited from a Supabase project default: authenticated sessions receive only the reads/RPCs the app uses, browser table writes stay revoked, and `service_role` owns the server-side mutation surface. Every new table/function migration must grant its intended role in the same file; RLS and SQL privileges are two independent controls.
- Provider credentials: read-only Admin keys, **encrypted at rest**, never in plaintext/logs, rotatable/revocable. `service_role` key only in server-side env (never `NEXT_PUBLIC_`).
- Stores **metadata only** (counts, cost, model, key/user id, date). **Never prompts/responses** — structural consequence of having no proxy.
- RBAC: Admin / Viewer + "who can see names" toggle (Admin-only default) + "store per-person data" toggle (LGPD data minimization).
- **Administrative actions leave a trail** (`audit_log`, issue #73): append-only, tenant-scoped, readable by that tenant's Admins and nobody else — no update or delete path exists in code or in RLS. Actor identity is snapshotted (e-mail on the row), so a departure does not blank the history of what that person did. Contract: [backend.md §8](backend.md).

## 4b. Browser security boundary & CSRF (2026-08-05, issue #60)

HTTP security headers ship in **two layers**, split by what each can do. The request-independent set (HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) is served by `next.config.ts` `headers()`, so it also covers `/_next/static` and the other asset paths the proxy matcher deliberately skips. The **Content-Security-Policy** carries a fresh per-request nonce, so it is built in `lib/security/headers.ts` and applied by `proxy.ts` — on redirects and the cron bypass too, because a header applied on the happy path only is a header an attacker routes around.

The forwarded request headers are built **fresh at each use, never captured once**: Supabase's `setAll` refreshes an expiring session by writing through to `request.cookies`, which *is* `request.headers`, and a snapshot taken before that write forwards the expired cookie to the render — the browser gets the new session while the page it renders reads the old one.

`script-src` carries **no `'unsafe-inline'`**. Two mechanisms replace it: the per-request nonce (set on the *request* headers, which is where Next reads it to stamp its own bootstrap and flight scripts) and a **sha256 hash** for the static no-FOUC theme script, which also runs from the `global-error` Client Component where no nonce can be read. `style-src` keeps `'unsafe-inline'` as the one documented exception: bar geometry (`lib/bars.ts`), Recharts and Next's critical CSS are *attribute* styles, which no nonce or hash can cover. The two directives are not equally dangerous — injected script runs with the page's full authority, injected style can only mislead — so the looseness is confined to where it costs least. `frame-ancestors 'none'` blocks clickjacking.

**A nonce forces per-request rendering.** It only exists for the request Next is answering, so a prerendered route's inline flight scripts ship without one and the strict `script-src` blocks them — the page renders and never hydrates. Every route that would otherwise be prerendered and matters interactively therefore declares `export const dynamic = "force-dynamic"`: the two legal documents, password recovery (whose `useActionState` states die without hydration) and both not-found pages. `app/global-error.tsx` is the one that cannot — route segment config is not read from a Client Component — so it carries no handler that hydration would be needed for; its retry is an anchor that reloads the document. `tests/security-headers.test.ts` guards the list.

`X-Robots-Tag: noindex, nofollow` on every path outside `INDEXABLE_PREFIXES` (`/login`, `/privacidade`, `/termos`): a budget dashboard for a named company must not be indexable, and "there is a login" is not the same as telling a crawler not to try.

**Where CSRF is handled.** This app's entire mutation surface is **server actions** — there is no REST layer and no API route but the two crons — so Next's server-action origin check *is* the CSRF boundary. Next compares the request's `Origin` against the `Host` it was served on and rejects a mismatch, which already covers the production deployment where both are the same host. `experimental.serverActions.allowedOrigins` in `next.config.ts` is the deliberate statement of which **other** origins may post: today only the production alias, so a preview deployment can never drive a mutation against production. It grows when the real domain lands (#56).

## 5. Data flow (ingestion → decision)

1. **Ingest** (daily cron + on-connect sync): each connector implements `UsageProvider`, returning canonical usage/cost payloads. Buckets are **daily, UTC**.
2. **Normalize** into `usage_daily` / `cost_daily`; derive money from tokens × `model_price` (versioned, append-only) where the provider doesn't give $ at the needed grain. Unknown model → **"uncosted"**, never dropped.
3. **Attribute**: key/project/workspace → team; per-person only where per-person keys/user ids exist; anything unmappable → **Unattributed** bucket. Invariant: **org total = Σ teams + Unattributed**.
4. **Reconcile**: derived cost vs provider Costs total at the shared grain; drift beyond tolerance → data-quality notice.
5. **Engine** (pure functions): spend vs budget, **projected margin**, behavior-aware intra-period close (Forecast v2 over the run-rate baseline) with **day-5 guard**, threshold crossings, top drivers, **verdict** (green/amber/red + one deterministic sentence).
6. **Findings**: `budget_threshold` (warnings), `apontamento` (calm observations), `seats_vs_roster` (secondary waste). Stateless — no user-facing status. The non-actionable apontamento/seat-waste rules remain in the domain, but are not assembled or rendered by Home while their final placement is reconsidered.
7. **Notify**: event alert once per (team, threshold-level, period), escalation-only re-fire, via `notification_log`; weekly digest to Admins (opt-out). Numbers injected into narration; the LLM never computes.
8. **Close** (#94, same daily cron, after the sync and the alerts): once a month has ended, freeze it into `period_snapshot` — one row per `(tenant, period_month)`, so a repeat run creates nothing. **Freezing, not recomputing**: `subscription` has no period column (seat count and unit price are current state, mutated in place), so a past month recomputed later would be priced with today's seat configuration. The report layer reads the frozen row and never live spend.

## 6. Conceptual data model

See the full table in [prd.md → Data & security](prd.md). Entities: `tenant`, `user`, `employee`, `team` (+ implicit Unattributed), `provider_connection`, `subscription` (daily accrual), `usage_daily`, `cost_daily`, `budget` (thresholds + frozen FX), `model_price` (append-only), `finding`, `notification_log`, `invitation`, `audit_log` (append-only, Admin-read), `period_snapshot` (the frozen closed month — team aggregates only, never a person, so it cannot become the back door around the privacy switches).

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
| CI | An **ephemeral** Supabase stack raised by `supabase start` inside the job (`supabase/config.toml`, issue #78), with every migration applied from scratch. Lives for one run; keys are read back from the stack, never written down |
| Production | Vercel project linked to repo; Supabase project; secrets as Vercel env vars |

MVP runs on free tiers; DB/secret rigor from day one. Move off free tier at first paying customer.

## 9. Testing strategy (summary)

Nine seams, detailed in [prd.md → Testing Decisions](prd.md). The pattern: **fake provider injection** for ingestion; **pure-function tests** for engine/findings/planning; **RLS isolation** integration test (tenant A cannot read tenant B — the most critical due-diligence test); RBAC/privacy; HTTP seam with transactional rollback.

**Where the database-backed suites run (issue #78).** `rls-isolation`, `roster-import`, `rbac-privacy` and `rate-limit` need a real Postgres + Auth + PostgREST, so the quality gate raises one: `supabase start` applies `supabase/migrations` from zero, in order — which is also the only check that the migrations still apply cleanly from scratch. `supabase/config.toml` turns off every service the product does not use (Realtime, Storage, Studio, edge functions, log ingestion, the local SMTP catcher) and raises the auth sign-in rate limit, because the isolation fixtures sign in repeatedly from one IP.

**A skipped database suite is a failure in CI.** These suites were written to self-skip when the env is absent, and CI gave them no env — so the single most important test in the repo never ran, and the green check said otherwise. `tests/support/db.ts` now gates them: quiet skip locally (the pure suites must stay runnable with no infrastructure), and with `DENARIUS_REQUIRE_DB_TESTS=1` a skip registers a **failing** test instead. Same for an individual table whose migration is missing — an unverified table is an unverified isolation claim.

## 10. Dependency & supply-chain policy (2026-08-05, issue #76)

Every dependency is due-diligence surface. The policy is enforced in the pipeline, not by convention.

**Install from the lockfile, everywhere.** CI installs with `npm ci`, and Vercel does too (`installCommand` in `vercel.json`). Both matter: `npm ci` in CI alone would still let Vercel resolve a fresh tree at build time, so what a reviewer approved and what production runs would be different trees.

**One gate, two consumers.** `.github/workflows/quality.yml` (install → audit → lint → typecheck → **database** → test → **build**) is a `workflow_call` reused by `ci.yml` (pull requests) and `deploy-prod.yml` (push to `main`, which deploys). Deploy runs behind `needs: quality`. Duplicating the gate would let the PR side and the deploy side drift apart — and it is why giving CI a database (#78) also gave the deploy one, with no second place to keep in sync.

**Why `next build` is in the gate.** Lint, typecheck and vitest all pass on code the Next compiler rejects — a `"use server"` module may export nothing but async functions, and one exported constant makes the compiler drop *every* export in the file. That reached `main` green and failed at deploy (PR #105). Without the build step, the production deploy is the first place such a failure appears. The build needs no secrets: every page is dynamic, so it compiles with no env vars present.

**Audit threshold: high.** `npm audit --audit-level=high` fails the build; moderate and low are reported without failing. **No exception is accepted today** — the tree audits clean (0 advisories as of 2026-08-05). An advisory published against a dependency will therefore block `main` with no code change; that is the intended behaviour. Clearing it means bumping the dependency, or — if no fix exists — an entry in this section stating the advisory, why the risk is accepted, and the date, added in the same PR as the workflow change that skips it.

**Actions pinned to commit SHAs.** `actions/checkout` and `actions/setup-node` are pinned to SHAs with the version in a trailing comment. A tag is mutable; `@v4` means "whatever that tag points at today".

**Dependabot** (`.github/dependabot.yml`) runs weekly on Mondays for both `npm` and `github-actions` — the second is what keeps the SHA pins from rotting. Minor and patch updates are grouped (dev and production separately); majors arrive as individual pull requests. Every Dependabot PR passes through `ci.yml` before it can merge.

**The lockfile is generated on Linux. This is a rule, not a detail.** `deploy-prod.yml` used to justify `npm install` on the grounds that a Windows-generated lockfile could not satisfy `npm ci` on Linux. Tested on 2026-08-05, and **the claim was substantially right** — the diagnosis was just incomplete. npm does record every optional platform variant regardless of host (`oxide-linux-x64-gnu`, `oxide-win32-x64-msvc` and the rest were all present), so the `oxide`/`lightningcss` part of the story was wrong. What npm does *not* do is walk the dependencies of a package it considers uninstallable on the current host. Generated on Windows, the tree reached `@napi-rs/wasm-runtime` and `@img/sharp-wasm32`, both of which depend on `@emnapi/runtime`, and recorded no resolution for it. `npm ci` on `ubuntu-latest` then failed with `Missing: @emnapi/runtime@1.11.3 from lock file`. It is not a pruning quirk that only affects Linux — that lockfile was incomplete on any platform; Linux is simply where it was caught.

No npm flag fixes this from Windows. `--package-lock-only`, a delete-and-regenerate, and `--os=linux --cpu=x64 --libc=glibc` were each tried on 2026-08-05 and each produced the same 849-package file with `@emnapi/runtime` absent. npm has no `supportedArchitectures` (that is pnpm). The committed lockfile was therefore generated by `npm install --package-lock-only` on `ubuntu-latest`: 860 packages, `@emnapi/runtime@1.11.3` present, and the win32/darwin variants all retained. `npm ci` was then confirmed green on **both** `ubuntu-latest` and Windows, so local development is unaffected.

**The consequence to remember:** running `npm install` on Windows can silently re-prune the lockfile and reintroduce the gap. The safety net is that `ci.yml` now runs `npm ci` on every pull request, so a re-pruned lockfile fails in review instead of at deploy. If it happens, do not hand-edit the file — regenerate it on Linux. Nothing about this is Windows' fault or npm's version; assume it recurs.

**Node version.** CI pins Node 22 in `setup-node`; the Vercel project must stay on the same major. Not enforced by `engines` yet.

## 11. Global workspace search

`/search` is a small client interaction island over a Server Action. The action resolves the authenticated membership with `requireSession()` and passes the server-derived tenant and role to independent providers for teams, closed reports, subscriptions and provider connections. Each database query repeats the tenant predicate explicitly and still runs through the signed-in Supabase client under RLS. Admin-only providers are excluded before execution; independent providers run in parallel and a single failure degrades only its category. The browser receives only the common, bounded `SearchResult` projection, never source rows or credentials.
