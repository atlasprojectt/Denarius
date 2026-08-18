import { reportPdf } from "@/lib/reports/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { pdf, filename } = await reportPdf("/relatorios/agora", "atual");
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



