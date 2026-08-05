-- Denarius — issue #61: rate limiting on the invitation paths.
--
-- Scope: what Supabase cannot do for us. Sign-in, sign-up and OTP resend are
-- limited by Supabase Auth's own configuration (#59); a second limiter in front
-- of those would duplicate a rule and double the places a future change has to
-- reach. What Supabase has no view of is the invitation surface:
--   * acceptance — /convite/[token] is public by design and takes a credential
--     in the path, so it is brute-forceable in principle and, unthrottled, is a
--     cheap way to make every request hit the database;
--   * creation — an Admin can otherwise mint unlimited invitations, each one an
--     e-mail leaving the product's verified domain to an address of their
--     choosing. That is a spam vector attached to the sending reputation #64
--     is about to establish.
--
-- Mechanism: a table and a function, on infrastructure the project already has.
-- The limit must survive across serverless invocations, so in-process memory is
-- out — but that does not mean Redis. At MVP volume a KV dependency earns
-- nothing and costs due-diligence surface (constitution §8).

create table public.rate_limit_hit (
  id bigserial primary key,
  -- Opaque scope key built by lib/auth/rate-limit.ts, e.g.
  -- "invite:create:<hash of the tenant id>" or "invite:accept:<hash of the ip>".
  -- NEVER a raw IP, tenant id, e-mail or token — EVERY subject is hashed before
  -- it gets here, so this table cannot become a log of who tried what, nor of
  -- which tenants exist and how busy each one is (constitution §14).
  bucket text not null,
  at timestamptz not null default now()
);

-- The only access pattern: count one bucket's hits inside a window, newest
-- first, then delete what has aged out.
create index rate_limit_hit_bucket_at_idx
  on public.rate_limit_hit (bucket, at desc);

-- ---------------------------------------------------------------------------
-- RLS on, deliberately NO policies — same posture as notification_log: this is
-- system state, never user-facing, reachable only by the service role from a
-- server action. A browser session sees nothing, its own tenant included.
-- ---------------------------------------------------------------------------
alter table public.rate_limit_hit enable row level security;

-- ---------------------------------------------------------------------------
-- Take one slot from a bucket. Returns true when the caller may proceed.
--
-- The advisory lock is the whole correctness argument, and writing it as one
-- clever statement instead would NOT have replaced it: under Postgres' default
-- read-committed isolation both callers read the same snapshot, neither sees
-- the other's uncommitted insert, and both conclude they are under the limit.
-- A limiter with that race is decorative. So callers on the same bucket are
-- serialized here — and only on the same bucket, so unrelated tenants never
-- wait on each other. The lock is transaction-scoped, and PostgREST runs each
-- call in its own transaction, so it is always released.
-- ---------------------------------------------------------------------------
create or replace function public.rate_limit_take(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_hits integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'rate_limit_take: limit and window must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_bucket));

  v_window_start := now() - make_interval(secs => p_window_seconds);

  -- Opportunistic pruning first: it keeps the table from growing without a
  -- cron, and it is what makes the count below cheap. Tied to the bucket being
  -- used, so an idle system pays nothing.
  delete from public.rate_limit_hit
   where bucket = p_bucket
     and at <= v_window_start;

  select count(*) into v_hits
    from public.rate_limit_hit
   where bucket = p_bucket
     and at > v_window_start;

  if v_hits >= p_limit then
    -- A refused attempt records nothing, or the window would never reopen for
    -- someone retrying politely.
    return false;
  end if;

  insert into public.rate_limit_hit (bucket) values (p_bucket);
  return true;
end;
$$;

-- Server actions reach this on the service role only. Revoking the default
-- grant keeps a browser session from spending someone else's budget — a session
-- that could burn slots could lock a tenant's own Admins out of inviting anyone.
revoke all on function public.rate_limit_take(text, integer, integer) from public;
revoke all on function public.rate_limit_take(text, integer, integer) from anon;
revoke all on function public.rate_limit_take(text, integer, integer) from authenticated;

-- Granted back explicitly rather than left to inherit from PUBLIC, which the
-- line above just removed. The application fails OPEN when this call errors —
-- a limiter must not lock customers out of their own product — so a missing
-- grant here would turn the whole feature into a silent no-op.
grant execute on function public.rate_limit_take(text, integer, integer) to service_role;
