// Home cockpit copy (F2: pt-BR, isolated, never inline in JSX). Sentence case
// throughout; alarm language only where a warning warrants it, observation
// language elsewhere (product principle #6).

export const homeCopy = {
  question: "Você está no controle do gasto com IA?",

  hero: {
    spentLabel: "Gasto no período",
    ofBudget: (budget: string) => `de ${budget}`,
    kpiProjection: "Projeção de fechamento",
    kpiMargin: "Margem projetada",
    kpiPace: "Mês",
    kpiPaceValue: (day: number, days: number) => `dia ${day} de ${days}`,
    collectingShort: "coletando ritmo",
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
    total: "Total convertido",
    amount: "Gasto",
  },

  monthlyPace: {
    title: "Ritmo do mês",
    subtitle: "Linha cheia = gasto atual; tracejada = projeção linear.",
    aria: "Gráfico de linha do gasto atual, orçamento e projeção do mês",
    spent: "Gasto",
    projected: "Projeção",
    budget: "Orçamento",
    elapsed: "Mês",
    start: "Início",
    today: "Hoje",
    close: "Fechamento",
  },

  coldStart: {
    title: "Configure o Denarius para ter a resposta",
    body: "O veredito — dentro ou fora do orçamento, com projeção de fechamento — aparece assim que houver um orçamento definido e uma fonte de gasto.",
    setBudgetCta: "Definir orçamento",
    connectCta: "Conectar provedores",
    unlocks: [
      "Veredito diário: dentro ou fora do orçamento, em uma frase",
      "Projeção de fechamento do mês no ritmo atual",
      "Avisos antecipados antes de o orçamento estourar",
    ],
  },

  simulate: {
    title: "Simular",
    subtitle: (team: string) => `Cenário para ${team}`,
    currentPace: "Ritmo atual",
    spent: "Gasto até agora",
    projected: "Projeção de fechamento",
    budget: "Orçamento",
    lever: "Variação do ritmo do time até o fim do mês",
    deltaZero: "ritmo atual",
    deltaSlower: (pct: string) => `${pct} mais devagar`,
    deltaFaster: (pct: string) => `${pct} mais rápido`,
    presetCurrent: "Ritmo atual",
    presetBreakEven: "Fechar no orçamento",
    presetCut: "−30%",
    breakEvenUnreachable:
      "Nem parando este time a empresa fecha no orçamento — o ajuste passa por outros times.",
    resultTitle: "Neste cenário",
    teamCloses: "Time fecha em",
    orgCloses: "Empresa fecha em",
    marginUnder: (amount: string) => `Fecha ${amount} abaixo do orçamento da empresa.`,
    marginOver: (amount: string) => `Fecha ${amount} acima do orçamento da empresa.`,
    collecting:
      "Coletando ritmo — a simulação usa a projeção de fechamento, disponível a partir do dia 5 do período.",
    disclaimer:
      "Estimativa linear sobre o ritmo atual — não é uma previsão. O Denarius aponta; a decisão é sua.",
  },

  observations: {
    title: "Observações",
    subtitle: "Apontamentos do período — para pensar, não para alarmar.",
    seatsNote:
      "Comparação com o roster importado — a detecção real de assentos ociosos chega com o conector do Copilot (v1.5).",
  },
} as const;
