-- Denarius — issue #23: privacy & roles controls.
-- Two tenant-level trust switches that keep the product "control, not
-- surveillance" and LGPD-serviceable. Typed boolean columns (not buried in the
-- settings jsonb) so the policy is auditable and greppable.

alter table public.tenant
  -- "Who can see individual names" — Admin-only by default (Viewers never see
  -- names regardless; when this is false, names are hidden even for Admins).
  add column show_names boolean not null default true,
  -- Data minimization (PRD story 55): off → the daily sync collapses
  -- person-grain usage to the team/project before persisting. On by default.
  add column store_per_person boolean not null default true;

-- RLS is unchanged: the tenant row is already select-own (init_tenancy), and
-- writes flow through admin server actions via the service role. These flags
-- gate DISPLAY (names) and INGESTION (person grain), not row visibility.
