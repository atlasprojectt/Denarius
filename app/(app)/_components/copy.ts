// Home cockpit copy (F2: pt-BR, isolated, never inline in JSX). Sentence case
// throughout; alarm language only where a warning warrants it, observation
// language elsewhere (product principle #6).

export const homeCopy = {
  question: "Você está no controle do gasto com IA?",
  meta: (day: number, days: number, pctElapsed: string) =>
    `dia ${day} de ${days} · ${pctElapsed} do mês`,

  nextActions: {
    title: "Próximas ações",
    subtitle: "Pontos do período que já têm um caminho claro de investigação.",
    defaultAction: "Investigar",
  },

  setup: {
    title: "Prepare o primeiro veredito",
    subtitle: "Três passos deixam o Denarius pronto para responder se o gasto está sob controle.",
    step: (number: number) => `Passo ${number}`,
    connected: "Conectar um provedor",
    hasRoster: "Importar o roster",
    hasBudget: "Definir o orçamento",
    continue: "Continuar configuração",
  },

  hero: {
    spentLabel: "Gasto no período",
    ofBudget: (budget: string) => `de ${budget}`,
    kpiProjection: "Projeção de fechamento",
    kpiMargin: "Margem projetada",
    collectingShort: "coletando ritmo",
    pacingSpend: "Gasto",
    pacingTime: (day: number, days: number) => `Mês: dia ${day} de ${days}`,
    projectedOver: (over: string) => `No ritmo atual, ${over} acima do orçamento no fim do mês.`,
    projectedUnder: (under: string) => `No ritmo atual, fecha ${under} abaixo do orçamento.`,
    collecting: "Coletando ritmo — a projeção de fechamento aparece a partir do dia 5.",
    unconverted: (usd: string) =>
      `+ ${usd} de API ainda sem câmbio congelado — fora do total até o câmbio ser capturado.`,
  },

  allClear: {
    title: "Tudo sob controle",
    body: "Nenhum time fora do orçamento no ritmo atual. Próximo resumo na sexta.",
  },

  composition: {
    title: "Para onde vai o dinheiro",
    drillNote: "O mesmo gasto do período, agora agrupado por fonte. Tokens e modelos ficam em Explorar.",
    empty: "Sem gasto de API convertido ainda neste período.",
    total: "Total convertido",
    amount: "Gasto",
  },

  monthlyPace: {
    title: "Ritmo do mês",
    subtitle:
      "Gasto acumulado contra o tempo do período — a linha tracejada é a projeção linear.",
    empty: "Sem gasto registrado neste período ainda.",
    aria: "Gráfico de linha do gasto atual, orçamento e projeção do mês",
    spent: "Gasto",
    projected: "Projeção",
    budget: "Orçamento",
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

  observations: {
    title: "Observações",
    subtitle: "Apontamentos do período — para pensar, não para alarmar.",
    seatsNote:
      "Comparação com o roster importado — a detecção real de assentos ociosos chega com o conector do Copilot (v1.5).",
  },
} as const;
