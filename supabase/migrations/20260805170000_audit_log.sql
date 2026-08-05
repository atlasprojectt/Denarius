-- Denarius — issue #73: audit log for administrative actions.
--
-- Nothing recorded who did what. A budget could be raised, a provider Admin Key
-- revoked, a person removed or the per-person privacy switch turned off with no
-- trace of the actor. For a product whose thesis is governance — and whose exit
-- thesis is a sale that has to survive due diligence — that is the first gap a
-- reviewer asks about.
--
-- Append-only by construction: only a SELECT policy exists, and insert/update/
-- delete are revoked from anon and authenticated outright. Writes come from the
-- admin-guarded server actions on the service role, as every other mutation
-- already does. A log an Admin can edit is not evidence.

-- ---------------------------------------------------------------------------
-- RLS helper: is the signed-in user an Admin of their tenant?
-- SECURITY DEFINER for the same reason current_tenant_id() is: the lookup on
-- app_user must not recurse into that table's own policy. search_path pinned.
-- ---------------------------------------------------------------------------

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.app_user where id = auth.uid()),
    false
  );
$$;

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant (id) on delete cascade,
  -- The actor's row may be deleted (that is what removeUser does), so the id is
  -- allowed to go null while the email stays: a departure must not blank every
  -- action the person ever took, which is exactly the history someone reads
  -- after a departure.
  actor_id uuid references public.app_user (id) on delete set null,
  actor_email text not null,
  -- Typed in TypeScript (lib/audit/log.ts), stored as text on purpose: a check
  -- constraint listing the actions would turn "a new action was added in code"
  -- into a silently dropped entry in production, and the write is deliberately
  -- non-fatal. The application is the only writer and it only accepts the union.
  action text not null,
  -- What was acted on, as a label an Admin of this tenant can already see (an
  -- e-mail, a tool, a provider, a team id, "Empresa"). Never a secret.
  target text,
  -- The auditable substance of the change (amounts before/after, counts, which
  -- switch moved). Redacted at the write seam — no credential, token, password
  -- or key fragment ever reaches this column.
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_tenant_created_idx
  on public.audit_log (tenant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS (invariant #1). Admins of the tenant read their own trail; Viewers read
-- nothing — the log names people and what they did, which is exactly what
-- "control, not surveillance" keeps out of a Viewer's hands.
-- ---------------------------------------------------------------------------

alter table public.audit_log enable row level security;

revoke insert, update, delete on public.audit_log from anon, authenticated;

create policy audit_log_select_admin
  on public.audit_log for select
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_is_admin()
  );
