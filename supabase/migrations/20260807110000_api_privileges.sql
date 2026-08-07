-- Denarius — issue #78: make Data API privileges explicit before feature tables opt in.
--
-- Older hosted Supabase projects auto-granted new public tables to the API
-- roles. New local stacks do not, so the RLS suite correctly exposed that the
-- schema depended on an environment default which is being retired. RLS and
-- table privileges are separate controls: a role needs both the table grant
-- and a matching policy.

grant usage on schema public to anon, authenticated, service_role;

-- Browser sessions never mutate a table directly. Server actions use the
-- service role; the one intentional authenticated write path is the
-- security-definer roster_import function below.
revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;

grant select on table
  public.tenant,
  public.app_user,
  public.team,
  public.employee,
  public.subscription,
  public.usage_daily,
  public.cost_daily,
  public.model_price,
  public.project_map,
  public.budget,
  public.invitation,
  public.audit_log
to authenticated;

-- The ciphertext is deliberately absent. A same-tenant Admin may inspect the
-- connection state, never the provider credential (#15).
grant select (
  id,
  tenant_id,
  provider,
  status,
  last_sync_at,
  last_sync_error,
  created_at,
  updated_at
) on public.provider_connection to authenticated;

-- notification_log and rate_limit_hit intentionally receive no browser grant:
-- both are system state and have no user-facing read path.

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- Keep future migrations deny-by-default too. Each one must opt its browser
-- read/RPC surface in explicitly, while the server role remains usable by
-- server actions and cron jobs without dashboard-side grants.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  grant all on tables to service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public
  grant execute on functions to service_role;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Replace
-- that implicit surface with the exact call graph the application uses.
revoke all on function public.current_tenant_id() from public, anon, authenticated;
revoke all on function public.current_user_is_admin() from public, anon, authenticated;
revoke all on function public.roster_import(jsonb) from public, anon, authenticated;
revoke all on function public.rate_limit_take(text, integer, integer)
  from public, anon, authenticated;

grant execute on function public.current_tenant_id() to authenticated, service_role;
grant execute on function public.current_user_is_admin() to authenticated, service_role;
grant execute on function public.roster_import(jsonb) to authenticated, service_role;
grant execute on function public.rate_limit_take(text, integer, integer) to service_role;
