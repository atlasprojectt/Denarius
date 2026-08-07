import { recordAudit } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/session";
import { tenantExportStream } from "@/lib/privacy/export";
import { createClient } from "@/lib/supabase/server";

const copy = {
  forbidden: "Somente administradores podem exportar os dados da empresa.",
  unavailable: "Não foi possível preparar a exportação agora.",
};

type TenantPrivacyRow = {
  show_names: boolean;
  store_per_person: boolean;
};

export async function GET(): Promise<Response> {
  const auth = await requireAdmin();
  if (auth.error !== undefined) {
    return Response.json({ error: copy.forbidden }, { status: 403 });
  }

  const client = await createClient();
  const { data, error } = await client
    .from("tenant")
    .select("show_names, store_per_person")
    .eq("id", auth.session.tenantId)
    .maybeSingle();
  if (error || !data) {
    return Response.json({ error: copy.unavailable }, { status: 503 });
  }

  const privacy = data as TenantPrivacyRow;
  const generatedAt = new Date().toISOString();

  await recordAudit(auth.session, "tenant.exported", {
    target: "Empresa",
    detail: {
      showNames: privacy.show_names,
      storePerPerson: privacy.store_per_person,
    },
  });

  return new Response(
    tenantExportStream({
      client,
      tenantId: auth.session.tenantId,
      privacy: {
        showNames: privacy.show_names,
        storePerPerson: privacy.store_per_person,
      },
      generatedAt,
    }),
    {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="denarius-export-${generatedAt.slice(0, 10)}.json"`,
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
