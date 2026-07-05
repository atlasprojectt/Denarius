// Home cockpit copy (F2: pt-BR, isolated, never inline in JSX). Sentence case
// throughout; alarm language only where a warning warrants it, observation
// language elsewhere (product principle #6).

export const homeCopy = {
  question: "Você está no controle do gasto com IA?",

  hero: {
    spentLabel: "Gasto no período",
    ofBudget: (budget: string) => `de ${budget}`,
    pacingSpend: "Gasto",
    pacingTime: (day: number, days: number) => `Mês: dia ${day} de ${days}`,
    projectedOver: (over: string) => `No ritmo atual, ${over} acima do orçamento no fim do mês.`,
    projectedUnder: (under: string) => `No ritmo atual, fecha ${under} abaixo do orçamento.`,
    collecting: "Coletando ritmo — a projeção de fechamento aparece a partir do dia 5.",
    unconverted: (usd: string) =>
      `+ ${usd} de API ainda sem câmbio congelado — fora do total até o câmbio ser capturado.`,
    editBudget: "Editar orçamento",
  },

  needsAttention: {
    title: (n: number) => `Precisa de atenção (${n})`,
    investigate: "Investigar",
    simulate: "Simular",
    editBudget: "Editar orçamento",
    ofBudget: (spent: string, budget: string) => `${spent} de ${budget}`,
    warnBreach: (spent: string, budget: string, pct: string) =>
      `Estourou o orçamento: ${spent} de ${budget} (${pct}).`,
    warnProjected: (projection: string, over: string) =>
      `No ritmo atual, fecha em ${projection} — ${over} acima do orçamento.`,
    warnThreshold: (pct: string) => `Já em ${pct} do orçamento neste ponto do mês.`,
    planTitle: "O que dá para fazer",
    showPlan: "Ver plano",
    hidePlan: "Ocultar plano",
  },

  underControl: {
    title: (n: number) => `Sob controle (${n})`,
    expand: "Mostrar",
    collapse: "Ocultar",
    ofBudget: (spent: string, budget: string) => `${spent} de ${budget}`,
  },

  allClear: {
    title: "Tudo sob controle",
    body: "Nenhum time fora do orçamento no ritmo atual. Próximo resumo na sexta.",
  },

  composition: {
    title: "Para onde vai o dinheiro",
    drillNote: "Tokens e modelos ficam no detalhamento em Explorar.",
    empty: "Sem gasto de API convertido ainda neste período.",
  },

  coldStart: {
    title: "Configure o Denarius para ter a resposta",
    body: "O veredito — dentro ou fora do orçamento, com projeção de fechamento — aparece assim que houver um orçamento definido e uma fonte conectada.",
    setBudgetCta: "Definir orçamento",
    connectCta: "Conectar provedores",
  },

  simulate: {
    title: "Simular",
    subtitle: (team: string) => `Cenário para ${team}`,
    currentPace: "Ritmo atual",
    spent: "Gasto até agora",
    projected: "Projeção de fechamento",
    budget: "Orçamento",
    soon: "A simulação de cenários (fechar no orçamento, −30%, ritmo atual) chega em breve.",
  },
} as const;
