"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RiArrowUpDownLine, RiArrowRightSLine, RiSearchLine } from "@remixicon/react";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";

export type ExploreRow = {
  id: string;
  label: string;
  amount: number | null;
  originalUsd?: number;
  tokens?: number;
  href?: string;
  note?: string;
};

type SortKey = "label" | "amount" | "tokens";

const copy = {
  search: "Buscar nesta seção",
  noResults: "Nenhum resultado para esta busca.",
  original: "Valor original",
  open: (label: string) => `Abrir detalhe de ${label}`,
};

const compact = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Module-level (never created during render): a sortable column header. */
function SortButton({
  field,
  onSort,
  children,
}: {
  field: SortKey;
  onSort: (key: SortKey) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      {children}
      <RiArrowUpDownLine className="size-3" aria-hidden />
    </button>
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
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "amount",
    direction: "desc",
  });

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    const filtered = normalized
      ? rows.filter((row) => row.label.toLocaleLowerCase("pt-BR").includes(normalized))
      : rows;
    return [...filtered].sort((a, b) => {
      const left = sort.key === "label" ? a.label : (a[sort.key] ?? -1);
      const right = sort.key === "label" ? b.label : (b[sort.key] ?? -1);
      const result =
        typeof left === "string"
          ? left.localeCompare(String(right), "pt-BR")
          : Number(left) - Number(right);
      return sort.direction === "asc" ? result : -result;
    });
  }, [query, rows, sort]);

  function changeSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.length > 10 && (
        <label className="relative block max-w-sm">
          <span className="sr-only">{copy.search}</span>
          <RiSearchLine className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            className="pl-9"
          />
        </label>
      )}

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
          {copy.noResults}
        </p>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {visible.map((row) => {
              const content = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{row.label}</p>
                      {row.note && (
                        <p className="mt-1 text-xs/relaxed text-muted-foreground">{row.note}</p>
                      )}
                    </div>
                    {row.href && <RiArrowRightSLine className="size-4 shrink-0 text-muted-foreground" />}
                  </div>
                  <dl className={cn("mt-3 grid gap-3 text-xs", tokensHeader ? "grid-cols-2" : "grid-cols-1")}>
                    {tokensHeader && (
                      <div>
                        <dt className="text-muted-foreground">{tokensHeader}</dt>
                        <dd className="mt-0.5 font-medium tabular-nums">
                          {compact.format(row.tokens ?? 0)}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-muted-foreground">{amountHeader}</dt>
                      <dd className="mt-0.5 font-medium tabular-nums">
                        {row.amount === null ? "—" : money(row.amount, currency)}
                      </dd>
                      {row.originalUsd !== undefined && (
                        <dd className="mt-0.5 text-muted-foreground tabular-nums">
                          {copy.original}: {money(row.originalUsd, "USD")}
                        </dd>
                      )}
                    </div>
                  </dl>
                </>
              );
              return row.href ? (
                <Link
                  key={row.id}
                  href={row.href}
                  className="rounded-lg border p-4 outline-none transition-colors hover:border-primary/30 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  {content}
                </Link>
              ) : (
                <div key={row.id} className="rounded-lg border p-4">
                  {content}
                </div>
              );
            })}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortButton field="label" onSort={changeSort}>{labelHeader}</SortButton>
                  </TableHead>
                  {tokensHeader && (
                    <TableHead className="text-right">
                      <SortButton field="tokens" onSort={changeSort}>{tokensHeader}</SortButton>
                    </TableHead>
                  )}
                  <TableHead className="text-right">
                    <SortButton field="amount" onSort={changeSort}>{amountHeader}</SortButton>
                  </TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow
                    key={row.id}
                    role={row.href ? "link" : undefined}
                    tabIndex={row.href ? 0 : undefined}
                    aria-label={row.href ? copy.open(row.label) : undefined}
                    className={cn(
                      row.href && "group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30",
                    )}
                    onClick={() => row.href && router.push(row.href)}
                    onKeyDown={(event) => {
                      if (row.href && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        router.push(row.href);
                      }
                    }}
                  >
                    <TableCell>
                      <p className="font-medium group-hover:text-primary">{row.label}</p>
                      {row.note && <p className="mt-0.5 text-xs text-muted-foreground">{row.note}</p>}
                    </TableCell>
                    {tokensHeader && (
                      <TableCell className="text-right tabular-nums">
                        {compact.format(row.tokens ?? 0)}
                      </TableCell>
                    )}
                    <TableCell className="text-right tabular-nums">
                      <span className="font-medium">
                        {row.amount === null ? "—" : money(row.amount, currency)}
                      </span>
                      {row.originalUsd !== undefined && (
                        <span className="block text-xs text-muted-foreground">
                          {money(row.originalUsd, "USD")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.href && <RiArrowRightSLine className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
