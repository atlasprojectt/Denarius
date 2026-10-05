"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Cancel01Icon,
  ChartLineIcon,
  ChevronRightIcon,
  Building01Icon,
  FileChartLineIcon,
  Home05Icon,
  Plug01Icon,
  Search01Icon,
  ToolsIcon,
  UsersIcon,
} from "@hugeicons/core-free-icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spokes } from "@/components/loading-ui/spokes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchWorkspace } from "@/lib/search/actions";
import {
  addRecentSearch,
  parseRecentSearches,
  SEARCH_RECENT_KEY,
  serializeRecentSearches,
} from "@/lib/search/recent";
import { MAX_SEARCH_LENGTH, MIN_SEARCH_LENGTH } from "@/lib/search/search";
import { SEARCH_SCOPES } from "@/lib/search/routes";
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
  placeholder: "Buscar no Denarius…",
  searching: "Pesquisando…",
  partial: "Algumas categorias não puderam ser pesquisadas agora.",
  error: "Não foi possível pesquisar agora.",
  errorHint: "Tente novamente em alguns instantes.",
  retry: "Tentar novamente",
  results: "Resultados da pesquisa",
  scopes: "Pesquisar em",
  recent: "Pesquisas recentes",
  clearRecent: "Limpar histórico",
  quickActions: "Ações rápidas",
  move: "Mover",
  select: "Selecionar",
  quit: "Sair",
  removeRecent: (query: string) => `Remover “${query}” do histórico`,
  noResults: (query: string) => `Nenhum resultado para “${query}”`,
  noResultsHint: "Tente outro termo.",
};

const ICONS: Record<SearchResultType, IconSvgElement> = {
  team: UsersIcon,
  employee: UsersIcon,
  user: UsersIcon,
  report: FileChartLineIcon,
  subscription: ToolsIcon,
  connection: Plug01Icon,
  company: Building01Icon,
  budget: ChartLineIcon,
  route: ChevronRightIcon,
};

const IDLE_RESPONSE: SearchResponse = { status: "idle", groups: [] };

type IdleItem =
  | { kind: "suggestion"; id: string; label: string; query: string; href: string }
  | { kind: "recent"; id: string; label: string; query: string }
  | {
      kind: "action";
      id: string;
      label: string;
      description: string;
      href: string;
      icon: IconSvgElement;
    };

type ActiveItem =
  | { mode: "idle"; index: number }
  | { mode: "results"; index: number }
  | { mode: "none" };

const QUICK_ACTIONS = [
  {
    id: "home",
    label: "Ver cockpit",
    description: "Resumo de gasto e veredito",
    href: "/",
    icon: Home05Icon,
  },
  {
    id: "teams",
    label: "Comparar times",
    description: "Pacing, orçamento e contribuições",
    href: "/times",
    icon: UsersIcon,
  },
  {
    id: "explore",
    label: "Ver composição",
    description: "Modelos de IA e custos fixos",
    href: "/explorar",
    icon: ChartLineIcon,
  },
  {
    id: "reports",
    label: "Abrir relatórios",
    description: "Fechamentos mensais e histórico",
    href: "/relatorios",
    icon: FileChartLineIcon,
  },
] satisfies ReadonlyArray<Omit<Extract<IdleItem, { kind: "action" }>, "kind">>;

