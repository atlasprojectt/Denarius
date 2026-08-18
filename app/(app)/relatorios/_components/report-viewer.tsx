"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import {
  RiArrowLeftLine,
  RiCloseLine,
  RiDownloadLine,
  RiExpandDiagonalLine,
  RiFileTextLine,
  RiPrinterLine,
} from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ViewerState = "loading" | "ready" | "error";

const copy = {
  back: "Relatórios",
  expand: "Expandir",
  close: "Fechar visualização",
  download: "Baixar PDF",
  print: "Imprimir",
  preparing: "Preparando relatório…",
  preparingPdf: "Preparando PDF…",
  error: "Não foi possível preparar o relatório.",
  retry: "Tentar novamente",
  pageCount: (count: number) => `${count} ${count === 1 ? "página" : "páginas"}`,
};

function PageCanvas({
  document,
  pageNumber,
  expanded,
}: {
  document: PDFDocumentProxy;
  pageNumber: number;
  expanded: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !document) return;

    let cancelled = false;

    const draw = () => {
      void document.getPage(pageNumber).then((page) => {
        if (cancelled) return;
        // Cancel any in-flight paint on this canvas first: starting a second
        // render on the same canvas throws "Cannot use the same canvas during
        // multiple render() operations" and leaves the preview blank/partial.
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }
        const style = window.getComputedStyle(container);
        const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        const availableWidth = Math.max(container.clientWidth - padX - 2, 1);
        const availableHeight = Math.max(container.clientHeight - padY - 2, 1);
        // The compact preview shrinks a page to fit the fixed-height slot, so it
        // never grows beyond the page's natural size. The expanded viewer sizes
        // by width to the A4 frame (min(100%, 210mm)), so it may grow up to real
        // A4 width on wide screens — its own rule, decoupled from the preview's
        // math (no inherited translate/scale/compact dimensions).
        const pageViewport = page.getViewport({ scale: 1 });
        const scale = expanded
          ? availableWidth / pageViewport.width
          : Math.min(1, availableWidth / pageViewport.width, availableHeight / pageViewport.height);
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: scale * outputScale });
        const cssViewport = page.getViewport({ scale });

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = `${cssViewport.width}px`;
        canvas.style.height = `${cssViewport.height}px`;

        const context = canvas.getContext("2d");
        if (!context) return;
        const task = page.render({ canvas, canvasContext: context, viewport });
        renderTaskRef.current = task;
        void task.promise.catch(() => undefined);
      });
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      observer.disconnect();
    };
  }, [document, pageNumber, expanded]);

  return (
    <div
      ref={containerRef}
      className="report-viewer-page-slot"
      data-expanded={expanded}
      data-page-number={pageNumber}
    >
      <canvas ref={canvasRef} aria-label={`Página ${pageNumber}`} />
    </div>
  );
}

