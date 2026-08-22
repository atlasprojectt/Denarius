import { requireSession } from "@/lib/auth/session";
import { logOk, logThrown } from "@/lib/logging/server-log";
import { reportPdf } from "@/lib/reports/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSession();
  if (auth.error !== undefined) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { pdf, filename } = await reportPdf("/relatorios/agora", "atual");
    const body = new Uint8Array(pdf.byteLength);
    body.set(pdf);
    logOk("report.pdf.generate", auth.session.tenantId, { variant: "live" });
    return new Response(body.buffer, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    logThrown("report.pdf.generate", auth.session.tenantId, error);
    return Response.json(
      { error: "Não foi possível preparar o relatório." },
      { status: 503 },
    );
  }
}



