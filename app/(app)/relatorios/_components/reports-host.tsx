"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RiFileChartLine, RiSparklingLine } from "@remixicon/react";

import { EmptyState } from "@/components/domain/empty-state";
import { StateBadge } from "@/components/domain/state-badge";
import { StatusPill } from "@/components/domain/status-pill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { reportDate, reportFileDateTime, reportMonth } from "@/lib/reports/format";
import type { ClosingState } from "@/lib/reports/closing";
import type { ReportSummary } from "@/lib/reports/queries";
import {
  getClosedPreview,
  getLivePreview,
} from "@/lib/reports/actions";
import type { CurrentReport } from "@/lib/reports/current";
import type { MonthlyReport } from "@/lib/reports/queries";
import {
  AGORA_FILE_KEY,
  parseSeenPeriods,
  REPORTS_SEEN_EVENT,
  REPORTS_SEEN_KEY,
  serializeSeenPeriods,
} from "@/lib/reports/seen";
import type { ReportDocumentData, ReportVariant } from "./report-document";
import { ReportDocument } from "./report-document";
import { ReportPreviewDialog } from "./report-preview-dialog";
import { FileRow } from "./file-row";
import { copy } from "../copy";

type Selection =
  | { kind: "live"; stamp: string }
  | { kind: "closed"; period: string };

function readAgoraStamp(): string | null {
  try {
    return window.localStorage.getItem(AGORA_FILE_KEY);
  } catch {
    return null;
  }
}

function readSeen(): string[] {
  try {
    return parseSeenPeriods(window.localStorage.getItem(REPORTS_SEEN_KEY));
  } catch {
    return [];
  }
}

