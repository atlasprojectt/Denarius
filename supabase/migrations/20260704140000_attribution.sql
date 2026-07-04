-- Denarius — issue #17: project/workspace → team attribution.
-- provider usage lands with a provider-native grain (OpenAI project_id,
-- Anthropic workspace_id, both stored in usage_daily.project_id). project_map
-- pins each of those ids to a people team; anything unmapped rolls into the
-- Unattributed bucket, so the reconciliation invariant (org = Σ teams +
-- Unattributed) holds by construction. Onboarding recommends one project /
-- workspace per team, which makes this a small, hand-curated table.
--
-- Reconciliation and freshness are NOT stored here: both are DERIVED at read
-- time from data already in usage_daily / cost_daily / provider_connection
-- (pure engine functions in lib/engine/reconcile.ts + freshness.ts). Storing a
-- per-sync snapshot would add a table that only ever mirrors those rows — the
-- KISS choice is to recompute the (small, daily) numbers on read.

create table public.project_map (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant (id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic')),
  -- OpenAI project_id or Anthropic workspace_id, exactly as usage_daily stores it.
  project_id text not null check (project_id <> ''),
  team_id uuid not null references public.team (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider, project_id)
);

create index project_map_tenant_idx on public.project_map (tenant_id);
create index project_map_team_idx on public.project_map (team_id);

alter table public.project_map enable row level security;

-- Reads: same tenant. Writes stay deny-by-default — mapping flows through the
-- admin-guarded server action (lib/attribution/actions.ts) using the service
-- role, mirroring subscriptions/providers. Granular write policies land with
-- RBAC (#23).
create policy project_map_select_same_tenant
  on public.project_map for select
  to authenticated
  using (tenant_id = public.current_tenant_id());
