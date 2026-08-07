import type { AuditAction } from "@/lib/audit/log";

// Screen copy (F2): UI strings in pt-BR, isolated here. The action phrasing is
// deliberately NOT stored on the row — the log keeps a typed enum so it stays
// queryable, and the wording lives where it can be re-worded (issue #73).

export const copy = {
  back: "Ajustes",
  title: "Auditoria",
  subtitle: "Quem mudou o quê neste espaço, do mais recente para o mais antigo.",
  cardTitle: "Ações administrativas",
  cardDescription:
    "O registro não pode ser editado nem apagado. Ficam guardadas as ações dos últimos 24 meses.",
  emptyTitle: "Nenhuma ação registrada ainda",
  emptyDescription:
    "Mudanças de orçamento, conexões, acessos e privacidade aparecem aqui assim que acontecerem.",
  // Distinct from the empty state on purpose: one says nothing happened, the
  // other says we could not find out. Only the second one can be wrong in a
  // way that misleads.
  unavailableTitle: "Não foi possível carregar o registro",
  unavailableDescription:
    "O histórico existe, mas não conseguimos lê-lo agora. Recarregue em instantes; se continuar, fale com o suporte.",
  limitNote: (limit: number) => `Mostrando as ${limit} ações mais recentes.`,
};

/** Every action, phrased for a reader. A Record over the union, so a new action
 *  without copy is a type error rather than a blank row. */
export const ACTION_LABEL: Record<AuditAction, string> = {
  "budget.created": "Criou orçamento",
  "budget.updated": "Alterou orçamento",
  "budget.deleted": "Removeu orçamento",
  "provider.key_saved": "Conectou provedor",
  "provider.key_rotated": "Trocou a chave do provedor",
  "provider.key_revoked": "Revogou a chave do provedor",
  "roster.imported": "Importou o roster",
  "roster.employee_updated": "Editou uma pessoa do roster",
  "roster.employee_removed": "Removeu uma pessoa do roster",
  "subscription.created": "Adicionou assinatura",
  "subscription.updated": "Alterou assinatura",
  "subscription.deleted": "Removeu assinatura",
  "attribution.updated": "Alterou a atribuição de projetos",
  "invitation.created": "Convidou uma pessoa",
  "invitation.revoked": "Revogou um convite",
  "invitation.accepted": "Aceitou o convite",
  "user.removed": "Removeu um usuário",
  "privacy.updated": "Alterou a privacidade",
  "company.renamed": "Alterou o nome da empresa",
  "company.currency_changed": "Alterou a moeda de exibição",
};
