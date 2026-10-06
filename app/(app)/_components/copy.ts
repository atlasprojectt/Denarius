// Home cockpit copy (F2: pt-BR, isolated, never inline in JSX). Sentence case
// throughout; alarm language only where a warning warrants it, observation
// language elsewhere (product principle #6).

export const homeCopy = {
  greeting: {
    fallback: "Olá",
    morning: "Bom dia",
    afternoon: "Boa tarde",
    evening: "Boa noite",
    // `verdict` is the emphasized word; `lead` is the quiet phrase before it.
    status: {
      green: { lead: "Tudo", verdict: "sob controle" },
      amber: { lead: "", verdict: "Atenção" },
      red: { lead: "Orçamento", verdict: "estourado" },
      collecting: { lead: "", verdict: "Coletando ritmo" },
    },
  },
  digest: {
    title: "Digest executivo",
    coldStart: "Defina um orçamento e conecte uma fonte para começar.",
  },
  dataAsOf: (stamp: string) => `Atualizado ${stamp}`,

  // Cold start: no org budget yet, so there is no verdict to show.
  noBudget: {
    title: "Ainda não há orçamento",
    adminBody:
      "Sem um orçamento mensal, o painel não consegue dizer se o gasto com IA está sob controle. Termine a configuração para ver o primeiro veredito.",
    viewerBody:
      "Sem um orçamento mensal, o painel não consegue dizer se o gasto com IA está sob controle. Um administrador da empresa precisa defini-lo.",
    resume: "Retomar configuração",
  },

  // One-time dialog after the guided setup redirects here.
  welcome: {
    title: (name: string | null) =>
      name ? `Boas-vindas ao Denarius, ${name}` : "Boas-vindas ao Denarius",
    ready:
      "Tudo pronto. A partir de agora o painel responde, todo dia, se o gasto com IA da empresa está sob controle.",
    pending:
      "Sua empresa está criada. Assim que houver um orçamento, o painel passa a responder se o gasto com IA está sob controle.",
    tourLabel: "Onde encontrar",
    tour: [
      { place: "Início", what: "O veredito e o gasto do mês contra o orçamento." },
      { place: "Times", what: "Onde cada time está e o que pesa no gasto." },
      { place: "Ajustes", what: "Conexões, pessoas e orçamentos, quando algo mudar." },
    ],
    start: "Começar a usar",
  },

  hero: {
    title: "Gasto do mês",
    ofBudget: (budget: string) => `de ${budget}`,
    weekDeltaLabel: "X semana anterior",
    kpiProjection: "Projeção de fechamento",
    collectingShort: "coletando ritmo",
    unconverted: (usd: string) =>
      `+ ${usd} de API ainda sem câmbio congelado — fora do total até o câmbio ser capturado.`,
    // Pacing bar. The meta row pairs the two figures the bar exists to
    // compare: how far into the month against how much of the budget is gone.
    pace: {
      periodDay: (day: number, days: number) => `dia ${day} de ${days}`,
      spent: "Gasto",
      projected: "Projeção",
      over: "Acima do orçamento",
      leftover: "Sobra",
      legend:
        "Da esquerda para a direita: gasto, projeção até o fechamento, o que passa do orçamento (em vermelho) e a sobra. Tom forte é o que já foi gasto; tom claro, o que ainda vai ser.",
      legendCollecting:
        "Ritmo de fechamento ainda sendo coletado. A projeção aparece a partir do quinto dia.",
      /** Always present for assistive tech — the visual legend is md-and-up. */
      description: (spent: string, day: number, days: number) =>
        `Barra de ritmo: ${spent} do orçamento gasto no dia ${day} de ${days}. Da esquerda para a direita: o gasto, a projeção do que ainda será gasto até o fechamento, a parte que passa do orçamento, em vermelho, e a sobra do orçamento. O tom forte é o que já foi gasto e o tom claro, o que ainda vai ser.`,
      descriptionCollecting: (spent: string, day: number, days: number) =>
        `Barra de ritmo: ${spent} do orçamento gasto no dia ${day} de ${days}. O ritmo de fechamento ainda está sendo coletado. A barra mostra o gasto e a sobra do orçamento.`,
    },
  },

  composition: {
    title: "Gasto por fonte",
    infoLabel: "Mais informações sobre gasto por fonte",
    info: "O mesmo gasto do período, agrupado por fonte — o total da empresa é a soma dos times mais o não atribuído. Tokens e modelos ficam em Composição.",
    empty: "Sem gasto de API convertido ainda neste período.",
    entryShare: (pct: string) => `(${pct})`,
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
    versusBudget: "Projeção X orçamento",
    budgetDelta: (delta: string, pct: string) => `${delta} · ${pct}`,
    closingDate: "Fechamento",
    estimatedBreach: "Estouro estimado",
    dayLabel: (day: number, month: string) => `${day} de ${month}`,
    todayValue: (value: string) => `Hoje · ${value}`,
    projectionValue: (value: string) => `Projeção · ${value}`,
  },

} as const;
