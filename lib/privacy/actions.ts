"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/session";
import { deleteTenantPermanently } from "@/lib/privacy/delete";
import { tenantDeletionSchema } from "@/lib/validation";

export type TenantDeletionState = { error?: string };

const copy = {
  mismatch: "O nome digitado não corresponde ao nome atual da empresa.",
  revokeFailed:
    "Não foi possível descartar as credenciais dos provedores. Nada mais foi apagado.",
  authFailed:
    "A exclusão foi interrompida antes de remover o espaço. Fale com o suporte para concluir com segurança.",
  failed: "Não foi possível excluir o espaço agora. Tente novamente.",
};

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? copy.failed;
}

export async function deleteTenantAccount(
  _previous: TenantDeletionState,
  formData: FormData,
): Promise<TenantDeletionState> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) return { error: auth.error };

  const parsed = tenantDeletionSchema.safeParse({
    companyName: formData.get("companyName"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const result = await deleteTenantPermanently({
    actor: auth.session,
    companyName: parsed.data.companyName,
  });
  if (!result.ok) {
    if (result.reason === "name_mismatch") return { error: copy.mismatch };
    if (result.reason === "credential_revoke_failed") {
      return { error: copy.revokeFailed };
    }
    if (
      result.reason === "auth_delete_failed" ||
      result.reason === "tenant_delete_failed"
    ) {
      return { error: copy.authFailed };
    }
    return { error: copy.failed };
  }

  redirect("/login?space=deleted");
}
