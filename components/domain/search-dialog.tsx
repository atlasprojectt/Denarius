"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RiArrowRightSLine,
  RiCloseLine,
  RiFileChartLine,
  RiPlugLine,
  RiSearchLine,
  RiTeamLine,
  RiToolsLine,
} from "@remixicon/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spokes } from "@/components/loading-ui/spokes";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchWorkspace } from "@/lib/search/actions";
import { MAX_SEARCH_LENGTH, MIN_SEARCH_LENGTH } from "@/lib/search/search";
import { SEARCH_OPEN_EVENT } from "@/lib/search/shortcut";
import type {
  SearchResponse,
  SearchResult,
  SearchResultType,
} from "@/lib/search/types";
import { cn } from "@/lib/utils";

const copy = {
  title: "Pesquisa",
  description: "Encontre recursos do workspace e abra o destino diretamente.",
  label: "Buscar no Denarius",
  placeholder: "Buscar no Denarius...",
  searching: "Pesquisando…",
  partial: "Algumas categorias não puderam ser pesquisadas agora.",
  error: "Não foi possível pesquisar agora.",
  errorHint: "Tente novamente em alguns instantes.",
  retry: "Tentar novamente",
  results: "Resultados da pesquisa",
  close: "Fechar pesquisa",
  noResults: (query: string) => `Nenhum resultado para “${query}”`,
  noResultsHint: "Tente outro termo.",
};

const ICONS: Record<SearchResultType, React.ComponentType<{ className?: string }>> = {
  team: RiTeamLine,
  report: RiFileChartLine,
  subscription: RiToolsLine,
  connection: RiPlugLine,
};

const IDLE_RESPONSE: SearchResponse = { status: "idle", groups: [] };

