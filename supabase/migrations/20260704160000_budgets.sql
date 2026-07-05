-- Denarius — issue #18: budgets (the HERO's guardrail).
-- A budget is set per ORG and per TEAM for a period (default: the calendar
-- month). It governs TOTAL tracked spend — API token cost (USD) + manual seat
-- accrual (display currency) — so the verdict/projection/margin engine has a
-- limit to compare against.
--
-- Currency & FX (constitution invariant #4 + PRD P8): the budget `amount` is in
-- the tenant display currency. Provider spend is stored in USD (source of
-- truth); to compare it against the budget it is converted via a FX rate
-- FROZEN at period start (captured on first create for the period, then never
-- moved on mid-period edits) so "spend vs budget" reflects usage change, not
-- dollar swings. The rate + its source/date are stored on the row and disclosed
-- on screen. `frozen_fx_rate` is nullable: FX capture is best-effort, and a
-- seats-only tenant needs no conversion — a missing rate is disclosed, never guessed.

create table public.budget (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant (id) on delete cascade,
  scope text not null check (scope in ('org', 'team')),
  -- null for an org budget; the owning team for a team budget (enforced below).
  team_id uuid references public.team (id) on delete cascade,
  -- First day of the period, UTC (the calendar month in v1).
  period_month date not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'BRL',
  -- Configurable crossing points as fractions of the budget. Default 80% + 100%;
  -- projected-to-breach is implicit (derived from the run-rate projection).
  thresholds numeric(4, 3)[] not null default '{0.800,1.000}',
  -- USD → display currency, frozen at period start. Nullable: best-effort capture.
  frozen_fx_rate numeric(18, 8),
  fx_rate_source text,
  fx_rate_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- org ⇒ no team; team ⇒ a team. The two scopes never blur.
  constraint budget_scope_team check (
    (scope = 'org' and team_id is null) or (scope = 'team' and team_id is not null)
  )
);

create index budget_tenant_period_idx on public.budget (tenant_id, period_month);
create index budget_team_idx on public.budget (team_id);

-- One org budget per tenant per period; one budget per team per period. Partial
-- unique indexes because team_id is null for org rows (a plain composite unique
-- would treat every org row as distinct on the null).
create unique index budget_org_unique
  on public.budget (tenant_id, period_month)
  where scope = 'org';
create unique index budget_team_unique
  on public.budget (tenant_id, team_id, period_month)
  where scope = 'team';

alter table public.budget enable row level security;

-- Reads: same tenant. Writes stay deny-by-default — CRUD flows through the
-- admin-guarded server actions (lib/budgets/actions.ts), mirroring subscriptions
-- and project_map. Granular write policies land with RBAC (#23).
create policy budget_select_same_tenant
  on public.budget for select
  to authenticated
  using (tenant_id = public.current_tenant_id());
