import type { VerdictStatus } from "@/lib/engine/verdict";

export const copy = {
  indexTitle: "Relatórios",
  indexDescription:
    "Meses fechados, congelados para consulta e prestação de contas.",
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
  reportDescription: "Relatório mensal fechado",
  print: "Imprimir ou salvar em PDF",
  closedAt: (date: string) => `Fechado em ${date}`,
  currency: (currency: string) => `Moeda: ${currency}`,
  fx: (rate: string, source: string, date: string) =>
    `Câmbio congelado: ${rate}/US$ · ${source} · ${date}`,
  fxNotNeeded: "Câmbio: não necessário neste mês",
  fxMissing: "Câmbio: indisponível no fechamento",
  verdictTitle: "Veredito",
  noVerdict: "Este mês não teve um total e orçamento comparáveis para emitir veredito.",
  spentTitle: "Gasto do mês",
  spentOfBudget: (spent: string, budget: string) =>
    `${spent} de ${budget}`,
  providerTitle: "Composição por provedor",
  providerEmpty: "Nenhum gasto de API reportado neste mês.",
  teamsTitle: "Times",
  team: "Time",
  status: "Situação",
  percent: "% do orçamento",
  teamsEmpty: "Nenhum time registrado no fechamento.",
  seatsAndUnattributed: "Assentos e não atribuído",
  seats: "Assentos",
  seatsUnavailable: "Configuração histórica indisponível",
  seatCount: (count: number) =>
    count === 1 ? "1 assinatura congelada" : `${count} assinaturas congeladas`,
  unattributed: "Não atribuído",
  api: "API",
  sharedSeats: "Assentos compartilhados",
  caveatsTitle: "Ressalvas do fechamento",
  caveatsDescription:
    "Estas condições foram congeladas junto com os números e não são recalculadas.",
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
    fxPresent: "A taxa usada no mês está registrada no cabeçalho.",
    fxNotNeeded: "Não houve gasto em dólar que exigisse conversão.",
    stale: "Uma fonte podia não ter sincronizado até o fim do mês.",
    fresh: "As fontes estavam atualizadas no fechamento.",
  },
};

export const reportStatus: Record<VerdictStatus, string> = {
  green: "No controle",
  amber: "Atenção",
  red: "Estourado",
  collecting: "Coletando",
};
