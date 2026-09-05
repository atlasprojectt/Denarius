"use client";

import { useEffect, useRef, useState } from "react";

import { copy } from "../copy";

type DownloadCache = {
  url: string | null;
  blob: Blob | null;
  request: Promise<Blob> | null;
  objectUrl: string | null;
};

// Downloads the server-generated PDF for one preview. The blob caches per URL
// so Imprimir→Baixar PDF in one session hits the generator only once. The
// cache is keyed by URL, so switching files never serves a stale document.
export function useReportDownload(pdfUrl: string | null, downloadFilename: string) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<DownloadCache>({
    url: null,
    blob: null,
    request: null,
    objectUrl: null,
  });

  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      if (cache.objectUrl) URL.revokeObjectURL(cache.objectUrl);
    };
  }, []);

  async function loadPdf(url: string): Promise<Blob> {
    const cache = cacheRef.current;
    if (cache.url !== url) {
      cache.url = url;
      cache.blob = null;
      cache.request = null;
    }
    if (cache.request) return cache.request;
    const request = fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401 || response.redirected || response.url.includes("/login")) {
          throw new Error("report-pdf-session");
        }
        if (!response.ok) {
          throw new Error(
            response.status === 404 || response.status >= 500
              ? "report-pdf-unavailable"
              : "report-pdf-failed",
          );
        }
        const contentType = response.headers.get("content-type");
        if (!contentType?.toLowerCase().startsWith("application/pdf")) {
          throw new Error("report-pdf-invalid");
        }
        const blob = await response.blob();
        if (blob.size < 128) throw new Error("report-pdf-invalid");
        cache.blob = blob;
        return blob;
      })
      .catch((fetchError: unknown) => {
        if (cacheRef.current.request === request) cacheRef.current.request = null;
        throw fetchError;
      });
    cache.request = request;
    return request;
  }

  async function download() {
    if (downloading || !pdfUrl) return;
    setError(null);
    setDownloading(true);
    try {
      const cache = cacheRef.current;
      if (!cache.objectUrl || cache.url !== pdfUrl) {
        if (!cache.blob || cache.url !== pdfUrl) await loadPdf(pdfUrl);
        if (!cache.blob) throw new Error("report-pdf-failed");
        cache.objectUrl = URL.createObjectURL(cache.blob);
      }
      const url = cache.objectUrl;
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = downloadFilename;
      anchor.hidden = true;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => {
        if (cacheRef.current.objectUrl === url) {
          URL.revokeObjectURL(url);
          cacheRef.current.objectUrl = null;
        }
      }, 1000);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error && downloadError.message === "report-pdf-session"
          ? copy.sessionError
          : downloadError instanceof Error &&
              downloadError.message === "report-pdf-unavailable"
            ? copy.downloadUnavailable
            : copy.downloadError,
      );
    } finally {
      setDownloading(false);
    }
  }

  return { downloading, error, clearError: () => setError(null), download };
}
