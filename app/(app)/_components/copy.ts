// Home cockpit copy (F2: pt-BR, isolated, never inline in JSX). Sentence case
// throughout; alarm language only where a warning warrants it, observation
// language elsewhere (product principle #6).

export const homeCopy = {
  question: "Você está no controle do gasto com IA?",
  meta: (day: number, days: number, pctElapsed: string) =>
    `dia ${day} de ${days} · ${pctElapsed} do mês`,

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

  teams: {
    title: "Orçamentos por time",
    subtitleAttention: (n: number, total: number) =>
      n === 1
        ? `1 de ${total} times precisa de atenção neste mês.`
        : `${n} de ${total} times precisam de atenção neste mês.`,
    subtitleAllOk: (total: number) =>
      total === 1
        ? "O único time com orçamento está dentro do ritmo."
        : `Todos os ${total} times com orçamento estão dentro do ritmo.`,
    manage: "Gerenciar orçamentos",
    colTeam: "Time",
    colStatus: "Situação",
    colSpent: "Gasto",
    colBudget: "Orçamento",
    colUsage: "Consumo",
    colProjection: "Projeção",
    detail: (team: string) => `Ver detalhe de ${team}`,
    collecting: "—",
    warnBreach: (spent: string, budget: string, pct: string) =>
      `Estourou o orçamento: ${spent} de ${budget} (${pct}).`,
    warnProjected: (projection: string, over: string) =>
      `No ritmo atual, fecha em ${projection} — ${over} acima do orçamento.`,
    warnThreshold: (pct: string) => `Já em ${pct} do orçamento neste ponto do mês.`,
    emptyBody:
      "Defina orçamentos por time para ver aqui quem está dentro do ritmo e quem precisa de atenção.",
    emptyCta: "Definir orçamentos por time",
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
