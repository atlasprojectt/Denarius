# Denarius current state and documentation audit

Reviewed on 2026-10-04 against the local working tree. This includes uncommitted search changes. This review describes repository behavior; it does not verify production secrets, hosted migrations, email delivery, or current GitHub issue status.

## Implemented capabilities

| Area | Current implementation |
|---|---|
| Account | Supabase email/password and Google flows, signup confirmation, recovery, password change, company onboarding, Admin and Viewer memberships, invitations |
| Setup | Guided first-run setup at `/configuracao` (company → spend sources via APIs or manual subscriptions → roster → budget, every step skippable, welcome dialog on finish); roster CSV with atomic import, employee edits and removal, manual subscriptions, provider connections, project/workspace mapping, monthly company and team budgets |
| Home | Greeting and budget status, deterministic executive summary, spend against budget, provider/seat composition, monthly cumulative chart, budgeted-team table, cold-start prompt when no budget exists |
| Investigation | Team index and dedicated diagnosis, contextual contributors for Admins, curated control plans, single-lever remaining-pace simulation |
| Composition | Model and fixed-cost views, reconciliation and uncosted disclosures, model-cost comparison and current-period usage economics |
| Reports | On-demand current-month document, closed-month snapshots, preview dialog, browser printing, authenticated PDF downloads |
| Administration | Company settings, privacy switches, users and invitations, append-only audit log, tenant JSON export, verified company deletion or Viewer departure |
| Personal preferences | Display name, private profile avatar (hover to change), password change by e-mailed code, browser theme, Admin weekly-digest preference |
| Help and support | "Ajuda e suporte" in the account menu opens `/suporte`, which redirects to a pre-addressed Gmail compose window for help and bug reports |
| Search | Sidebar modal with `Ctrl+P`, route and tenant-resource results, browser-only recent queries; local changes add company, employee, user, and budget providers |
| Operations | Daily sync, budget-alert delivery, weekly digest, closing/backfill job, structured logs, security headers, credential rotation, database-backed CI gate |

The original v1 build sequence is historical. Present routes and contracts are documented in [frontend.md](frontend.md), [backend.md](backend.md), and [architecture.md](architecture.md).

## Limits visible in the code

- Operational views use the current calendar month. Story 43's rolling 30/90-day filters are not implemented.
- The org Home forecast uses Forecast v2 when a daily series exists. Team evaluations and notification snapshots currently use linear run-rate. A shared function alone does not make these projections equal.
- Apontamento and seat-waste rules exist as pure modules. Home does not assemble their feeds or render a separate Next actions list.
- Team API costs are token-derived; the org API headline is provider-reported. Team totals reconcile to the derived total, while the difference against the reported total is disclosed separately.
- FX is captured on the first budget save for a period, retained on edits, and resolved through `periodFx()`. There is no day-1 historical-rate capture job.
- Audit retention is stated as 24 months, but there is no purge job.
- An automatic month close captures the subscription configuration available when the job runs. Older backfills mark seats unavailable; there is no historical subscription ledger.

## Conflicts requiring an explicit decision or code correction

These findings remain open. Updating documentation does not approve a change to the product or security rules.

| Finding | Evidence and consequence |
|---|---|
| Split privileged databases | RSC reads use Supabase. Subscription, attribution, employee-edit, rate-limit, and closed-snapshot paths use `lib/db/admin.ts` with `NEON_BACKEND_DATABASE_URL`. Provider sync, budgets, audit, invitations, and notifications use Supabase adapters. No replication or hosted Neon schema deployment is defined in the repo. Writes and reads can address different stores. |
| Alert severity order | PRD P11 states warning → realized breach → projected breach. `lib/engine/thresholds.ts` ranks warning → projected breach → realized breach. The previously flagged founder decision remains unresolved. |
| Forecast consistency | `lib/home/queries.ts` supplies `dailySpend`; `lib/notify/snapshot.ts` does not. Home and email may show different projected closes and margins from the same realized totals. |
| Names in expanded search | The local employee and user providers are Admin-only but do not check `tenant.show_names`. The documentation must not claim that the names switch is enforced in those results. |
| Chart contract | Recharts is used for cumulative time-series views on Home, team diagnosis, and the scenario drawer. Budget and pacing bars remain CSS. The next visual pass may change presentation without changing the data contract. |
| Missing FX and verdict | `combinedSpend()` returns seat-only display spend plus separate USD when FX is absent. The live cockpit still evaluates that partial display amount; closed reports withhold their verdict. This needs review against "honest numbers or no numbers". |
| Margin sign against signed differences | Since 2026-10-05 the team index and Home team table show `Projeção X orçamento: +R$ 1.200,00` (`+` = above the budget). Team diagnosis still shows "Margem projetada" as budget − projection (PRD story 28), so the same overrun reads `-R$ 1.200,00` there, and its conclusion keeps words to avoid two signs for one fact in one card. One convention needs a founder decision. |

## Documentation changes in this review

The docs now distinguish shipped code, remaining limits, and operational checks. Obsolete greenfield status, inline Home budget editing, the old collapsed-team Home behavior, a routed search page, Preferences-based company deletion, and the literal "every table has tenant_id" wording have been corrected. The frontend design-system section contains only semantic and accessibility requirements; visual choices are open for the planned UI reformulation.

## Operational evidence still needed

Repository configuration does not prove that an environment is ready. Before launch, verify the hosted migration chain (`20261005120000_setup_completion.sql` was confirmed on the hosted project on 2026-10-06: the column exists and no tenant is left pending; until a migration like it is applied, `lib/db/schema-drift.ts` keeps the pre-migration behavior) and avatar bucket, the destination of every privileged database path, real OpenAI/Anthropic Admin-key sync and reconciliation, cron authorization and execution, Google OAuth and recovery redirects, email delivery, backup/restore, and production/development separation.

CI exercises the Supabase migration chain and its RLS tests. It does not provision Neon or demonstrate that both databases contain the same tenant data. [architecture.md](architecture.md) describes the gate and deployment path.
