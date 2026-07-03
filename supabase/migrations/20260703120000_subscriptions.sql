-- Denarius — issue #14: manual seat subscriptions (day-zero value, no API keys).
-- Registered by hand: tool, seat count, per-seat price, and an owning team OR
-- shared/company-wide (team_id null). Seat cost accrues daily in the engine
-- (price / days-in-period) so a monthly invoice never spikes the day-one pace.
--
-- Currency note (constitution invariant #4): USD-source-of-truth governs
-- provider-REPORTED usage. Manual seats are user-entered in the tenant's own
-- currency, so the amount is stored as given with an explicit `currency` column
-- (defaults to the tenant display currency at insert time via the server action).
-- FX reconciliation against connector spend arrives with the sync pipeline (#17).

create table public.subscription (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant (id) on delete cascade,
  tool text not null,
  seat_count integer not null check (seat_count > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  currency text not null default 'BRL',
  -- null = shared / company-wide → rolls into the Unattributed bucket, keeping
  -- the invariant org_total = Σ team_totals + Unattributed intact (no new node).
  team_id uuid references public.team (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscription_tenant_idx on public.subscription (tenant_id);
create index subscription_team_idx on public.subscription (team_id);

alter table public.subscription enable row level security;

-- Reads: same tenant. Writes stay deny-by-default — CRUD flows through the
-- admin-guarded server actions (lib/subscriptions/actions.ts), mirroring the
-- roster single-edit path. Granular write policies land with RBAC (#23).
create policy subscription_select_same_tenant
  on public.subscription for select
  to authenticated
  using (tenant_id = public.current_tenant_id());
