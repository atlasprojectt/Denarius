-- Denarius — issue #20: notifications.
-- notification_log backs the anti-fatigue rule (PRD P11): one event alert per
-- (target, threshold-level, period); escalation to a higher level re-fires;
-- resets next period. It is SYSTEM state only — never user-facing status, and
-- never reset by budget edits (invariant #6).

-- Weekly digest is default-on for Admins with a per-user opt-out (PRD story 53).
alter table public.app_user
  add column digest_opt_out boolean not null default false;

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant (id) on delete cascade,
  channel text not null default 'email',
  -- 'org' for the org budget, or the team uuid as text. Together with level +
  -- period_month this is the PRD's conceptual finding_key.
  target_id text not null,
  level text not null check (level in ('warning', 'projected_breach', 'breach')),
  period_month date not null,
  sent_at timestamptz not null default now(),
  unique (tenant_id, channel, target_id, level, period_month)
);

create index notification_log_tenant_idx
  on public.notification_log (tenant_id);

-- RLS on, deliberately NO policies: the log is system state (PRD P11 — "never
-- user-facing"). Only the service role (cron) reads and writes it; browser
-- sessions see nothing, cross-tenant or otherwise.
alter table public.notification_log enable row level security;
