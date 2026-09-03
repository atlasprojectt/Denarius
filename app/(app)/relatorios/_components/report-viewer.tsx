"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  RiArrowLeftLine,
  RiCloseLine,
  RiDownloadLine,
  RiExpandDiagonalLine,
  RiPrinterLine,
} from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionStatus } from "@/components/domain/action-status";

const copy = {
  back: "Relatórios",
  expand: "Expandir",
  close: "Fechar relatório",
  download: "Baixar PDF",
  print: "Imprimir",
  preparingPdf: "Preparando PDF…",
  documentFormat: "Documento A4",
  downloadError: "Não foi possível baixar o PDF. Tente novamente.",
  sessionError: "Sua sessão expirou. Entre novamente para baixar o relatório.",
  unavailableError: "O relatório está temporariamente indisponível. Tente novamente.",
};

export function ReportViewer({
  title,
  meta,
  pdfUrl,
  downloadFilename,
  reportDocument,
}: {
  title: string;
  meta: string;
  pdfUrl: string;
  downloadFilename: string;
  reportDocument: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busyAction, setBusyAction] = useState<"download" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const objectUrlRef = useRef<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const requestRef = useRef<Promise<Blob> | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const handleAfterPrint = () => document.documentElement.removeAttribute("data-printing");
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  async function loadPdf() {
    if (requestRef.current) return requestRef.current;
    const request = fetch(pdfUrl, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401 || response.redirected || response.url.includes("/login")) throw new Error("report-pdf-session");
        if (!response.ok) throw new Error(response.status === 404 || response.status >= 500 ? "report-pdf-unavailable" : "report-pdf-failed");
        const contentType = response.headers.get("content-type");
        if (!contentType?.toLowerCase().startsWith("application/pdf")) {
          throw new Error("report-pdf-invalid");
        }
        const blob = await response.blob();
        if (blob.size < 128) throw new Error("report-pdf-invalid");
        blobRef.current = blob;
        return blob;
      })
      .catch((error: unknown) => {
        requestRef.current = null;
        throw error;
      });
    requestRef.current = request;
    return request;
  }

  async function getPdfUrl() {
    if (!objectUrlRef.current) {
      if (!blobRef.current) await loadPdf();
      if (!blobRef.current) throw new Error("report-pdf-failed");
      objectUrlRef.current = URL.createObjectURL(blobRef.current);
    }
    return objectUrlRef.current;
  }

  async function download() {
    if (busyAction) return;
    setActionError(null);
    setBusyAction("download");
    try {
      const url = await getPdfUrl();
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = downloadFilename;
      anchor.hidden = true;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => {
        if (objectUrlRef.current === url) {
          URL.revokeObjectURL(url);
          objectUrlRef.current = null;
        }
      }, 1000);
    } catch (error) {
      setActionError(error instanceof Error && error.message === "report-pdf-session" ? copy.sessionError : error instanceof Error && error.message === "report-pdf-unavailable" ? copy.unavailableError : copy.downloadError);
    } finally {
      setBusyAction(null);
    }
  }

  function print() {
    setActionError(null);
    // Print the canonical page source, not the expanded dialog duplicate.
    setExpanded(false);
    document.documentElement.setAttribute("data-printing", "true");
    window.requestAnimationFrame(() => window.print());
  }

  function handleExpand() {
    setExpanded(true);
  }

  const actionBusy = busyAction !== null;

  return (
    <section className="report-viewer" data-report-viewer>
      <header className="report-viewer-toolbar">
        <div className="report-viewer-title">
          <Button asChild variant="ghost" size="sm" shape="full">
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
            onClick={print}
          >
            <RiPrinterLine aria-hidden />
            <span>{copy.print}</span>
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

      {actionError && (
        <div className="report-viewer-feedback" data-print-control>
          <ActionStatus error={actionError} />
        </div>
      )}

      <div className="report-viewer-canvas">
        <div
          className="report-viewer-preview"
          aria-label={`Prévia de ${title}`}
        >
          <div className="report-preview-document">{reportDocument}</div>
        </div>
        <span className="report-preview-page-count">{copy.documentFormat}</span>
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
          <header className="report-viewer-dialog-header">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={copy.close}
              className="report-viewer-dialog-close"
              onClick={() => setExpanded(false)}
            >
              <RiCloseLine aria-hidden />
            </Button>
            <div className="report-viewer-dialog-meta">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                {meta}
                {" · "}
                {copy.documentFormat}
              </DialogDescription>
            </div>
            <div className="report-viewer-dialog-actions" data-print-control>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={copy.print}
                data-report-dialog-action
                disabled={actionBusy}
                onClick={print}
              >
                <RiPrinterLine aria-hidden />
                <span>{copy.print}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={copy.download}
                data-report-dialog-action
                disabled={actionBusy}
                onClick={() => void download()}
              >
                <RiDownloadLine aria-hidden />
                <span>{busyAction === "download" ? copy.preparingPdf : copy.download}</span>
              </Button>
            </div>
          </header>

          <div
            className="report-viewer-expanded-scroll"
            role="region"
            aria-label="Documento do relatório"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setExpanded(false);
              }
            }}
          >
            <motion.div
              className="report-viewer-expanded-paper"
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, y: 12, scale: 0.985 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
              }
              onClick={(event) => event.stopPropagation()}
            >
              {reportDocument}
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
