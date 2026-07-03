-- Denarius — issue #13: roster (identity for attribution).
-- employee table (tenant_id + RLS, invariant #1) and an ATOMIC import:
-- roster_import() runs as a single transaction, derives the tenant from
-- auth.uid() and enforces the admin role inside the function — the client
-- never chooses the tenant it writes to.

create table public.employee (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant (id) on delete cascade,
  team_id uuid not null references public.team (id) on delete restrict,
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create index employee_tenant_idx on public.employee (tenant_id);
create index employee_team_idx on public.employee (team_id);

alter table public.employee enable row level security;

-- Reads: same tenant. Writes stay deny-by-default (import goes through the
-- security-definer function below; single edits go through server actions).
create policy employee_select_same_tenant
  on public.employee for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

-- ---------------------------------------------------------------------------
-- Atomic roster import. rows: [{ "name": .., "email": .., "team": .. }, ...]
-- Upsert semantics: teams created if missing; employees matched by
-- (tenant_id, email) — re-imports update name/team, never duplicate.
-- Employees absent from the file are kept (no silent deletions).
-- ---------------------------------------------------------------------------

create or replace function public.roster_import(rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_role text;
  v_teams_created int := 0;
  v_imported int := 0;
begin
  select tenant_id, role into v_tenant, v_role
  from app_user where id = auth.uid();

  if v_tenant is null then
    raise exception 'roster_import: no tenant for current user';
  end if;
  if v_role <> 'admin' then
    raise exception 'roster_import: admin role required';
  end if;
  if rows is null or jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) = 0 then
    raise exception 'roster_import: rows must be a non-empty json array';
  end if;
  if jsonb_array_length(rows) > 2000 then
    raise exception 'roster_import: too many rows (max 2000)';
  end if;

  with wanted as (
    select distinct trim(r->>'team') as name
    from jsonb_array_elements(rows) as r
    where coalesce(trim(r->>'team'), '') <> ''
  ), ins as (
    insert into team (tenant_id, name)
    select v_tenant, w.name from wanted w
    on conflict (tenant_id, name) do nothing
    returning 1
  )
  select count(*) into v_teams_created from ins;

  with data as (
    select trim(r->>'name') as name,
           lower(trim(r->>'email')) as email,
           trim(r->>'team') as team_name
    from jsonb_array_elements(rows) as r
  ), up as (
    insert into employee (tenant_id, team_id, name, email)
    select v_tenant, t.id, d.name, d.email
    from data d
    join team t on t.tenant_id = v_tenant and t.name = d.team_name
    on conflict (tenant_id, email)
    do update set name = excluded.name, team_id = excluded.team_id, updated_at = now()
    returning 1
  )
  select count(*) into v_imported from up;

  return jsonb_build_object('imported', v_imported, 'teams_created', v_teams_created);
end;
$$;

revoke all on function public.roster_import(jsonb) from public;
grant execute on function public.roster_import(jsonb) to authenticated;
