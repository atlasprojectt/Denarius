import Link from "next/link";

import { Button } from "@/components/ui/button";

// Cold-start state (P1: value with graceful degradation — never an empty
// screen). The verdict replaces this card as soon as a source is connected
// and a budget exists (issues #15–#19).

const copy = {
  question: "Você está no controle do gasto com IA?",
  setupTitle: "Configure o Denarius para ter a resposta",
  setupSub:
    "Ainda não há dados. O veredito — dentro ou fora do orçamento, com projeção de fechamento — aparece assim que houver uma fonte conectada e um orçamento definido.",
  steps: [
    {
      number: 1,
      title: "Conectar OpenAI e Anthropic",
      description: "Chaves admin somente-leitura puxam o uso diário e o convertem em dinheiro.",
      status: "Chega nas issues #15–#16",
    },
    {
      number: 2,
      title: "Subir o roster (CSV)",
      description: "Atribui o gasto por time e por pessoa.",
      status: "Chega na issue #13",
    },
    {
      number: 3,
      title: "Definir orçamentos",
      description: "Destrava o veredito, a projeção e os avisos antecipados.",
      status: "Chega na issue #18",
    },
  ],
  settingsCta: "Ver Ajustes",
};

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {copy.question}
        </h1>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{copy.setupTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.setupSub}</p>

        <ol className="mt-6 flex flex-col gap-4">
          {copy.steps.map((step) => (
            <li key={step.number} className="flex items-start gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {step.number}
              </span>
              <div className="flex-1">
                <p className="font-medium leading-tight">{step.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
              <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                {step.status}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-6">
          <Button variant="outline" asChild>
            <Link href="/ajustes">{copy.settingsCta}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
