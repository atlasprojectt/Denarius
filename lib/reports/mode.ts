export type ReportRenderMode = "screen" | "pdf";

export function reportRenderMode(searchParams: {
  mode?: string;
  pdf?: string;
}): ReportRenderMode {
  if (searchParams.mode === "pdf" || searchParams.pdf === "1") return "pdf";
  return "screen";
}