export function ReportViewer({
  title,
  meta,
  pdfUrl,
  downloadFilename,
  reportDocument,
  pageCount,
}: {
  title: string;
  meta: string;
  pdfUrl: string;
  downloadFilename: string;
  reportDocument: React.ReactNode;
  pageCount: number;
}) {
  const [pdfState, setPdfState] = useState<ViewerState>("loading");
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [busyAction, setBusyAction] = useState<"download" | "print" | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const requestRef = useRef<Promise<PDFDocumentProxy> | null>(null);

  // pdfjs is loaded lazily — only when the expanded viewer is opened or when
  // download/print is triggered. The inline preview never depends on it: it
  // shows the report's native HTML (passed as `reportDocument`), so the screen
  // never reads as a PDF reader.
  async function loadDocument() {
    if (requestRef.current) return requestRef.current;
    setPdfState("loading");
    const request = fetch(pdfUrl, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("report-pdf-failed");
        const blob = await response.blob();
        blobRef.current = blob;
        const buffer = await blob.arrayBuffer();
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        return pdfjs.getDocument({ data: buffer }).promise;
      })
      .then((loaded) => {
        setPdfDocument(loaded);
        setPdfState("ready");
        return loaded;
      })
      .catch((error: unknown) => {
        requestRef.current = null;
        setPdfState("error");
        throw error;
      });
    requestRef.current = request;
    return request;
  }

  async function getPdfUrl() {
    if (!objectUrlRef.current) {
      if (!blobRef.current) await loadDocument();
      if (!blobRef.current) throw new Error("report-pdf-failed");
      objectUrlRef.current = URL.createObjectURL(blobRef.current);
    }
    return objectUrlRef.current;
  }

  async function download() {
    if (busyAction) return;
    setBusyAction("download");
    try {
      const url = await getPdfUrl();
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = downloadFilename;
      anchor.click();
    } catch {
      setPdfState("error");
    } finally {
      setBusyAction(null);
    }
  }

  async function print() {
    if (busyAction) return;
    setBusyAction("print");
    try {
      const url = await getPdfUrl();
      const frame = window.document.createElement("iframe");
      frame.className = "report-print-frame-hidden";
      frame.src = url;
      frame.onload = () => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        window.setTimeout(() => frame.remove(), 1000);
      };
      window.document.body.appendChild(frame);
    } catch {
      setPdfState("error");
    } finally {
      setBusyAction(null);
    }
  }

  function handleExpand() {
    setExpanded(true);
    if (!pdfDocument && !requestRef.current) {
      void loadDocument().catch(() => undefined);
    }
  }

  const pages = pdfDocument?.numPages ?? null;
  const actionBusy = busyAction !== null;

  return (
    <section className="report-viewer" data-report-viewer>
      <header className="report-viewer-toolbar">
        <div className="report-viewer-title">
          <Button asChild variant="ghost" size="sm" shape="compact">
            <Link href="/relatorios" aria-label={copy.back}>
              <RiArrowLeftLine aria-hidden />
              <span className="max-sm:sr-only">{copy.back}</span>
            </Link>
          </Button>
          <div>
            <h1>{title}</h1>
            <p>{meta}</p>
          </div>
        </div>
        <div className="report-viewer-actions" data-print-control>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={actionBusy}
            onClick={() => void print()}
          >
            <RiPrinterLine aria-hidden />
            <span>{busyAction === "print" ? copy.preparingPdf : copy.print}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={actionBusy}
            onClick={() => void download()}
          >
            <RiDownloadLine aria-hidden />
            <span>{busyAction === "download" ? copy.preparingPdf : copy.download}</span>
          </Button>
        </div>
      </header>

      <div className="report-viewer-canvas">
        <div className="report-viewer-preview" aria-label={`Prévia de ${title}`}>
          <div className="report-preview-document">{reportDocument}</div>
        </div>
        <span className="report-preview-page-count">{copy.pageCount(pageCount)}</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="report-preview-expand"
          onClick={handleExpand}
        >
          <RiExpandDiagonalLine aria-hidden />
          {copy.expand}
        </Button>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent
          className="report-viewer-dialog"
          showCloseButton={false}
          style={{ translate: "none", transform: "none", scale: "none" }}
        >
          <DialogHeader className="report-viewer-dialog-header">
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                {meta}
                {pages ? ` · ${copy.pageCount(pages)}` : ""}
              </DialogDescription>
            </div>
            <div className="report-viewer-dialog-actions" data-print-control>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={actionBusy}
                onClick={() => void print()}
              >
                <RiPrinterLine aria-hidden />
                {copy.print}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={actionBusy}
                onClick={() => void download()}
              >
                <RiDownloadLine aria-hidden />
                {copy.download}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={copy.close}
                onClick={() => setExpanded(false)}
              >
                <RiCloseLine aria-hidden />
              </Button>
            </div>
          </DialogHeader>
          <div className="report-viewer-expanded-document">
            {pdfState === "loading" && (
              <div className="report-viewer-message" role="status">
                <RiFileTextLine aria-hidden />
                {copy.preparing}
              </div>
            )}
            {pdfState === "error" && (
              <div className="report-viewer-message" role="alert">
                <RiFileTextLine aria-hidden />
                <span>{copy.error}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadDocument().catch(() => undefined)}
                >
                  {copy.retry}
                </Button>
              </div>
            )}
            {pdfDocument &&
              Array.from({ length: pdfDocument.numPages }, (_, index) => (
                <PageCanvas
                  key={index + 1}
                  document={pdfDocument}
                  pageNumber={index + 1}
                  expanded
                />
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
