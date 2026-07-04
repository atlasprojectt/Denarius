# Denarius — Backend spec

> Derives from [prd.md](prd.md) + [architecture.md](architecture.md). Module-by-module contract for the backend issues (#13–#18, #20–#23).

## 1. Connectors (`lib/connectors/`) — issues #15, #16

One seam, two implementations + one fake:

```ts
interface UsageProvider {
  provider: "openai" | "anthropic";
  testConnection(key: string): Promise<Ok | ProviderError>;
  fetchUsage(range: DateRange): Promise<UsageBucket[]>;   // tokens by key/project|workspace/user/model, daily UTC
  fetchCosts(range: DateRange): Promise<CostBucket[]>;    // $ at provider's native grain
}
```

- **OpenAI:** Usage API (`/v1/organization/usage/completions`) groups by `user_id, api_key_id, project_id, model`; Costs API (`/v1/organization/costs`) groups by `project_id, line_item` only. Needs an org **Admin Key**. Onboarding recommends *one project per team* for exact per-team $.
- **Anthropic:** Admin API usage (`/v1/organizations/usage_report/messages`) groups by `workspace_id, api_key_id, model`; cost report (`/v1/organizations/cost_report`) groups by `workspace_id, description`. Needs an org **Admin key** (`sk-ant-admin…`, sent as `x-api-key` + `anthropic-version`). **No per-user grain** — attribution stops at workspace/key. Onboarding recommends *one workspace per team*. Live validation against a real key still pending (#11).
- Key lifecycle: save (encrypt) → test → rotate → revoke. **Immediate sync on connect** (the "we found $X this month" moment), then daily cron.
- Tests inject `FakeProvider` with canonical payload fixtures; no live calls in CI.
- **OpenAI contract (implemented in #15):** `OpenAIProvider` in `lib/connectors/openai.ts` with an **injectable `fetchFn`** — the fake (`lib/connectors/fake.ts`) replaces `fetch` with canonical Usage/Costs pages (pagination included), so tests and the dev demo exercise the real parsing path. Factory `providerFor()` in `lib/connectors/index.ts` only routes `sk-fake*` keys to the fake when server env `ALLOW_FAKE_PROVIDER=1`. Keys AES-256-GCM-encrypted via `lib/crypto.ts` (`CREDENTIAL_ENCRYPTION_KEY`); the `provider_connection.encrypted_credential` column is excluded from the authenticated column grant, so no browser session can read it. Key lifecycle actions in `lib/providers/actions.ts` (save tests the key BEFORE storing; rotate = upsert; revoke discards the ciphertext). Per-tenant sync unit in `lib/sync/openai-sync.ts` (month-to-date, idempotent upserts by natural keys); derived cost is the pure `deriveCost()` in `lib/engine/derive.ts` (newest price ≤ usage date; no price → `uncosted`). API spend displays in **USD** as reported; frozen-FX conversion arrives with budgets (#18). Project→team attribution arrives with #17 — until then API spend sits in Unattributed, disclosed on screen.
- **Anthropic contract (implemented in #16):** `AnthropicProvider` in `lib/connectors/anthropic.ts`, same injectable-`fetchFn` shape as OpenAI; the fake serves canonical Anthropic pages (RFC 3339 buckets, decimal-string amounts, cursor pagination) through the real parsing path. Seam mapping: `workspace_id → projectId`, `api_key_id → apiKeyId`, `userId = ""` (no user grain). Derived input cost bills **all** input tokens (uncached + cache writes + cache reads) at the base `model_price` rate — cost_report remains the headline truth; reconciliation (#17) discloses the drift. Key lifecycle shares one implementation for both providers (`lib/providers/actions.ts`, thin per-provider server-action wrappers); per-tenant sync generalized to `runProviderSync(tenantId, provider)` in `lib/sync/provider-sync.ts` (replaced `openai-sync.ts` — no provider-specific code in the shared path). Fake key prefix `sk-ant-fake*` behind the same `ALLOW_FAKE_PROVIDER=1` gate. Claude prices seeded in `model_price` with dated model IDs (the usage report returns versioned IDs). Workspace→team attribution arrives with #17 — until then Claude spend sits in Unattributed alongside OpenAI, disclosed on screen.

## 2. Sync & normalization — issue #17

- **Vercel Cron daily** (plus on-demand after connect): pull both providers → upsert `usage_daily` / `cost_daily` (idempotent by natural key `(tenant, date, provider, key/project, model)`).
- Derived cost = tokens × `model_price` (versioned by `effective_date`, append-only; unknown model → **uncosted** flag, never dropped).
- **Reconciliation:** per sync, compare Σ derived cost vs provider Costs total at the shared grain (project/workspace); drift > tolerance → data-quality notice surfaced in UI.
- Freshness: `provider_connection.last_sync` + error; UI stamps "as of <date>" and shows a stale banner (>1 day without success).

## 3. Attribution — issues #13, #14, #17

- Hierarchy: org → team → person → provider/model. Person only where per-person keys / `user_id` exist; shared keys attribute to team/project, never a person.
- Roster CSV (employee, email, team) is identity in v1; re-import matched by email.
- **Roster import contract (implemented in #13):** CSV parsed/validated by the pure function `lib/roster/parse-csv.ts` (delimiter auto-detect `,`/`;`, pt-BR headers, quoted fields, line-numbered errors; zod row schema is the single validation truth). Commit path is the **`roster_import(rows jsonb)` Postgres function** — `security definer`, derives the tenant from `auth.uid()`, enforces the admin role inside, and runs as **one transaction** (a mid-import failure rolls everything back; a file with any error imports nothing). Upserts teams by `(tenant_id, name)` and employees by `(tenant_id, email)`; absent employees are kept (no silent deletions). Direct table writes stay RLS-denied.
- Manual `subscription` seats **accrue daily** (`price ÷ days_in_period`) into team spend.
- **Seats contract (implemented in #14):** `subscription` table (tool, seat_count, unit_price, currency, team_id nullable — `null` = shared/company-wide → Unattributed). CRUD via admin-guarded server actions (`lib/subscriptions/actions.ts`, shared `requireAdmin` in `lib/auth/session.ts`); reads via `lib/subscriptions/queries.ts`. Accrual + attribution are pure functions in `lib/engine/accrual.ts` (`seatAccrual`, `attributeSeats` — `orgTotal` is *defined* as Σ teams + unattributed, so the invariant holds by construction; parts are rounded to cents and the total summed in integer cents, so on-screen numbers reconcile to the cent); period math in `lib/engine/period.ts` (calendar month, UTC). Amounts are stored in the tenant display currency (day-zero manual data — the USD invariant governs provider-reported spend; FX reconciliation arrives with #17).
- **Unattributed** is a first-class bucket. Hard invariant everywhere: `org_total = Σ team_totals + unattributed`.

## 4. Budget & control engine (`lib/engine/`) — issue #18

Pure functions, no I/O. Given `(usage aggregates, budgets, today)`:

| Function | Formula / rule |
|---|---|
| `spent(scope, period)` | Σ usage + seat accrual, in USD then frozen-FX display |
| `projection` | `spent ÷ days_elapsed × days_in_period` (linear run-rate) |
| `projectionGuard` | **no projection before day 5** → UI "collecting pace…"; suppresses projected-breach warnings too |
| `currentMargin` | `budget − spent` (available, de-emphasized in UI) |
| `projectedMargin` | `budget − projection` — **the headline metric** |
| `thresholds` | default 80% / 100% / projected-to-breach; configurable per budget |
| `verdict` | red: any team breached · amber: org projected over · green: projected within — plus one deterministic sentence |
| `topDrivers` | teams/people/models ranked by contribution to spend/delta |
| budget edits mid-period | recompute next sync vs new amount; `notification_log` never resets (sent level never re-fires; higher level does) |
| org vs team budgets | independent guardrails; informational notice if Σ teams ≠ org, never an error |

## 5. Findings & rules (`lib/findings/`) — issues #18, #21, #22

`finding` is **stateless** (no user-facing status). Types:

- `budget_threshold` — crossing detected on sync → numbers + top drivers + **control plan** (actions from a curated rule-mapped catalog; advisory only).
- `apontamento` — below-warning observations: crossed 50% of limit; concentration ("3 teams = 87%"); week-over-week acceleration; unattributed nudge. In-app only, calm, no email.
- `seats_vs_roster` — seats > roster people → estimated savings. Secondary, never emailed.

## 6. Notifications (`lib/notify/`) — issue #20

```ts
interface NotificationChannel { send(msg: RenderedNotification): Promise<void>; }  // resend impl; slack later
```

- **Event alert:** on threshold crossing, **once per (team, level, period)** via `notification_log` (`finding_key = team+level+period`); only escalation to a higher level re-fires; resets next period.
- **Weekly digest:** to Admins (default on, opt-out): total, change, top drivers, budget status, margin, projection. Deep-links land on Home (mobile-legible).

## 7. Narration (`lib/narrate/`) — issues #18, #20

- Haiku 4.5, provider-agnostic client, swappable via env/config.
- **Guardrail (hard):** every figure is computed by the engine and **injected** into the prompt/template; the LLM phrases, never computes or invents actions (actions come from the catalog). Tests assert output contains no non-injected numbers. LLM mocked in CI.

## 8. Auth & RBAC — issues #12, #23

- Supabase Auth (email/password + Google). Signup → tenant + Admin user. Invites with role.
- RLS policies per table on `tenant_id`; Viewer restrictions + names toggle enforced server-side (not just UI).
- "Store per-person data" off → person-grain rows not persisted; aggregates unaffected.

## 9. Env vars (planned)

| Var | Scope |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only (cron crosses tenants) |
| `CREDENTIAL_ENCRYPTION_KEY` | server-only (provider keys at rest) |
| `ANTHROPIC_API_KEY` (narration) · `RESEND_API_KEY` | server-only |
| `CRON_SECRET` | protects the cron route |

## 10. Error handling & data quality

Never block on gaps — disclose them: uncosted models, stale syncs, reconciliation drift, unattributed spend. Every surfaced number must be defensible; if it can't be, show the gap instead of a guess.