export function SearchDialog() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<SearchResponse>(IDLE_RESPONSE);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const requestSequence = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () => response.groups.flatMap((group) => group.results),
    [response.groups],
  );
  const showResults =
    query.trim().length >= MIN_SEARCH_LENGTH && response.status !== "idle";

  const focusInput = useCallback(() => {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const reset = useCallback(() => {
    requestSequence.current += 1;
    setQuery("");
    setResponse(IDLE_RESPONSE);
    setLoading(false);
    setActiveIndex(-1);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) focusInput();
      else reset();
    },
    [focusInput, reset],
  );

  const runSearch = useCallback(async (value: string) => {
    const normalized = value.trim();
    const sequence = ++requestSequence.current;
    if (normalized.length < MIN_SEARCH_LENGTH) {
      setLoading(false);
      setResponse(IDLE_RESPONSE);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    try {
      const nextResponse = await searchWorkspace(normalized);
      if (sequence !== requestSequence.current) return;
      setResponse(nextResponse);
      setActiveIndex(nextResponse.groups.some((group) => group.results.length) ? 0 : -1);
    } catch {
      if (sequence !== requestSequence.current) return;
      setResponse({ status: "error", groups: [] });
      setActiveIndex(-1);
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void runSearch(query), 250);
    return () => window.clearTimeout(timer);
  }, [open, query, runSearch]);

  useEffect(() => {
    function handleOpenRequest() {
      if (open) focusInput();
      else setOpen(true);
    }

    function handleShortcut(event: KeyboardEvent) {
      if (
        event.repeat ||
        !event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        event.key.toLocaleLowerCase("pt-BR") !== "p"
      ) {
        return;
      }
      event.preventDefault();
      handleOpenChange(!open);
    }

    window.addEventListener(SEARCH_OPEN_EVENT, handleOpenRequest);
    window.addEventListener("keydown", handleShortcut, { capture: true });
    return () => {
      window.removeEventListener(SEARCH_OPEN_EVENT, handleOpenRequest);
      window.removeEventListener("keydown", handleShortcut, { capture: true });
    };
  }, [focusInput, handleOpenChange, open]);

  function selectResult(result: SearchResult) {
    handleOpenChange(false);
    router.push(result.href);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectResult(results[activeIndex]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-3xl"
        overlayClassName="bg-black/80 supports-backdrop-filter:!backdrop-blur-[2px]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "relative p-4 pr-12 transition-colors duration-(--motion-duration-standard) ease-(--motion-ease-standard)",
            showResults && "border-b border-border",
          )}
        >
          <DialogClose
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={copy.close}
                className="absolute top-1/2 right-4 z-10 -translate-y-1/2"
              />
            }
          >
            <RiCloseLine />
          </DialogClose>
          <RiSearchLine className="pointer-events-none absolute top-1/2 left-7 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            autoFocus
            type="search"
            value={query}
            maxLength={MAX_SEARCH_LENGTH}
            placeholder={copy.placeholder}
            aria-label={copy.label}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={showResults ? "search-dialog-results" : undefined}
            aria-expanded={results.length > 0}
            aria-activedescendant={
              activeIndex >= 0 ? `search-dialog-result-${activeIndex}` : undefined
            }
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            className="h-12 rounded-xl bg-card pr-28 pl-10 text-sm shadow-none focus-visible:border-ring/30 focus-visible:ring-1 focus-visible:ring-ring/10 md:text-sm"
          />
          <span
            className="absolute top-1/2 right-16 flex -translate-y-1/2 items-center gap-1.5 text-xs text-muted-foreground"
            aria-live="polite"
          >
            {loading ? (
              <>
                <Spokes
                  className="size-3.5 shrink-0 motion-reduce:[animation:none]"
                  aria-hidden
                />
                {copy.searching}
              </>
            ) : null}
          </span>
        </div>

        <AnimatePresence initial={false}>
          {showResults && (
            <motion.div
              data-search-results-panel
              initial={reduceMotion ? false : { height: 0, opacity: 0, y: 6 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={reduceMotion ? { height: 0, opacity: 0 } : { height: 0, opacity: 0, y: 6 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }
              }
              className="min-h-0 overflow-hidden"
            >
              <div
                id="search-dialog-results"
                role="listbox"
                aria-label={copy.results}
                aria-busy={loading}
                className="max-h-[min(34rem,calc(100dvh-7rem))] overflow-y-auto p-4"
              >
                {response.status === "error" ? (
                  <QuietState title={copy.error} description={copy.errorHint}>
                    <Button
                      variant="outline"
                      size="sm"
                      loading={loading}
                      loadingText={copy.retry}
                      onClick={() => void runSearch(query)}
                    >
                      {copy.retry}
                    </Button>
                  </QuietState>
                ) : response.groups.length === 0 ? (
                  <QuietState title={copy.noResults(query.trim())} description={copy.noResultsHint} />
                ) : (
                  <div className="grid gap-5">
                    {response.status === "partial" && (
                      <p role="status" className="text-xs text-muted-foreground">
                        {copy.partial}
                      </p>
                    )}
                    {response.groups.map((group) => (
                      <section key={group.type} aria-labelledby={`search-dialog-group-${group.type}`}>
                        <h2
                          id={`search-dialog-group-${group.type}`}
                          className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                        >
                          {group.label}
                        </h2>
                        <Card className="gap-0 overflow-hidden py-0">
                          <div className="divide-y divide-border">
                            {group.results.map((result) => {
                              const index = results.findIndex(
                                (candidate) =>
                                  candidate.type === result.type && candidate.id === result.id,
                              );
                              return (
                                <ResultRow
                                  key={`${result.type}-${result.id}`}
                                  result={result}
                                  index={index}
                                  active={activeIndex === index}
                                  onActive={() => setActiveIndex(index)}
                                  onSelect={() => handleOpenChange(false)}
                                />
                              );
                            })}
                          </div>
                        </Card>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function ResultRow({
  result,
  index,
  active,
  onActive,
  onSelect,
}: {
  result: SearchResult;
  index: number;
  active: boolean;
  onActive: () => void;
  onSelect: () => void;
}) {
  const Icon = ICONS[result.type];
  return (
    <Link
      id={`search-dialog-result-${index}`}
      role="option"
      aria-selected={active}
      href={result.href}
      onClick={onSelect}
      onMouseEnter={onActive}
      onFocus={onActive}
      className={cn(
        "group flex min-h-16 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40",
        active && "bg-surface-selected",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{result.title}</span>
        {result.subtitle && (
          <span className="block text-pretty text-xs text-muted-foreground">
            {result.subtitle}
          </span>
        )}
      </span>
      {result.metadata && (
        <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">
          {result.metadata}
        </span>
      )}
      <RiArrowRightSLine className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function QuietState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 text-center">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 max-w-lg text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
