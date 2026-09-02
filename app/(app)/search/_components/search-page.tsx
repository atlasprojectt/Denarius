"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RiArrowRightSLine,
  RiFileChartLine,
  RiPlugLine,
  RiSearchLine,
  RiTeamLine,
  RiToolsLine,
} from "@remixicon/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchWorkspace } from "@/lib/search/actions";
import {
  MAX_SEARCH_LENGTH,
  MIN_SEARCH_LENGTH,
} from "@/lib/search/search";
import type {
  SearchResponse,
  SearchResult,
  SearchResultType,
} from "@/lib/search/types";
import { SEARCH_FOCUS_EVENT } from "@/lib/search/shortcut";
import { cn } from "@/lib/utils";

const copy = {
  label: "Buscar no Denarius",
  placeholder: "Buscar no Denarius...",
  initialTitle: "Encontre o que procura",
  initialDescription:
    "Encontre times, relatórios e, se você for administrador, assinaturas e conexões do workspace.",
  searching: "Pesquisando...",
  partial: "Algumas categorias não puderam ser pesquisadas agora.",
  error: "Não foi possível pesquisar agora.",
  retry: "Tentar novamente",
  noResults: (query: string) => `Nenhum resultado para “${query}”`,
  noResultsHint: "Tente outro termo.",
};

const ICONS: Record<SearchResultType, React.ComponentType<{ className?: string }>> = {
  team: RiTeamLine,
  report: RiFileChartLine,
  subscription: RiToolsLine,
  connection: RiPlugLine,
};

export function SearchPage({
  initialQuery,
  initialResponse,
}: {
  initialQuery: string;
  initialResponse: SearchResponse;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [response, setResponse] = useState(initialResponse);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const requestSequence = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () => response.groups.flatMap((group) => group.results),
    [response.groups],
  );

  const runSearch = useCallback(async (value: string) => {
    const normalized = value.trim();
    const sequence = ++requestSequence.current;
    if (normalized.length < MIN_SEARCH_LENGTH) {
      setLoading(false);
      setResponse({ status: "idle", groups: [] });
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
    if (query === initialQuery) return;
    const timer = window.setTimeout(() => {
      const url = query.trim().length >= MIN_SEARCH_LENGTH
        ? `/search?q=${encodeURIComponent(query.trim())}`
        : "/search";
      window.history.replaceState(window.history.state, "", url);
      void runSearch(query);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [initialQuery, query, runSearch]);

  useEffect(() => {
    const restore = () => {
      const value = new URL(window.location.href).searchParams.get("q") ?? "";
      setQuery(value);
      void runSearch(value);
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [runSearch]);

  useEffect(() => {
    const focusSearch = () => inputRef.current?.focus();
    window.addEventListener(SEARCH_FOCUS_EVENT, focusSearch);
    return () => window.removeEventListener(SEARCH_FOCUS_EVENT, focusSearch);
  }, []);

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
      router.push(results[activeIndex].href);
    } else if (event.key === "Escape") {
      setActiveIndex(-1);
    }
  }

  return (
    <section aria-label={copy.label} className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="relative">
        <RiSearchLine className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
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
          aria-controls="search-results"
          aria-expanded={results.length > 0}
          aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          className="h-12 rounded-xl bg-card pr-28 pl-10 text-sm shadow-none md:text-sm"
        />
        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground" aria-live="polite">
          {loading ? copy.searching : ""}
        </span>
      </div>

      <div id="search-results" role="listbox" aria-label="Resultados da pesquisa" aria-busy={loading}>
        {response.status === "idle" ? (
          <QuietState title={copy.initialTitle} description={copy.initialDescription} />
        ) : response.status === "error" ? (
          <QuietState title={copy.error} description="Tente novamente em alguns instantes.">
            <Button variant="outline" size="sm" onClick={() => void runSearch(query)}>
              {copy.retry}
            </Button>
          </QuietState>
        ) : response.groups.length === 0 ? (
          <QuietState title={copy.noResults(query.trim())} description={copy.noResultsHint} />
        ) : (
          <div className="grid gap-5">
            {response.status === "partial" && (
              <p role="status" className="text-xs text-muted-foreground">{copy.partial}</p>
            )}
            {response.groups.map((group) => (
              <section key={group.type} aria-labelledby={`search-group-${group.type}`}>
                <h2 id={`search-group-${group.type}`} className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.label}
                </h2>
                <Card className="gap-0 overflow-hidden py-0">
                  <div className="divide-y divide-border/60">
                    {group.results.map((result) => {
                      const index = results.findIndex(
                        (candidate) =>
                          candidate.type === result.type && candidate.id === result.id,
                      );
                      return <ResultRow key={`${result.type}-${result.id}`} result={result} index={index} active={activeIndex === index} onActive={() => setActiveIndex(index)} />;
                    })}
                  </div>
                </Card>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ResultRow({ result, index, active, onActive }: { result: SearchResult; index: number; active: boolean; onActive: () => void }) {
  const Icon = ICONS[result.type];
  return (
    <Link
      id={`search-result-${index}`}
      role="option"
      aria-selected={active}
      href={result.href}
      onMouseEnter={onActive}
      onFocus={onActive}
      className={cn("group flex min-h-16 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40", active && "bg-muted/30")}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{result.title}</span>
        {result.subtitle && <span className="block text-xs text-muted-foreground text-pretty">{result.subtitle}</span>}
      </span>
      {result.metadata && <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">{result.metadata}</span>}
      <RiArrowRightSLine className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function QuietState({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 px-6 text-center">
      <div><p className="text-sm font-medium">{title}</p><p className="mt-1 max-w-lg text-sm text-muted-foreground">{description}</p></div>
      {children}
    </div>
  );
}
