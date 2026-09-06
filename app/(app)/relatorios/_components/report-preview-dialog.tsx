"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  RiArrowLeftLine,
  RiDownloadLine,
  RiPrinterLine,
} from "@remixicon/react";

import { ActionStatus } from "@/components/domain/action-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spokes } from "@/components/loading-ui/spokes";

import {
  ReportDocument,
  reportPdfTarget,
  type ReportDocumentData,
  type ReportVariant,
} from "./report-document";
import { useReportDownload } from "./use-report-download";
import { copy } from "../copy";

// THE one preview: every file on /relatorios (live or frozen) opens over the
// page in this dialog — no preview route, the index stays as background. The
// header owns the only actions (Imprimir · Baixar PDF); the file rows stay
// quiet. Printing closes the dialog first and prints the host's print-only
// copy through the shared print layer.
export function ReportPreviewDialog({
  open,
  onClose,
  heading,
  stamp,
  variant,
  status,
  data,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  heading: string;
  stamp: string;
  variant: ReportVariant;
  status: "loading" | "error" | "ready";
  data: ReportDocumentData | null;
  onRetry: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const target =
    status === "ready" && data ? reportPdfTarget(data, variant === "live") : null;
  const { downloading, error, clearError, download } = useReportDownload(
    target?.pdfUrl ?? null,
    target?.downloadFilename ?? "",
  );

  async function print() {
    clearError();
    // Print the host's print-only copy, not the dialog — then the shared
    // `@media print` layer applies untouched. The dialog unmounts
    // asynchronously (Radix exit), so wait a tick before capturing; without
    // it the paper and the index list overlapped in the print preview.
    onClose();
    document.documentElement.setAttribute("data-printing", "true");
    await new Promise((resolve) => setTimeout(resolve, 150));
    window.print();
  }

  const busy = downloading || status === "loading";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="report-preview-dialog"
        data-report-preview
        showCloseButton={false}
        style={{ translate: "none", transform: "none", scale: "none" }}
      >
        <header className="report-preview-dialog-header">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            shape="full"
            onClick={onClose}
          >
            <RiArrowLeftLine aria-hidden />
            <span className="max-sm:sr-only">{copy.previewClose}</span>
          </Button>
          <div className="report-preview-dialog-meta">
            <DialogTitle>{heading}</DialogTitle>
            <DialogDescription>{stamp}</DialogDescription>
          </div>
          <div className="report-preview-dialog-actions" data-print-control>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-report-dialog-action
              disabled={busy}
              onClick={() => void print()}
            >
              <RiPrinterLine aria-hidden />
              <span>{copy.print}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              data-report-dialog-action
              disabled={status !== "ready"}
              loading={downloading}
              loadingText={copy.preparingPdf}
              onClick={() => void download()}
            >
              <RiDownloadLine aria-hidden />
              <span>{copy.downloadPdf}</span>
            </Button>
          </div>
        </header>

        {(error || status === "error") && (
          <div className="report-preview-feedback" data-print-control>
            <ActionStatus error={error ?? copy.previewUnavailable} />
            {status === "error" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
              >
                {copy.retry}
              </Button>
            )}
          </div>
        )}

        <div
          className="report-preview-scroll"
          role="region"
          aria-label="Documento do relatório"
        >
          {status === "loading" && (
            <div className="report-preview-state" role="status">
              <Spokes aria-hidden />
              <p>{copy.previewLoading}</p>
            </div>
          )}
          {status === "ready" && data && (
            <motion.div
              className="report-preview-paper"
              initial={
                reduceMotion ? false : { opacity: 0, y: 12, scale: 0.985 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
              }
            >
              <ReportDocument report={data} variant={variant} />
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