// The interactive report centre: the three file sections plus the single
// preview dialog. Summaries and the closing state arrive as server props;
// document data is fetched on open (live is always fresh, frozen months cache
// in memory for the session).
export function ReportsHost({
  closing,
  history,
  agoraMonth,
}: {
  closing: ClosingState;
  history: ReportSummary[];
  agoraMonth: string;
}) {
  const [agoraStamp, setAgoraStamp] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [liveData, setLiveData] = useState<CurrentReport | null>(null);
  // Ref mirror of the cache for handlers; render reads the state below.
  const cacheRef = useRef<Record<string, MonthlyReport>>({});
  const [closedData, setClosedData] = useState<Record<string, MonthlyReport>>(
    {},
  );
  // Frozen for print: printing closes the dialog, so the print-only copy
  // cannot depend on the open selection — it lives until afterprint.
  const [printDoc, setPrintDoc] = useState<{
    data: ReportDocumentData;
    variant: ReportVariant;
  } | null>(null);

  useEffect(() => {
    const load = () => {
      setAgoraStamp(readAgoraStamp());
      setSeen(readSeen());
    };
    load();
    const refresh = () => setSeen(readSeen());
    window.addEventListener(REPORTS_SEEN_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(REPORTS_SEEN_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Printing closes the dialog and prints the host's print-only copy.
  useEffect(() => {
    const handleAfterPrint = () => {
      document.documentElement.removeAttribute("data-printing");
      setPrintDoc(null);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const markSeen = useCallback((period: string) => {
    try {
      const next = new Set(readSeen());
      if (next.has(period)) return;
      next.add(period);
      window.localStorage.setItem(REPORTS_SEEN_KEY, serializeSeenPeriods(next));
      window.dispatchEvent(new Event(REPORTS_SEEN_EVENT));
      setSeen([...next]);
    } catch {
      // A blocked storage must never break the preview.
    }
  }, []);

  const openLive = useCallback(async (stamp: string) => {
    setSelection({ kind: "live", stamp });
    setStatus("loading");
    try {
      const data = await getLivePreview();
      setLiveData(data);
      setPrintDoc({ data, variant: "live" });
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  const generate = useCallback(() => {
    const stamp = new Date().toISOString();
    try {
      window.localStorage.setItem(AGORA_FILE_KEY, stamp);
    } catch {
      // Private mode still previews — only the row won't survive a reload.
    }
    setAgoraStamp(stamp);
    void openLive(stamp);
  }, [openLive]);

  const openClosed = useCallback(
    async (period: string) => {
      setSelection({ kind: "closed", period });
      setStatus("loading");
      try {
        const cached = cacheRef.current[period];
        const data = cached ?? (await getClosedPreview(period));
        if (!cached) {
          const next = { ...cacheRef.current, [period]: data };
          cacheRef.current = next;
          setClosedData(next);
        }
        setPrintDoc({ data, variant: "closed" });
        setStatus("ready");
      } catch {
        setStatus("error");
      }
      markSeen(period);
    },
    [markSeen],
  );

  const close = useCallback(() => setSelection(null), []);

  const previewData: ReportDocumentData | null =
    selection?.kind === "live"
      ? liveData
      : selection
        ? (closedData[selection.period] ?? null)
        : null;
  const variant: ReportVariant =
    selection?.kind === "closed" ? "closed" : "live";
  const heading =
    selection?.kind === "closed"
      ? reportMonth(`${selection.period}-01`)
      : copy.agoraFileTitle;
  const stamp =
    selection?.kind === "closed"
      ? (previewData
          ? `${copy.closedAt(reportDate(previewData.closedAt))} · ${copy.currency(previewData.currency)}`
          : "")
      : selection
        ? copy.agoraFileStamp(
            reportFileDateTime(selection.stamp),
            agoraMonth,
          )
        : "";

  const featured =
    closing.mode === "featured" ? closing : null;
  const showNovo = featured !== null && !seen.includes(featured.periodPath);

  return (
    <div className="grid gap-10">
      <section aria-labelledby="reports-agora" className="grid gap-4">
        <div className="grid gap-1">
          <h2 id="reports-agora" className="font-heading text-[15px] font-semibold tracking-tight">
            {copy.liveCardTitle}
          </h2>
          <p className="text-xs text-muted-foreground">{copy.liveCardBody}</p>
        </div>
        <div className="grid gap-4">
          <div>
            <Button
              type="button"
              variant="secondary"
              className="max-sm:min-h-11"
              onClick={generate}
            >
              <RiFileChartLine aria-hidden />
              {copy.liveCardCta}
            </Button>
          </div>
          {agoraStamp && (
            <Card className="gap-0 py-0" aria-live="polite">
              <FileRow
                kind="agora"
                title={copy.agoraFileTitle}
                meta={copy.agoraFileStamp(
                  reportFileDateTime(agoraStamp),
                  agoraMonth,
                )}
                labels={{ open: copy.openFile(copy.agoraFileTitle) }}
                onOpen={() => void openLive(agoraStamp)}
              />
            </Card>
          )}
        </div>
      </section>

      <section
        aria-labelledby="reports-closing"
        className="grid gap-4 border-t border-border pt-8"
      >
        <div className="grid gap-1">
          <h2 id="reports-closing" className="font-heading text-[15px] font-semibold tracking-tight">
            {copy.closingTitle}
          </h2>
        </div>
        <Card className="gap-0 py-0">
          {featured ? (
            <FileRow
              kind="closing"
              title={copy.closingFileTitle(reportMonth(featured.periodMonth))}
              meta={copy.closingAvailableNow}
              badge={
                showNovo ? (
                  <StateBadge
                    icon={RiSparklingLine}
                    tone="neutral"
                    aria-label={copy.closingNewHint}
                  >
                    {copy.closingNew}
                  </StateBadge>
                ) : undefined
              }
              labels={{
                open: copy.openFile(
                  copy.closingFileTitle(reportMonth(featured.periodMonth)),
                ),
              }}
              onOpen={() => void openClosed(featured.periodPath)}
            />
          ) : (
            closing.mode === "locked" && (
              <FileRow
                kind="closing"
                locked
                title={copy.closingFileTitle(reportMonth(closing.periodMonth))}
                meta={copy.closingLockedIn(reportDate(`${closing.availableOn}T12:00:00Z`))}
                labels={{ open: "" }}
              />
            )
          )}
        </Card>
      </section>

      <section
        aria-labelledby="reports-history"
        className="grid gap-4 border-t border-border pt-8"
      >
        <div className="grid gap-1">
          <h2 id="reports-history" className="font-heading text-[15px] font-semibold tracking-tight">
            {copy.closedListTitle}
          </h2>
          <p className="text-xs text-muted-foreground">
            {copy.closedListDescription}
          </p>
        </div>
        {history.length === 0 ? (
          <EmptyState
            icon={<RiFileChartLine />}
            title={copy.emptyTitle}
            description={copy.emptyDescription}
          />
        ) : (
          <Card className="gap-0 py-0">
            <div className="divide-y divide-border">
              {history.map((report) => {
                const month = reportMonth(report.periodMonth);
                return (
                  <FileRow
                    key={report.periodMonth}
                    kind="history"
                    title={month}
                    meta={reportDate(report.closedAt)}
                    badge={
                      report.verdictStatus ? (
                        <StatusPill status={report.verdictStatus} />
                      ) : undefined
                    }
                    labels={{ open: copy.openFile(month) }}
                    onOpen={() =>
                      void openClosed(report.periodMonth.slice(0, 7))
                    }
                  />
                );
              })}
            </div>
          </Card>
        )}
      </section>

      <ReportPreviewDialog
        open={selection !== null}
        onClose={close}
        heading={heading}
        stamp={stamp}
        variant={variant}
        status={status}
        data={previewData}
        onRetry={() => {
          if (selection?.kind === "live") void openLive(selection.stamp);
          else if (selection) void openClosed(selection.period);
        }}
      />

      {printDoc && (
        <div className="report-print-source" aria-hidden>
          <ReportDocument report={printDoc.data} variant={printDoc.variant} />
        </div>
      )}
    </div>
  );
}
