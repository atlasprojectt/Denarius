"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  RiArrowDownLine,
  RiArrowRightSLine,
  RiArrowUpDownLine,
  RiArrowUpLine,
  RiPriceTag3Line,
  RiSearchLine,
} from "@remixicon/react";

import { StateBadge } from "@/components/domain/state-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cut, TICKS } from "@/lib/bars";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";

export type ExploreRowState = "default" | "unpriced" | "unattributed";

export type ExploreRow = {
  id: string;
  label: string;
  amount: number | null;
  originalUsd?: number;
  tokens?: number;
  share: number;
  href?: string;
  note?: string;
  state?: ExploreRowState;
  actionLabel?: string;
};

type SortKey = "label" | "amount" | "tokens";
type SortState = { key: SortKey; direction: "asc" | "desc" };

const copy = {
  search: "Buscar nesta seção",
  noResults: "Nenhum resultado para esta busca.",
  unpricedTitle: "Modelos sem precificação",
  unpricedBadge: "Sem preço",
  share: (label: string) => `Participação de ${label} no total`,
  action: (label: string) => `Mapear o gasto não atribuído de ${label}`,
};

const compact = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function sortValue(row: ExploreRow, key: SortKey): string | number {
  if (key === "label") return row.label;
  return row[key] ?? -1;
}

function sortRows(rows: ExploreRow[], sort: SortState): ExploreRow[] {
  return [...rows].sort((a, b) => {
    const left = sortValue(a, sort.key);
    const right = sortValue(b, sort.key);
    const result =
      typeof left === "string"
        ? left.localeCompare(String(right), "pt-BR")
        : Number(left) - Number(right);
    return sort.direction === "asc" ? result : -result;
  });
}

function SortButton({
  field,
  sort,
  align = "left",
  onSort,
  children,
}: {
  field: SortKey;
  sort: SortState;
  align?: "left" | "right";
  onSort: (key: SortKey) => void;
  children: React.ReactNode;
}) {
  const active = sort.key === field;

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={() => onSort(field)}
      className={cn(
        "group/sort h-9 w-full rounded-md px-2 text-[11px] font-medium hover:bg-muted/40",
        align === "right" ? "justify-end" : "justify-start",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {children}
      {active ? (
        sort.direction === "desc" ? (
          <RiArrowDownLine className="size-3" aria-hidden />
        ) : (
          <RiArrowUpLine className="size-3" aria-hidden />
        )
      ) : (
        <RiArrowUpDownLine
          className="size-3 opacity-0 transition-opacity duration-(--motion-duration-fast) ease-(--motion-ease-standard) group-hover/sort:opacity-30 group-focus-visible/sort:opacity-30"
          aria-hidden
        />
      )}
    </Button>
  );
}

function RankBar({ row, index }: { row: ExploreRow; index: number }) {
  const share = Math.min(1, Math.max(0, row.share));

  return (
    <div
      className="relative mt-2 h-1.5 w-full"
      role="img"
      aria-label={copy.share(row.label)}
    >
      <div
        aria-hidden
        className="absolute inset-0 text-foreground/15"
        style={TICKS}
      />
      <div
        data-reveal-bar
        aria-hidden
        className="absolute inset-0 text-brand-accent"
        style={{
          ...TICKS,
          clipPath: cut(0, share),
          animationDelay: `${80 + index * 65}ms`,
        }}
      />
    </div>
  );
}

function MoneyValue({
  row,
  currency,
}: {
  row: ExploreRow;
  currency: string;
}) {
  if (row.state === "unpriced") {
    // Amber = data quality (honest numbers, principle #3): an unpriced model is
    // a gap in the total, not neutral trivia.
    return (
      <StateBadge icon={RiPriceTag3Line} tone="amber">
        {copy.unpricedBadge}
      </StateBadge>
    );
  }

  const primary =
    row.amount !== null
      ? money(row.amount, currency)
      : row.originalUsd !== undefined
        ? money(row.originalUsd, "USD")
        : money(0, currency);

  return (
    <div className="text-right tabular-nums">
      <p className="text-[13px] font-medium text-foreground">{primary}</p>
      {row.amount !== null && row.originalUsd !== undefined && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {money(row.originalUsd, "USD")}
        </p>
      )}
    </div>
  );
}

function RowAction({ row }: { row: ExploreRow }) {
  if (!row.href || !row.actionLabel) return null;

  return (
    <Button
      asChild
      variant="tertiary"
      size="xs"
      shape="compact"
      motion="forward"
      className="justify-self-end"
    >
      <Link href={row.href} aria-label={copy.action(row.label)}>
        {row.actionLabel}
        <RiArrowRightSLine data-icon="inline-end" aria-hidden />
      </Link>
    </Button>
  );
}

