import { reportPdf } from "@/lib/reports/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ period: string }> }) {
  const { period } = await params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return new Response(null, { status: 404 });

  try {
    const { pdf, filename } = await reportPdf(`/relatorios/${period}`, period);
    const body = new Uint8Array(pdf.byteLength);
    body.set(pdf);
    return new Response(body.buffer, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return Response.json({ error: "Não foi possível preparar o relatório." }, { status: 500 });
  }
}



