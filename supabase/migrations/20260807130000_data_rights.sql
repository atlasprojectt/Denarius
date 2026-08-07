-- Denarius — issue #74: the one system-state slice required by a tenant export.
--
-- notification_log deliberately has no SELECT policy: it is anti-fatigue
-- system state, never a product status surface. LGPD export still has to carry
-- it. This narrow SECURITY DEFINER function exposes only the signed-in Admin's
-- tenant, in bounded pages, without turning the table into a browser-readable
-- screen or accepting a tenant id from the caller.

create or replace function public.export_notification_log_page(
  page_offset integer default 0,
  page_limit integer default 500
)
returns table (
  id uuid,
  tenant_id uuid,
  channel text,
  target_id text,
  level text,
  period_month date,
  sent_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
begin
  if not public.current_user_is_admin() then
    raise exception 'export_notification_log_page: admin role required'
      using errcode = '42501';
  end if;

  v_tenant := public.current_tenant_id();
  if v_tenant is null then
    raise exception 'export_notification_log_page: tenant required'
      using errcode = '42501';
  end if;

  return query
  select
    log.id,
    log.tenant_id,
    log.channel,
    log.target_id,
    log.level,
    log.period_month,
    log.sent_at
  from public.notification_log as log
  where log.tenant_id = v_tenant
  order by log.id
  offset greatest(coalesce(page_offset, 0), 0)
  limit least(greatest(coalesce(page_limit, 500), 1), 1000);
end;
$$;

revoke all on function public.export_notification_log_page(integer, integer)
  from public, anon;
grant execute on function public.export_notification_log_page(integer, integer)
  to authenticated, service_role;