function DesktopRows({
  rows,
  currency,
  showTokens,
}: {
  rows: ExploreRow[];
  currency: string;
  showTokens: boolean;
}) {
  return (
    <TableBody>
      {rows.map((row, index) => (
        <TableRow
          key={row.id}
          className={cn(
            "h-12 border-border/60 hover:bg-muted/25",
            row.state === "unattributed" && "bg-muted/15",
          )}
        >
          <TableCell className="min-w-64 py-2 text-[13px] whitespace-normal">
            <div className="flex items-center gap-2">
              {row.state === "unattributed" && (
                <span
                  className="size-1.5 shrink-0 rounded-full bg-muted-foreground"
                  aria-hidden
                />
              )}
              <p className="truncate font-medium text-foreground">{row.label}</p>
            </div>
            {row.state !== "unpriced" && (
              <RankBar row={row} index={index} />
            )}
            {row.note && (
              <p className="mt-1 text-[11px] text-muted-foreground">{row.note}</p>
            )}
          </TableCell>
          {showTokens && (
            <TableCell className="w-32 text-right text-xs text-muted-foreground tabular-nums">
              {compact.format(row.tokens ?? 0)}
            </TableCell>
          )}
          <TableCell className="w-44 text-right">
            <MoneyValue row={row} currency={currency} />
          </TableCell>
          <TableCell className="w-24 text-right">
            <RowAction row={row} />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

function MobileRows({
  rows,
  currency,
  showTokens,
}: {
  rows: ExploreRow[];
  currency: string;
  showTokens: boolean;
}) {
  return (
    <div className="grid gap-2 md:hidden">
      {rows.map((row, index) => (
        <article
          key={row.id}
          className="rounded-xl border border-border/70 bg-muted/10 p-3 text-[13px]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {row.state === "unattributed" && (
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-muted-foreground"
                    aria-hidden
                  />
                )}
                <h3 className="truncate font-medium text-foreground">{row.label}</h3>
              </div>
              {showTokens && (
                <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                  {compact.format(row.tokens ?? 0)} tokens
                </p>
              )}
            </div>
            <MoneyValue row={row} currency={currency} />
          </div>
          {row.state !== "unpriced" && (
            <RankBar row={row} index={index} />
          )}
          {row.note && (
            <p className="mt-2 text-[11px] text-muted-foreground">{row.note}</p>
          )}
          {row.href && row.actionLabel && (
            <div className="mt-2 flex justify-end">
              <RowAction row={row} />
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

export function ExploreTable({
  rows,
  currency,
  labelHeader,
  amountHeader,
  tokensHeader,
}: {
  rows: ExploreRow[];
  currency: string;
  labelHeader: string;
  amountHeader: string;
  tokensHeader?: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>({
    key: "amount",
    direction: "desc",
  });

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    const filtered = normalized
      ? rows.filter((row) =>
          row.label.toLocaleLowerCase("pt-BR").includes(normalized),
        )
      : rows;
    return sortRows(filtered, sort);
  }, [query, rows, sort]);

  const pricedRows = visible.filter((row) => row.state !== "unpriced");
  const unpricedRows = visible.filter((row) => row.state === "unpriced");

  function changeSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  const ariaSort = (key: SortKey) =>
    sort.key === key
      ? sort.direction === "asc"
        ? ("ascending" as const)
        : ("descending" as const)
      : undefined;

  return (
    <div
      data-reveal="explore-ranking"
      suppressHydrationWarning
      className="flex flex-col gap-3"
    >
      {rows.length > 10 && (
        <label className="relative block max-w-sm">
          <span className="sr-only">{copy.search}</span>
          <RiSearchLine className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            className="h-8 rounded-lg pl-9 text-xs"
          />
        </label>
      )}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          {copy.noResults}
        </p>
      ) : (
        <>
          {pricedRows.length > 0 && (
            <>
              <MobileRows
                rows={pricedRows}
                currency={currency}
                showTokens={Boolean(tokensHeader)}
              />
              <div className="hidden md:block">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead aria-sort={ariaSort("label")} className="h-9 p-0">
                        <SortButton field="label" sort={sort} onSort={changeSort}>
                          {labelHeader}
                        </SortButton>
                      </TableHead>
                      {tokensHeader && (
                        <TableHead
                          aria-sort={ariaSort("tokens")}
                          className="h-9 w-32 p-0 text-right"
                        >
                          <SortButton
                            field="tokens"
                            sort={sort}
                            align="right"
                            onSort={changeSort}
                          >
                            {tokensHeader}
                          </SortButton>
                        </TableHead>
                      )}
                      <TableHead
                        aria-sort={ariaSort("amount")}
                        className="h-9 w-44 p-0 text-right"
                      >
                        <SortButton
                          field="amount"
                          sort={sort}
                          align="right"
                          onSort={changeSort}
                        >
                          {amountHeader}
                        </SortButton>
                      </TableHead>
                      <TableHead className="h-9 w-24 p-0" />
                    </TableRow>
                  </TableHeader>
                  <DesktopRows
                    rows={pricedRows}
                    currency={currency}
                    showTokens={Boolean(tokensHeader)}
                  />
                </Table>
              </div>
            </>
          )}

          {unpricedRows.length > 0 && (
            <section aria-labelledby="unpriced-models-title" className="mt-1">
              <Separator className="mb-3" />
              <h3
                id="unpriced-models-title"
                className="mb-2 text-xs font-medium text-foreground"
              >
                {copy.unpricedTitle}
              </h3>
              <MobileRows
                rows={unpricedRows}
                currency={currency}
                showTokens={Boolean(tokensHeader)}
              />
              <div className="hidden md:block">
                <Table className="table-fixed">
                  <DesktopRows
                    rows={unpricedRows}
                    currency={currency}
                    showTokens={Boolean(tokensHeader)}
                  />
                </Table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
