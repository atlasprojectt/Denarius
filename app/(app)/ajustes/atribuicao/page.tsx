import Link from "next/link";

import { requireAdmin } from "@/lib/auth/session";
import { listTeams } from "@/lib/teams/queries";
import { listMappableProjects } from "@/lib/usage/attribution";

import { ProjectMapForm } from "./_components/project-map-form";

const copy = {
  back: "← Ajustes",
  title: "Atribuição",
  subtitle:
    "Mapeie cada projeto (OpenAI) ou workspace (Anthropic) para um time. O que ficar sem time cai em Não atribuído.",
  adminOnly: "Somente administradores podem editar a atribuição.",
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
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <Header />
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          {copy.adminOnly}
        </p>
      </div>
    );
  }

  const [projects, teams] = await Promise.all([
    listMappableProjects(),
    listTeams(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Header />

      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card p-12 text-center">
          <p className="font-medium">{copy.emptyTitle}</p>
          <p className="max-w-md text-sm text-muted-foreground">{copy.emptyBody}</p>
          <Link
            href="/ajustes/conexoes"
            className="mt-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {copy.connectCta}
          </Link>
        </div>
      ) : (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <ProjectMapForm projects={projects} teams={teams} />
          <p className="mt-4 text-xs text-muted-foreground">{copy.tip}</p>
        </section>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <Link
        href="/ajustes"
        className="text-sm text-muted-foreground hover:underline"
      >
        {copy.back}
      </Link>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
    </div>
  );
}
