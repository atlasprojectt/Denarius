import type { VerdictStatus } from "@/lib/engine/verdict";

export const copy = {
  indexTitle: "Relatórios",
  indexDescription:
    "A situação de agora, a qualquer momento, e os meses fechados para prestação de contas.",
  liveCardTitle: "Situação agora",
  liveCardBody:
    "Gere o relatório da situação financeira da empresa neste momento — sem esperar o mês fechar. Abre pronto para imprimir ou salvar em PDF.",
  liveCardCta: "Gerar relatório atual",
  closedListTitle: "Meses fechados",
  closedListDescription:
    "Congelados no fechamento e nunca recalculados.",
  unavailableTitle: "Não foi possível carregar os relatórios",
  unavailableDescription:
    "Os meses fechados continuam preservados. Tente abrir esta área novamente.",
  emptyTitle: "O primeiro relatório aparece após o fechamento do mês",
  emptyDescription:
    "Quando um mês terminar, o Denarius congela números, veredito e ressalvas no mesmo formato para comparação futura.",
  month: "Mês",
  spend: "Gasto",
  budget: "Orçamento",
  verdict: "Veredito",
  caveats: "Ressalvas",
  noCaveats: "Sem ressalvas",
  caveatCount: (count: number) =>
    count === 1 ? "1 ressalva" : `${count} ressalvas`,
  unavailable: "Indisponível",
  noBudget: "Sem orçamento",
  openMonth: (month: string) => `Abrir relatório de ${month}`,
  back: "Relatórios",

  // ---------------------------------------------------------------------
  // The document. A fixed, numbered spine (§1..§6) so that two months are
  // comparable: a reader must find "Composição do gasto" in the same place
  // every time. The composer decides emphasis and content, never the order.
  // ---------------------------------------------------------------------
  docKind: "Relatório de gastos com IA",
  docKindClosed: "Fechamento do período",
  docKindLive: "Situação do período em andamento",
  print: "Imprimir ou salvar em PDF",
  closedAt: (date: string) => `Fechado em ${date}`,
  generatedAt: (dateTime: string) => `Gerado em ${dateTime}`,
  dayOfPeriod: (day: number, days: number, month: string) =>
    `Dia ${day} de ${days} de ${month}`,
  currency: (currency: string) => `Moeda de apresentação: ${currency}`,
  fx: (rate: string, source: string, date: string) =>
    `Câmbio congelado ${rate}/US$ · ${source} · ${date}`,
  fxNotNeeded: "Câmbio não necessário neste período",
  fxMissing: "Câmbio indisponível no fechamento",
  fxMissingLive: "Câmbio indisponível para este período",

  partialTitle: "O período ainda não fechou",
  partialBody:
    "Estes números são parciais: cobrem do dia 1 até agora e ainda vão mudar. O relatório de fechamento é o documento definitivo do período.",

  sections: {
    summary: "Sumário executivo",
    position: "Posição orçamentária",
    composition: "Composição do gasto",
    teams: "Desempenho por time",
    attention: "Pontos de atenção",
    annex: "Anexo — notas e ressalvas",
  },

  // §1
  noVerdict:
    "Este período não teve total e orçamento comparáveis para emitir veredito.",
  figures: {
    spent: "Gasto no período",
    budget: "Orçamento",
    projection: "Projeção de fechamento",
    projectedMargin: "Margem projetada",
  },
  figureCollecting: "coletando ritmo",
  projectionCollectingHint:
    "A projeção começa a partir do dia 5 — antes disso o ritmo do período ainda não se firmou.",

  // §2
  spentOfBudget: (spent: string, budget: string) => `${spent} de ${budget}`,
  elapsed: (day: number, days: number) => `Dia ${day} de ${days}`,
  consumed: (pct: string) => `${pct} do orçamento`,

  // §3
  compositionIntro:
    "Por fonte de gasto. As linhas somam o total do período.",
  compositionGap:
    "As linhas abaixo não fecham o total do período — há valor que não pôde ser convertido.",
  compositionCollapsed: (source: string) =>
    `Todo o gasto do período veio de uma única fonte: ${source}.`,
  compositionEmpty: "Nenhum gasto registrado no período.",
  source: "Fonte",
  amount: "Valor",
  shareOfPeriod: "% do período",
  seats: "Assentos",
  seatCount: (count: number) =>
    count === 1 ? "1 assinatura" : `${count} assinaturas`,
  seatsUnavailable: "Configuração histórica indisponível",
  total: "Total do período",

  // §4
  teamsIntro:
    "Ordenado por situação orçamentária e depois por participação no gasto.",
  teamsCollapsed:
    "Ainda não há times suficientes com gasto ou orçamento para comparar.",
  team: "Time",
  status: "Situação",
  percentOfBudget: "% do orçamento",
  projection: "Projeção",
  unattributed: "Não atribuído",
  unattributedNote: "Gasto que ainda não pôde ser associado a um time.",

  // §5
  attentionAllClear: "Nada exigiu atenção neste período.",
  actionsTitle: "Ações recomendadas",
  actionsIntro:
    "Sugestões do catálogo do Denarius, em ordem de relevância. O Denarius aponta; a decisão é sua.",
  actionContext: (target: string) => `Motivo: ${target}`,
  observedTitle: "Constatações do período",

  // §6
  caveatsDescription:
    "Estas condições foram congeladas junto com os números e não são recalculadas.",
  caveatsDescriptionLive:
    "O que pode afetar a leitura dos números acima neste momento.",
  methodTitle: "Como os números são apurados",
  method: [
    "Assentos são rateados por dia do período (preço ÷ dias), não lançados de uma vez.",
    "O gasto de API é o custo reportado pelos provedores em dólar, convertido pela taxa congelada no início do período.",
    "A projeção de fechamento é linear, pelo ritmo do próprio período, e só aparece a partir do dia 5.",
    "O Denarius é somente leitura: ele acompanha e recomenda, nunca bloqueia ou limita o uso.",
    "Nenhum número deste documento foi gerado por IA.",
  ],
  caveatLabels: {
    uncosted: "Modelos sem preço conhecido",
    reconciliation: "Reconciliação entre custo derivado e reportado",
    fx: "Conversão cambial",
    sync: "Sincronização dos provedores",
  },
  caveatText: {
    uncosted: "Há uso que não entrou no custo derivado por falta de preço.",
    costed: "Todo modelo observado tinha preço conhecido.",
    reconciliationGap: "Os totais derivado e reportado ficaram fora da tolerância.",
    reconciled: "Os totais derivado e reportado ficaram dentro da tolerância.",
    fxMissing: "Não havia taxa congelada para converter o gasto em dólar.",
    fxPresent: "A taxa usada no período está registrada no cabeçalho.",
    fxNotNeeded: "Não houve gasto em dólar que exigisse conversão.",
    stale: "Uma fonte podia não ter sincronizado até o fim do período.",
    fresh: "As fontes estavam atualizadas no fechamento.",
    staleLive:
      "Uma fonte não sincroniza há mais de um dia — os totais podem estar subestimados.",
    freshLive: "Todas as fontes ativas sincronizaram nas últimas 24 horas.",
    fxMissingLive:
      "Não há taxa congelada para converter o gasto em dólar neste período.",
    fxPresentLive:
      "A taxa congelada no início do período está registrada no cabeçalho.",
  },

  // The print footer band, repeated on every sheet.
  footerMark: "Denarius",
  footerTagline: "Governança de gastos com IA",
};

export const reportStatus: Record<VerdictStatus, string> = {
  green: "No controle",
  amber: "Atenção",
  red: "Estourado",
  collecting: "Coletando",
};
