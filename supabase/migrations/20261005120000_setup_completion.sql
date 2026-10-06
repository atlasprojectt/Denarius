-- Denarius — guided setup completion (PRD P3, 2026-10-05).
-- Set once, when an Admin finishes or skips through the guided setup at
-- /configuracao. While it is null, Admins are routed into the setup card
-- instead of the cockpit. Steps stay derived from real data (connections,
-- subscriptions, roster, budget); this column only remembers the decision to
-- move on, which a skipped step cannot express.

alter table public.tenant
  add column setup_completed_at timestamptz;

-- Tenants that predate the guided setup already run the cockpit. Never route
-- them back into a first-run flow.
update public.tenant
  set setup_completed_at = created_at;
