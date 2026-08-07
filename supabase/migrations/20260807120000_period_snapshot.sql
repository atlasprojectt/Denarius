-- Denarius — issue #94: period_snapshot (the closed month, frozen).
--
-- The app only ever knew the current month. A past month cannot be recomputed
-- truthfully because `subscription` has no period column: seat count and unit
-- price are current state, mutated in place, so recomputing June today would
-- price it with today's seat configuration — a past that never happened
-- (principle #3, "honest numbers or no numbers"). Everything else survives
-- (cost_daily is never deleted, usage_daily only rewrites the current-month
-- slice, budget rows are keyed by period_month), so the month is captured
-- WHILE IT IS STILL TRUE and the report reads the frozen row, never live spend.
--
-- The snapshot carries TEAM AGGREGATES ONLY, never a person: a frozen artifact
-- must not become the back door around tenant.show_names / store_per_person.

create table public.period_snapshot (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant (id) on delete cascade,
  -- First day of the closed month, UTC.
  period_month date not null,
  closed_at timestamptz not null default now(),
  -- 'auto': closed by the daily cron the month after. 'backfill': reconstructed
  -- later from what survived, with the seat half disclosed as unavailable.
  source text not null default 'auto' check (source in ('auto', 'backfill')),

  -- Money, as the month ended. Nullable where the value could not be
  -- established honestly (missing FX, or a backfill with no seat state) — a
  -- disclosed gap, never a zero standing in for an unknown.
  currency text not null default 'BRL',
  api_usd numeric(14, 6) not null default 0,
  seats_amount numeric(14, 2),
  combined_amount numeric(14, 2),
  budget_amount numeric(14, 2),
  pct_spent numeric(10, 6),

  -- The FX triple frozen with the month, same shape as budget's (invariant #4).
  frozen_fx_rate numeric(18, 8),
  fx_rate_source text,
  fx_rate_date date,

  -- The deterministic verdict as it stood at close. Null when the month had no
  -- org budget: there was no verdict to give, and inventing one would be a lie.
  verdict_status text check (verdict_status in ('green', 'amber', 'red', 'collecting')),
  verdict_sentence text,

  -- Teams, provider mix, top drivers, Unattributed, and the seat configuration
  -- as it stood — the only copy of that state that will ever exist.
  breakdown jsonb not null default '{}'::jsonb,

  -- The month's caveats, frozen WITH its numbers. A report that drops them
  -- claims a certainty the month did not have.
  has_uncosted boolean not null default false,
  reconciliation_ok boolean not null default true,
  fx_missing boolean not null default false,
  stale_sync boolean not null default false,

  -- Closing is idempotent: the daily cron may run many times in the month
  -- after, and a re-run must never create a second row.
  unique (tenant_id, period_month)
);

create index period_snapshot_tenant_period_idx
  on public.period_snapshot (tenant_id, period_month desc);

alter table public.period_snapshot enable row level security;

-- Reads: same tenant, Admins and Viewers alike — a closed month carries no
-- per-person data by construction. Writes have NO policy at all: the snapshot
-- is written only by the cron on the service role, same posture as
-- notification_log. A frozen month that a session could edit would be worthless
-- as documentation.
create policy period_snapshot_select_same_tenant
  on public.period_snapshot for select
  to authenticated
  using (tenant_id = public.current_tenant_id());
