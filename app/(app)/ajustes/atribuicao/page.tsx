import Link from "next/link";
import {
  ChartPieSliceIcon,
  LightbulbIcon,
  LockSimpleIcon,
} from "@phosphor-icons/react/dist/ssr";

import { EmptyState } from "@/components/domain/empty-state";
import { PageHeader } from "@/components/domain/page-header";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { listTeams } from "@/lib/teams/queries";
import { listMappableProjects } from "@/lib/usage/attribution";

import { ProjectMapForm } from "./_components/project-map-form";

const copy = {
  back: "Ajustes",
  title: "Atribuição",
  subtitle:
    "Mapeie cada projeto (OpenAI) ou workspace (Anthropic) para um time. O que ficar sem time cai em Não atribuído.",
  adminOnlyTitle: "Restrito a administradores",
  adminOnlyBody: "Somente administradores podem editar a atribuição.",
  emptyTitle: "Nenhum projeto para mapear ainda",
  emptyBody:
    "Conecte a OpenAI ou a Anthropic e sincronize — os projetos e workspaces com uso neste mês aparecem aqui para você atribuir a um time.",
  connectCta: "Conectar provedores",
  tip: "Dica: um projeto/workspace por time dá o custo por time mais limpo. Anthropic não expõe dados por pessoa — o uso do workspace fica no time, nunca em uma pessoa.",
};

export default async function AttributionPage() {
  const auth = await requireAdmin();
  if (auth.error !== undefined) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <PageHeader
          title={copy.title}
          description={copy.subtitle}
          backHref="/ajustes"
          backLabel={copy.back}
        />
        <EmptyState
          icon={<LockSimpleIcon />}
          title={copy.adminOnlyTitle}
          description={copy.adminOnlyBody}
        />
      </div>
    );
  }

  const [projects, teams] = await Promise.all([
    listMappableProjects(),
    listTeams(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        backHref="/ajustes"
        backLabel={copy.back}
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<ChartPieSliceIcon />}
          title={copy.emptyTitle}
          description={copy.emptyBody}
          primaryAction={<Link href="/ajustes/conexoes">{copy.connectCta}</Link>}
        />
      ) : (
        <Card>
          <CardContent>
            <ProjectMapForm projects={projects} teams={teams} />
          </CardContent>
          <CardFooter className="text-xs/relaxed text-muted-foreground">
            <p className="flex items-start gap-2">
              <LightbulbIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              {copy.tip}
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
