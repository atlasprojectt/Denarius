import { redirect } from "next/navigation";

// Retired route (Fase 1 da reestruturação triagem/gestão, 2026-07): the team
// drill-down was absorbed into /times as an expandable diagnosis card. Old
// deep links (e-mails, bookmarks) land on the same team, expanded and
// scrolled into view.

export default async function TeamDetailRedirect({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  redirect(`/times?focus=${teamId}`);
}
