-- Denarius — issue #12: tenancy backbone.
-- tenant / app_user / team, with tenant_id + RLS on EVERY table (constitution invariant #1).
-- Naming note: the PRD's conceptual `user` entity is implemented as `app_user`
-- (`user` is a reserved word in Postgres; auth.users belongs to Supabase Auth).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.tenant (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_currency text not null default 'BRL',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.app_user (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null references public.tenant (id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

create index app_user_tenant_idx on public.app_user (tenant_id);

create table public.team (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant (id) on delete cascade,
  name text not null,
  is_unattributed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create index team_tenant_idx on public.team (tenant_id);

-- ---------------------------------------------------------------------------
-- RLS helper: the tenant of the signed-in user.
-- SECURITY DEFINER so the lookup on app_user does not recurse into its own
-- RLS policy. search_path pinned to public to prevent hijacking.
-- ---------------------------------------------------------------------------

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.app_user where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Row-Level Security.
-- Deny-by-default: enabling RLS with only SELECT policies means all writes
-- from anon/authenticated are rejected. In this slice, every write flows
-- through server actions using the service role (tenant bootstrap). Granular
-- write policies (Admin-only mutations etc.) arrive with RBAC in issue #23.
-- ---------------------------------------------------------------------------

alter table public.tenant enable row level security;
alter table public.app_user enable row level security;
alter table public.team enable row level security;

create policy tenant_select_own
  on public.tenant for select
  to authenticated
  using (id = public.current_tenant_id());

create policy app_user_select_same_tenant
  on public.app_user for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy team_select_same_tenant
  on public.team for select
  to authenticated
  using (tenant_id = public.current_tenant_id());
