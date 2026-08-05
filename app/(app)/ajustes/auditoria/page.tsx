import { notFound } from "next/navigation";
import { RiFileList3Line } from "@remixicon/react";

import { EmptyState } from "@/components/domain/empty-state";
import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { AUDIT_PAGE_SIZE, listAuditEntries } from "@/lib/audit/queries";
import { currentRole } from "@/lib/auth/session";
import { absoluteStamp } from "@/lib/format";
import { canEditCompanySettings } from "@/lib/settings/account";
import { listTeams } from "@/lib/teams/queries";

import { ACTION_LABEL, copy } from "./copy";

export default async function AuditSettingsPage() {
  const role = await currentRole();
  // Not a display gate: the trail names people and what they did, so a Viewer
  // must not reach the screen at all. The RLS policy says the same thing at the
  // data layer — this is the second lock, not the only one (issue #73).
  if (!canEditCompanySettings(role ?? "viewer")) notFound();

  const [entries, teams] = await Promise.all([listAuditEntries(), listTeams()]);
  // Budget targets are stored as team ids (the write path has no name in hand
  // and must not pay for one); the read path already lists teams.
  const teamName = new Map(teams.map((team) => [team.id, team.name]));

  return (
    <PageContainer variant="settings" className="gap-6">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        backHref="/ajustes"
        backLabel={copy.back}
      />

      <Card>
        <CardHeader>
          <CardTitle>{copy.cardTitle}</CardTitle>
          <CardDescription>{copy.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {entries.length === 0 ? (
            <EmptyState
              icon={<RiFileList3Line />}
              title={copy.emptyTitle}
              description={copy.emptyDescription}
            />
          ) : (
            <>
              <ItemGroup className="gap-2">
                {entries.map((entry) => {
                  const target =
                    entry.target === null
                      ? null
                      : teamName.get(entry.target) ?? entry.target;
                  return (
                    <Item key={entry.id} variant="outline">
                      <ItemContent>
                        <ItemTitle>
                          {ACTION_LABEL[entry.action] ?? entry.action}
                          {target && (
                            <span className="text-xs font-normal text-muted-foreground">
                              {target}
                            </span>
                          )}
                        </ItemTitle>
                        <ItemDescription>{entry.actorEmail}</ItemDescription>
                      </ItemContent>
                      <time
                        dateTime={entry.createdAt}
                        className="text-xs text-muted-foreground tabular-nums"
                      >
                        {absoluteStamp(entry.createdAt)}
                      </time>
                    </Item>
                  );
                })}
              </ItemGroup>
              {entries.length === AUDIT_PAGE_SIZE && (
                <p className="text-xs text-muted-foreground">
                  {copy.limitNote(AUDIT_PAGE_SIZE)}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
