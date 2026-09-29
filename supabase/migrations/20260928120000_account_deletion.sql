-- Denarius — account deletion verification.
--
-- A deletion is an irreversible governance action. The browser never gets a
-- readable row from this table: the server action owns the service-role read,
-- and the row is bound to both the current Auth user and their tenant.

create table public.account_deletion_challenge (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  purpose text not null default 'account_deletion'
    check (purpose = 'account_deletion'),
  role text not null check (role in ('admin', 'viewer')),
  -- The name is snapshotted at request time. A rename between the code and the
  -- final confirmation therefore cannot silently change what gets removed.
  target_name text not null,
  expected_phrase text not null,
  code_hash text not null,
  grant_hash text,
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 5),
  expires_at timestamptz not null,
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint account_deletion_verification_pair check (
    (verified_at is null and grant_hash is null)
    or (verified_at is not null and grant_hash is not null)
  )
);

create index account_deletion_challenge_user_idx
  on public.account_deletion_challenge (user_id, created_at desc);

-- System state only. No browser session may enumerate a challenge, even its
-- own: a challenge id in an httpOnly cookie is just an opaque lookup handle.
alter table public.account_deletion_challenge enable row level security;
revoke all on public.account_deletion_challenge from public;
revoke all on public.account_deletion_challenge from anon, authenticated;
grant all on public.account_deletion_challenge to service_role;
