-- Denarius — issue #15: OpenAI connector (provider connections + usage/cost grain).
-- Four tables:
--   provider_connection  read-only Admin key (encrypted), status, last sync
--   usage_daily          tokens by key/project/user/model, daily UTC buckets
--   cost_daily           dollars by project/line_item, daily UTC buckets
--   model_price          reference price table (versioned, append-only)
-- Writes flow through server-side sync code (service role); clients only read.

-- ---------------------------------------------------------------------------
-- provider_connection
-- The encrypted credential must never reach a browser, even same-tenant:
-- table-level SELECT is revoked and re-granted column by column WITHOUT
-- encrypted_credential. RLS still scopes rows to the tenant.
-- ---------------------------------------------------------------------------

create table public.provider_connection (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant (id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic')),
  encrypted_credential text,
  status text not null default 'active' check (status in ('active', 'error', 'revoked')),
  last_sync_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider)
);

create index provider_connection_tenant_idx on public.provider_connection (tenant_id);

alter table public.provider_connection enable row level security;

revoke select on public.provider_connection from anon, authenticated;
grant select (id, tenant_id, provider, status, last_sync_at, last_sync_error, created_at, updated_at)
  on public.provider_connection to authenticated;

create policy provider_connection_select_same_tenant
  on public.provider_connection for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

-- ---------------------------------------------------------------------------
-- usage_daily — idempotent sync upserts by the natural key
-- (tenant, date, provider, project, key, user, model). Sub-keys default to ''
-- (not null) so the unique constraint really deduplicates: Postgres treats
-- NULLs as distinct, which would let re-syncs silently duplicate rows.
-- derived_cost is null when the model has no price → uncosted, never dropped.
-- ---------------------------------------------------------------------------

create table public.usage_daily (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant (id) on delete cascade,
  date date not null,
  provider text not null check (provider in ('openai', 'anthropic')),
  project_id text not null default '',
  api_key_id text not null default '',
  user_id text not null default '',
  model text not null,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  derived_cost numeric(14, 6),
  uncosted boolean not null default false,
  synced_at timestamptz not null default now(),
  unique (tenant_id, date, provider, project_id, api_key_id, user_id, model)
);

create index usage_daily_tenant_date_idx on public.usage_daily (tenant_id, date);

alter table public.usage_daily enable row level security;

create policy usage_daily_select_same_tenant
  on public.usage_daily for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

-- ---------------------------------------------------------------------------
-- cost_daily — provider-reported dollars (USD source of truth, invariant #4).
-- ---------------------------------------------------------------------------

create table public.cost_daily (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant (id) on delete cascade,
  date date not null,
  provider text not null check (provider in ('openai', 'anthropic')),
  project_id text not null default '',
  line_item text not null default '',
  amount numeric(14, 6) not null,
  currency text not null default 'usd',
  synced_at timestamptz not null default now(),
  unique (tenant_id, date, provider, project_id, line_item)
);

create index cost_daily_tenant_date_idx on public.cost_daily (tenant_id, date);

alter table public.cost_daily enable row level security;

create policy cost_daily_select_same_tenant
  on public.cost_daily for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

-- ---------------------------------------------------------------------------
-- model_price — REFERENCE DATA, deliberately tenant-less.
-- Documented deviation from invariant #1 ("every table has tenant_id"): the
-- PRD data model defines model_price as provider/model/prices/effective_date —
-- public catalog pricing shared by all tenants, containing zero tenant data.
-- RLS is still enabled (read for authenticated, writes only via service role /
-- migrations) so the deny-by-default posture holds.
-- Prices are USD per 1M tokens. Append-only: corrections are new rows with a
-- later effective_date, never updates — the history stays auditable.
-- ---------------------------------------------------------------------------

create table public.model_price (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('openai', 'anthropic')),
  model text not null,
  input_price_per_1m numeric(12, 6) not null,
  output_price_per_1m numeric(12, 6) not null,
  effective_date date not null,
  created_at timestamptz not null default now(),
  unique (provider, model, effective_date)
);

alter table public.model_price enable row level security;

create policy model_price_select_authenticated
  on public.model_price for select
  to authenticated
  using (true);

-- Seed: OpenAI list prices (USD per 1M tokens). Corrections append new rows.
insert into public.model_price (provider, model, input_price_per_1m, output_price_per_1m, effective_date) values
  ('openai', 'gpt-4o',       2.50, 10.00, '2026-01-01'),
  ('openai', 'gpt-4o-mini',  0.15,  0.60, '2026-01-01'),
  ('openai', 'gpt-4.1',      2.00,  8.00, '2026-01-01'),
  ('openai', 'gpt-4.1-mini', 0.40,  1.60, '2026-01-01'),
  ('openai', 'gpt-4.1-nano', 0.10,  0.40, '2026-01-01'),
  ('openai', 'gpt-5',        1.25, 10.00, '2026-01-01'),
  ('openai', 'gpt-5-mini',   0.25,  2.00, '2026-01-01'),
  ('openai', 'gpt-5-nano',   0.05,  0.40, '2026-01-01'),
  ('openai', 'o3',           2.00,  8.00, '2026-01-01'),
  ('openai', 'o4-mini',      1.10,  4.40, '2026-01-01');
