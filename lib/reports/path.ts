export function isReportPath(pathname: string | null): boolean {
  return pathname === "/relatorios" || pathname?.startsWith("/relatorios/") === true;
}