export function SearchDialog({ historyScope }: { historyScope: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const recentStorageKey = `${SEARCH_RECENT_KEY}:${historyScope}`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<SearchResponse>(IDLE_RESPONSE);
  const [loading, setLoading] = useState(false);
  const [recentQueries, setRecentQueries] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return parseRecentSearches(window.localStorage.getItem(recentStorageKey));
    } catch {
      return [];
    }
  });
  const [activeItem, setActiveItem] = useState<ActiveItem>({ mode: "none" });
  const requestSequence = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () => response.groups.flatMap((group) => group.results),
    [response.groups],
  );
  const showResults =
    query.trim().length >= MIN_SEARCH_LENGTH && response.status !== "idle";
  const idleItems = useMemo<IdleItem[]>(
    () => [
      ...SEARCH_SCOPES.map((scope) => ({
        kind: "suggestion" as const,
        id: `suggestion-${scope.query}`,
        label: scope.label,
        query: scope.query,
        href: scope.href,
      })),
      ...recentQueries.map((recent) => ({
        kind: "recent" as const,
        id: `recent-${recent}`,
        label: recent,
        query: recent,
      })),
      ...QUICK_ACTIONS.map((action) => ({ kind: "action" as const, ...action })),
    ],
    [recentQueries],
  );

  const focusInput = useCallback(() => {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const reset = useCallback(() => {
    requestSequence.current += 1;
    setQuery("");
    setResponse(IDLE_RESPONSE);
    setLoading(false);
    setActiveItem({ mode: "none" });
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) focusInput();
      else reset();
    },
    [focusInput, reset],
  );

  const rememberSearch = useCallback((value: string) => {
    setRecentQueries((current) => addRecentSearch(current, value));
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentQueries([]);
  }, []);

  const removeRecentSearch = useCallback((value: string) => {
    setRecentQueries((current) => current.filter((queryValue) => queryValue !== value));
  }, []);

  useEffect(() => {
    try {
      if (recentQueries.length === 0) {
        window.localStorage.removeItem(recentStorageKey);
      } else {
        window.localStorage.setItem(recentStorageKey, serializeRecentSearches(recentQueries));
      }
    } catch {
      // Local history is best effort; a blocked storage should not affect search.
    }
  }, [recentQueries, recentStorageKey]);

  const runSearch = useCallback(async (value: string) => {
    const normalized = value.trim();
    const sequence = ++requestSequence.current;
    if (normalized.length < MIN_SEARCH_LENGTH) {
      setLoading(false);
      setResponse(IDLE_RESPONSE);
      setActiveItem({ mode: "none" });
      return;
    }

    setLoading(true);
    try {
      const nextResponse = await searchWorkspace(normalized);
      if (sequence !== requestSequence.current) return;
      setResponse(nextResponse);
      setActiveItem(
        nextResponse.groups.some((group) => group.results.length)
          ? { mode: "results", index: 0 }
          : { mode: "none" },
      );
    } catch {
      if (sequence !== requestSequence.current) return;
      setResponse({ status: "error", groups: [] });
      setActiveItem({ mode: "none" });
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
    rememberSearch(query);
    handleOpenChange(false);
    router.push(result.href);
  }

  function selectIdleItem(item: IdleItem) {
    if (item.kind === "suggestion") {
      handleOpenChange(false);
      router.push(item.href);
      return;
    }
    if (item.kind === "action") {
      handleOpenChange(false);
      router.push(item.href);
      return;
    }

    setQuery(item.query);
    setResponse(IDLE_RESPONSE);
    setActiveItem({ mode: "none" });
    focusInput();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const isResultsMode = showResults;
    const itemCount = isResultsMode ? results.length : idleItems.length;
    if (!itemCount) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveItem((current) => {
        const currentIndex =
          current.mode === (isResultsMode ? "results" : "idle")
            ? current.index
            : direction > 0
              ? -1
              : 0;
        const nextIndex = (currentIndex + direction + itemCount) % itemCount;
        return isResultsMode
          ? { mode: "results", index: nextIndex }
          : { mode: "idle", index: nextIndex };
      });
    } else if (event.key === "Enter") {
      const currentIndex =
        activeItem.mode === (isResultsMode ? "results" : "idle")
          ? activeItem.index
          : 0;
      event.preventDefault();
      if (isResultsMode && results[currentIndex]) {
        selectResult(results[currentIndex]);
      } else if (!isResultsMode && idleItems[currentIndex]) {
        selectIdleItem(idleItems[currentIndex]);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "relative p-4 transition-colors duration-(--motion-duration-standard) ease-(--motion-ease-standard)",
            showResults && "border-b border-border",
          )}
        >
          <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute top-1/2 left-7 size-4 -translate-y-1/2 text-ink-faint" />
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
            aria-controls={showResults ? "search-dialog-results" : "search-dialog-idle"}
            aria-expanded={open}
            aria-activedescendant={
              activeItem.mode === "results"
                ? `search-dialog-result-${activeItem.index}`
                : activeItem.mode === "idle"
                  ? `search-dialog-idle-${activeItem.index}`
                  : undefined
            }
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              if (value.trim().length < MIN_SEARCH_LENGTH) {
                setResponse(IDLE_RESPONSE);
                setActiveItem({ mode: "none" });
              }
            }}
            onKeyDown={handleKeyDown}
            className="h-12 rounded-md bg-card pr-28 pl-10 text-sm shadow-none focus-visible:border-ring/30 focus-visible:ring-1 focus-visible:ring-ring/10 md:text-sm [&::-webkit-search-cancel-button]:appearance-none"
          />
          <span
            className="absolute top-1/2 right-7 flex -translate-y-1/2 items-center gap-1.5 text-xs text-muted-foreground"
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
          {!showResults && (
            <motion.div
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
              <IdlePanel
                id="search-dialog-idle"
                items={idleItems}
                recentQueries={recentQueries}
                activeIndex={activeItem.mode === "idle" ? activeItem.index : -1}
                onActive={(index) => setActiveItem({ mode: "idle", index })}
                onSelect={selectIdleItem}
                onRemoveRecent={removeRecentSearch}
                onClearRecent={clearRecentSearches}
                onScopeSelect={(scope) => {
                  handleOpenChange(false);
                  router.push(scope.href);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

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
                          className="mb-2 label-caps text-muted-foreground"
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
                                  active={activeItem.mode === "results" && activeItem.index === index}
                                  onActive={() => setActiveItem({ mode: "results", index })}
                                  onSelect={() => {
                                    rememberSearch(query);
                                    handleOpenChange(false);
                                  }}
                                />
                              );
                            })}
                          </div>
                        </Card>
                      </section>
                    ))}
                  </div>
                )}
                <KeyboardHints />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function IdlePanel({
  id,
  items,
  recentQueries,
  activeIndex,
  onActive,
  onSelect,
  onRemoveRecent,
  onClearRecent,
  onScopeSelect,
}: {
  id: string;
  items: IdleItem[];
  recentQueries: string[];
  activeIndex: number;
  onActive: (index: number) => void;
  onSelect: (item: IdleItem) => void;
  onRemoveRecent: (query: string) => void;
  onClearRecent: () => void;
  onScopeSelect: (scope: Extract<IdleItem, { kind: "suggestion" }>) => void;
}) {
  const suggestionItems = items.filter((item) => item.kind === "suggestion");
  const recentItems = items.filter((item) => item.kind === "recent");
  const actionItems = items.filter((item) => item.kind === "action");

  const itemIndex = (item: IdleItem) => items.findIndex(({ id: itemId }) => itemId === item.id);

  return (
    <div
      id={id}
      role="listbox"
      aria-label={copy.description}
      className="max-h-[min(34rem,calc(100dvh-7rem))] overflow-y-auto px-4 pb-3"
    >
      <section aria-labelledby="search-dialog-scopes" className="border-b border-border py-3">
        <h2 id="search-dialog-scopes" className="mb-2 label-caps text-muted-foreground">
          {copy.scopes}
        </h2>
        <div className="flex flex-wrap gap-2">
          {suggestionItems.map((item) => {
            const index = itemIndex(item);
            return (
              <button
                key={item.id}
                id={`search-dialog-idle-${index}`}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                onClick={() => onScopeSelect(item)}
                onMouseEnter={() => onActive(index)}
                className={cn(
                  "rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40",
                  activeIndex === index && "bg-surface-selected",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      {recentQueries.length > 0 && (
        <section aria-labelledby="search-dialog-recent" className="border-b border-border py-3">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <h2 id="search-dialog-recent" className="label-caps text-muted-foreground">
              {copy.recent}
            </h2>
            <button
              type="button"
              onClick={onClearRecent}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {copy.clearRecent}
            </button>
          </div>
          <div className="grid gap-0.5">
            {recentItems.map((item) => {
              const index = itemIndex(item);
              return (
                <div
                  key={item.id}
                  id={`search-dialog-idle-${index}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseEnter={() => onActive(index)}
                  className={cn(
                    "flex min-h-10 items-center gap-2 rounded-sm px-2 transition-colors",
                    activeIndex === index && "bg-surface-selected",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
                  >
                    <HugeiconsIcon icon={Search01Icon} className="size-4 shrink-0 text-ink-faint" />
                    <span className="truncate">{item.label}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={copy.removeRecent(item.label)}
                    onClick={() => onRemoveRecent(item.query)}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="search-dialog-actions" className="pt-3">
        <h2 id="search-dialog-actions" className="mb-1.5 label-caps text-muted-foreground">
          {copy.quickActions}
        </h2>
        <div className="grid gap-0.5">
          {actionItems.map((item) => {
            const index = itemIndex(item);
            return (
              <button
                key={item.id}
                id={`search-dialog-idle-${index}`}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                onClick={() => onSelect(item)}
                onMouseEnter={() => onActive(index)}
                className={cn(
                  "group flex min-h-12 items-center gap-3 rounded-sm px-2 text-left outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40",
                  activeIndex === index && "bg-surface-selected",
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
                  <HugeiconsIcon icon={item.icon} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                </span>
                <HugeiconsIcon
                  icon={ChevronRightIcon}
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </button>
            );
          })}
        </div>
      </section>

      <KeyboardHints />
    </div>
  );
}

function KeyboardHints() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <KeyHint value="↑" />
        <KeyHint value="↓" />
        {copy.move}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <KeyHint value="↵" />
        {copy.select}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <KeyHint value="Esc" />
        {copy.quit}
      </span>
    </div>
  );
}

function KeyHint({ value }: { value: string }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded-sm border border-border bg-surface-elevated px-1.5 py-1 text-2xs font-medium leading-none text-foreground">
      {value}
    </kbd>
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
      <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
        <HugeiconsIcon icon={Icon} className="size-4" />
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
      <HugeiconsIcon icon={ChevronRightIcon} className="size-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
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
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border px-6 text-center">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 max-w-lg text-sm text-ink-secondary">{description}</p>
      </div>
      {children}
    </div>
  );
}

