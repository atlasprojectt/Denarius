/**
 * True for the report surfaces, where the app shell skips its live cockpit
 * and freshness reads: the index is a file list (document data loads on open
 * into the preview dialog) and the `[period]`/`agora` pages below it are
 * headless PDF render endpoints, so none of them may mix current-month state
 * into what they show.
 */
export function isReportPath(pathname: string | null): boolean {
  if (pathname === null) return false;
  return pathname === "/relatorios" || pathname.startsWith("/relatorios/");
}
