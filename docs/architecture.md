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

## 5. Data flow (ingestion → decision)

1. **Ingest** (daily cron + on-connect sync): each connector implements `UsageProvider`, returning canonical usage/cost payloads. Buckets are **daily, UTC**.
2. **Normalize** into `usage_daily` / `cost_daily`; derive money from tokens × `model_price` (versioned, append-only) where the provider doesn't give $ at the needed grain. Unknown model → **"uncosted"**, never dropped.
3. **Attribute**: key/project/workspace → team; per-person only where per-person keys/user ids exist; anything unmappable → **Unattributed** bucket. Invariant: **org total = Σ teams + Unattributed**.
4. **Reconcile**: derived cost vs provider Costs total at the shared grain; drift beyond tolerance → data-quality notice.
5. **Engine** (pure functions): spend vs budget, **projected margin**, linear run-rate projection with **day-5 guard**, threshold crossings, top drivers, **verdict** (green/amber/red + one deterministic sentence).
6. **Findings**: `budget_threshold` (warnings), `apontamento` (calm observations), `seats_vs_roster` (secondary waste). Stateless — no user-facing status.
7. **Notify**: event alert once per (team, threshold-level, period), escalation-only re-fire, via `notification_log`; weekly digest to Admins (opt-out). Numbers injected into narration; the LLM never computes.

## 6. Conceptual data model

See the full table in [prd.md → Data & security](prd.md). Entities: `tenant`, `user`, `employee`, `team` (+ implicit Unattributed), `provider_connection`, `subscription` (daily accrual), `usage_daily`, `cost_daily`, `budget` (thresholds + frozen FX), `model_price` (append-only), `finding`, `notification_log`.

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
