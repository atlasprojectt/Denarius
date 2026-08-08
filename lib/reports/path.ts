/** The on-demand report of the running month — live by definition. */
export const LIVE_REPORT_PATH = "/relatorios/agora";

/**
 * True for the FROZEN report surfaces, where the app shell skips its live
 * cockpit and freshness reads so a historical artifact can never silently mix
 * current-month state into itself.
 *
 * `/relatorios/agora` is deliberately excluded: it describes right now, so the
 * stale-sync banner and the verdict in the chrome are exactly what it should be
 * showing beside itself.
 */
export function isReportPath(pathname: string | null): boolean {
  if (pathname === null) return false;
  if (pathname === LIVE_REPORT_PATH) return false;
  return pathname === "/relatorios" || pathname.startsWith("/relatorios/");
}
