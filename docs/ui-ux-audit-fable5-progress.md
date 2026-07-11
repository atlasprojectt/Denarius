# UI/UX Audit — Fable 5 execution progress (handoff)

> Live status of the Fable 5 work package defined in `ui-ux-audit-fable5-plan.md`.
> Last updated: 2026-07-11. Branch: `codex/ui-ux-audit`.

## Where the work stands

| WP | Scope | Status |
|---|---|---|
| WP1 | Financial contract + cross-screen reconciliation (S1/QA-03/UX-01) | **Done** |
| WP2 | Sync/freshness propagation (QA-02) | **Done** |
| WP3 | Simulator break-even + team/company outcomes (QA-10/QA-04) | **Done** |
| WP4 | Attribution controlled form state (QA-11/UX-16) | **Done** (verified in browser) |
| WP5 | Hydration/theme diagnosis (QA-01) | **Done** (clean-browser: zero errors; QA-01 was the auditor's extension — QA-01b) |
| WP6 | Unified validation + destructive-action safety (S2/QA-05/QA-06) | **Done** |
| WP7 | Budget batch-edit + roster/subscription contracts (UX-09/UX-14) | Engine + actions done; batch-edit UI wiring is GPT-5.6's surface |
| WP8 | Fixtures + regression suite | Unit/integration done; RLS suite unchanged (no new tables) |
| WP9 | Docs reconciliation (backend.md/architecture.md/frontend.md) | **Done** |

## Key deliverables (Fable 5 owns the arithmetic/contracts)

- `lib/engine/money-model.ts` — the money display contract: `periodFx` (ONE frozen
  rate per tenant/period), `usdDisplay` (BRL-primary + USD original), `costBridge`
  (governed = seats + API×fx). Consumed by Home, Explore, team detail, attribution,
  and the notification snapshot. `components/domain/usd-value.tsx` renders it.
- `lib/engine/scenario.ts` — rewritten: `simulatePace` returns SEPARATE team/company
  `ScopeOutcome`s; `breakEvenDelta` targets the TEAM budget; drawer applies the exact
  delta (no rounding drift). `components/domain/simulate-drawer.tsx` shows both outcomes.
- `lib/attribution/draft.ts` — controlled draft/baseline; baseline advances only to the
  server-confirmed `saved` payload (`saveProjectMap` now returns it). Prevents stale
  props overwriting a confirmed selection (QA-11).
- Revalidation rule: every spend-affecting action → `revalidatePath("/", "layout")`.
- `lib/validation.ts` — `fieldErrorsOf`, localized `moneyInput`; destructive actions
  idempotent + tenant-scoped + role-checked. `removeEmployee` + editable e-mail added.
- `lib/budgets/actions.ts` — `saveBudgetsBatch` (all-or-nothing validation, one shared
  FX capture for new rows, documented partial-failure report).

## Tests added

`tests/money-model.test.ts`, `tests/sync-propagation.test.ts`, `tests/scenario.test.ts`
(rewritten), `tests/attribution-draft.test.ts`, `tests/validation-contracts.test.ts`,
`tests/destructive-actions.test.ts`, `tests/budget-batch.test.ts`. Full suite green.

## Browser QA done (temp tenant "QA Fable5 Audit")

Login → onboarding → connect both fake providers (sync coherent: OpenAI US$128,15,
Anthropic US$194,15) → roster CSV import (5 people, Editar/Remover controls present) →
attribution: Save disabled when clean (UX-16 ✓), enabled on change. **Found + fixed:**
the responsive attribution form renders each row twice (mobile cards + desktop table),
so `saveProjectMap` received duplicate upsert rows → Postgres "cannot affect row a
second time" → "Não foi possível salvar". Fix: de-dup `project` keys in the action
(`lib/attribution/actions.ts`). Re-verify the save lands and the selector holds after
reload before closing WP4/WP8.

## Closed out (2026-07-11, same day)

1. ✅ Attribution save re-verified after the de-dup fix: change → save → persisted →
   reload shows the confirmed teams → Save disabled (clean). QA-11 journey complete.
2. ✅ Home full-width: `PageContainer` gained `variant="full"` (`max-w-none`), applied
   to both Home states; DOM-verified at 979px and 1600px (container = main − gutters).
3. ✅ QA temp tenant `QA Fable5 Audit (temp)` + auth user deleted from the shared
   Supabase (verified single-user before cascade delete).
4. ✅ lint + typecheck + full suite green (275 tests, 36 files) — also fixed 6 lint
   errors blocking the deploy gate (2 in the attribution form effects → render-adjust
   pattern; 3 in ExploreTable's render-time SortButton → hoisted; 1 in
   ConfirmationDialog's success effect → render-adjust).
5. Pushed to `main` → auto-deploy via `.github/workflows/deploy-prod.yml`.
