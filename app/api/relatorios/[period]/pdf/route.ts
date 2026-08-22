import { requireSession } from "@/lib/auth/session";
import { logOk, logThrown } from "@/lib/logging/server-log";
import { ReportPdfError, reportPdf } from "@/lib/reports/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ period: string }> }) {
  const { period } = await params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return new Response(null, { status: 404 });

  const auth = await requireSession();
  if (auth.error !== undefined) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { pdf, filename } = await reportPdf(`/relatorios/${period}`, period);
    const body = new Uint8Array(pdf.byteLength);
    body.set(pdf);
    logOk("report.pdf.generate", auth.session.tenantId, {
      variant: "closed",
      period,
    });
    return new Response(body.buffer, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    logThrown("report.pdf.generate", auth.session.tenantId, error);
    const status = error instanceof ReportPdfError ? error.status : 503;
    return Response.json(
      { error: "Não foi possível preparar o relatório." },
      { status },
    );
  }
}



