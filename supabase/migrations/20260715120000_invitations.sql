-- Denarius — user invitations (PRD story #2: "as an Admin, I want to invite
-- colleagues by email and assign a role").
--
-- The tenant + role of an invited person live HERE, server-side, never in auth
-- user metadata: metadata is writable by the user themselves, so trusting it
-- would let an invitee self-assign Admin.
--
-- Only the token's sha256 HASH is stored (security rule: no credential at rest
-- in plaintext). The raw token exists once, in the link handed to the inviting
-- Admin and mailed to the invitee — it cannot be recovered later, only revoked
-- and re-issued.

create table public.invitation (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant (id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'viewer')),
  token_hash text not null unique,
  invited_by uuid references public.app_user (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz
);

create index invitation_tenant_idx on public.invitation (tenant_id);

-- One live invitation per address per tenant: a second "convidar" for the same
-- person must revoke-and-reissue, so two valid links can never coexist.
create unique index invitation_pending_email_idx
  on public.invitation (tenant_id, lower(email))
  where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------------
-- RLS (invariant #1). Reads are tenant-scoped for the Usuários screen; every
-- write flows through admin-guarded server actions on the service role, and
-- acceptance happens BEFORE the invitee has a session at all — so there is
-- deliberately no insert/update policy here.
-- ---------------------------------------------------------------------------

alter table public.invitation enable row level security;

create policy invitation_select_same_tenant
  on public.invitation for select
  to authenticated
  using (tenant_id = public.current_tenant_id());
