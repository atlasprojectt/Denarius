// Home cockpit copy (F2: pt-BR, isolated, never inline in JSX). Sentence case
// throughout; alarm language only where a warning warrants it, observation
// language elsewhere (product principle #6).

export const homeCopy = {
  greeting: {
    fallback: "Olá",
    morning: "Bom dia",
    afternoon: "Boa tarde",
    evening: "Boa noite",
    status: {
      green: "Tudo sob controle",
      amber: "Atenção",
      red: "Orçamento estourado",
      collecting: "Coletando ritmo",
    },
  },
  digest: {
    title: "Digest executivo",
    coldStart: "Defina um orçamento e conecte uma fonte para começar.",
  },
  dataAsOf: (stamp: string) => `Atualizado ${stamp}`,

  setup: {
    eyebrow: "Configuração inicial",
    title: "Prepare seu primeiro veredito",
    subtitle: "Faça o primeiro passo agora. Depois, complete os dois seguintes para acompanhar seu gasto com IA.",
    progress: (done: number, total: number) => `${done} de ${total} concluídos`,
    compactTitle: "Próximo passo",
    nowLabel: "Agora",
    afterLabel: "Depois",
    afterEmpty: "Este é o último passo da configuração.",
    completeLabel: "Quando estiver completo",
    completeBody: "O painel passa a mostrar uma resposta clara sobre o gasto, com contexto para decidir o que fazer.",
    completedBefore: (done: number) => `${done} passo${done === 1 ? "" : "s"} já concluído${done === 1 ? "" : "s"}`,
    stepDoneBadge: "Concluído",
    connected: "Conectar um provedor",
    connectedNow: "Conecte uma fonte de gasto",
    connectedDetail: "OpenAI ou Anthropic, com uma Admin Key somente leitura.",
    hasRoster: "Importar pessoas",
    hasRosterNow: "Importe as pessoas e os times",
    hasRosterDetail: "Times e pessoas para atribuir cada real gasto.",
    hasBudget: "Definir o orçamento",
    hasBudgetNow: "Defina o orçamento mensal",
    hasBudgetDetail: "O limite mensal que destrava veredito e avisos.",
    openStep: "Abrir configuração",
    outcomes: [
      "Veredito diário sobre o controle do gasto",
      "Projeção de fechamento no ritmo atual",
      "Avisos antecipados para decidir a tempo",
    ],
  },

  hero: {
    title: "Gasto do mês",
    ofBudget: (budget: string) => `de ${budget}`,
    weekDelta: (pct: string) => `${pct} vs semana anterior`,
    kpiProjection: "Projeção de fechamento",
    collectingShort: "coletando ritmo",
    unconverted: (usd: string) =>
      `+ ${usd} de API ainda sem câmbio congelado — fora do total até o câmbio ser capturado.`,
    // Pacing bar. The meta row pairs the two figures the bar exists to
    // compare: how much of the budget is gone against how much of the month.
    periodDay: (day: number, days: number, elapsed: string) =>
      `dia ${day} de ${days} · ${elapsed} do mês`,
    pace: {
      spent: "Gasto",
      projected: "Projeção",
      budget: "Orçamento",
      legend: "Gasto, projeção de fechamento e orçamento mensal.",
      /** Always present for assistive tech — the visual legend is hover-only. */
      description: (spent: string, elapsed: string) =>
        `Barra de ritmo: ${spent} do orçamento gasto, com ${elapsed} do mês decorrido. A parte cheia é o gasto, a parte clara é a projeção de fechamento e a linha marca o orçamento.`,
    },
  },

  composition: {
    title: "Gasto por fonte",
    infoLabel: "Mais informações sobre gasto por fonte",
    info: "O mesmo gasto do período, agrupado por fonte — o total da empresa é a soma dos times mais o não atribuído. Tokens e modelos ficam em Composição.",
    empty: "Sem gasto de API convertido ainda neste período.",
    entryValue: (amount: string, pct: string) => `${amount} (${pct})`,
    unattributed: (amount: string) => `${amount} sem atribuição`,
    unattributedNoFx: (seats: string, usd: string) =>
      `${seats} sem atribuição (+ ${usd} de API sem câmbio do período)`,
    mapCta: "Atribuir",
  },

  monthlyPace: {
    title: "Evolução do mês",
    infoLabel: "Mais informações sobre evolução do mês",
    info: "Gasto acumulado dia a dia, com projeção de fechamento e referência do orçamento mensal.",
    empty: "Sem gasto registrado neste período ainda.",
    aria: (realized: string, pace: string, projection: string) =>
      `Evolução do gasto do mês: ${realized} realizados até hoje, ritmo esperado de ${pace}, projeção de fechamento de ${projection}.`,
    ariaCollecting: (realized: string, pace: string) =>
      `Evolução do gasto do mês: ${realized} realizados até hoje, ritmo esperado de ${pace}. Projeção ainda coletando ritmo.`,
    // Header metrics row — labels secondary, values in the foreground.
    realizedLabel: "Realizado",
    paceTodayLabel: "Ritmo esperado hoje",
    projectionLabel: "Projeção",
    collectingShort: "coletando ritmo",
    rangeLabel: "Faixa provável",
    confidence: (level: string) => `confiança ${level}`,
    confidenceHigh: "alta",
    confidenceMedium: "média",
    confidenceLow: "baixa",
    rangeRef: (stamp: string) => `referência: ${stamp}`,
    // Series + tooltip labels.
    spent: "Gasto",
    projected: "Projeção",
    budget: "Orçamento",
    cumulative: "Acumulado",
    versusBudget: "Vs. orçamento",
    aboveBudget: (delta: string, pct: string) => `+${delta} · ${pct}`,
    belowBudget: (delta: string, pct: string) => `${delta} · ${pct}`,
    closingDate: "Fechamento",
    estimatedBreach: "Estouro estimado",
    dayLabel: (day: number, month: string) => `${day} de ${month}`,
    todayValue: (value: string) => `Hoje · ${value}`,
    projectionValue: (value: string) => `Projeção · ${value}`,
  },

} as const;
