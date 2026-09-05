"use client";

import { useMemo, useState } from "react";
import { RiArrowLeftRightLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { compareModel, type ComparisonUsage } from "@/lib/engine/model-comparison";
import type { ModelPrice } from "@/lib/engine/derive";
import { money } from "@/lib/money";

const copy = {
  action: "Comparar",
  title: "Comparação financeira",
  description: "Mesmo volume observado de tokens · sem afirmar equivalência técnica.",
  source: "Modelo de origem",
  alternative: "Modelo alternativo",
  current: "Custo derivado",
  equivalent: "Custo equivalente",
  delta: "Diferença",
  deltaPct: "Diferença percentual",
  budget: "Encaixe no orçamento",
  projected: "Fechamento projetado",
  unavailable: "Indisponível",
  noAlternatives: "Não há outro modelo precificado neste período.",
  under: "Dentro do orçamento",
  over: "Acima do orçamento",
  unknown: "Sem dados suficientes",
  economics: "Economia de uso",
  totalTokens: "Tokens totais",
  mix: "Participação input / output",
  perMillion: "Custo por 1M tokens",
  coverageLabel: "Cobertura",
  coverage: (days: number) => `${days} ${days === 1 ? "dia observado" : "dias observados"}`,
  coveragePartial: (days: number, expected: number) => `${days} de ${expected} dias observados — cobertura parcial`,
  methodology: (period: string) => `Metodologia · período de ${period}: custo derivado = Σ(tokens × preço vigente na data), em US$; custo por 1M = derivado ÷ tokens × 1M. Sem contagem de requests na fonte — custo por chamada indisponível. Total reportado pelo provedor está no resumo da tela (grão por provedor, não por modelo).`,
  collecting: "Coletando ritmo…",
  collectingNote: "Projeção de fechamento disponível a partir do dia 5 do período.",
  staleNote: (stamp: string) => `Dados de ${stamp}.`,
  noBudgetNote: "Sem orçamento ou câmbio congelado — o encaixe no orçamento fica indisponível.",
  fxNote: (rate: string, date: string) => `Convertido pelo câmbio congelado do período (${rate} por US$ 1, capturado em ${date}).`,
  fxMissingNote: "Câmbio do período indisponível — valores exibidos em US$ (originais), sem conversão estimada.",
  uncostedNote: "Modelo sem preço cadastrado — o custo equivalente fica indisponível em vez de estimado.",
  partialNote: "Cobertura parcial do período — o fechamento projetado fica indisponível.",
  disclaimer: "A comparação usa o mesmo volume observado e não representa equivalência técnica entre modelos.",
};

export function ModelComparisonDrawer({
  source,
  usage,
  prices,
  budgetUsd,
  projectedCostUsd,
  expectedDays,
  currency,
  fxRate,
  fxDate,
  lastSyncAt,
  dayOfPeriod,
  periodLabel,
  economics,
}: {
  source: { provider: string; model: string };
  usage: ComparisonUsage[];
  prices: ModelPrice[];
  budgetUsd?: number | null;
  projectedCostUsd?: number | null;
  expectedDays?: number;
  currency: string;
  fxRate: number | null;
  fxDate: string | null;
  lastSyncAt?: string | null;
  dayOfPeriod?: number;
  periodLabel: string;
  economics: {
    derivedCostUsd: number | null;
    costPerMillionUsd: number | null;
    uncosted: boolean;
    coverage: { start: string | null; end: string | null; observedDays: number; expectedDays: number | null; complete: boolean | null };
  };
}) {
  const [open, setOpen] = useState(false);
  const alternatives = useMemo(() => prices.filter((price) => !(price.provider === source.provider && price.model === source.model)).filter((price, index, all) => all.findIndex((item) => item.provider === price.provider && item.model === price.model) === index), [prices, source]);
  const [selected, setSelected] = useState("");
  const alternative = alternatives.find((price) => `${price.provider}:${price.model}` === selected);
  const result = alternative ? compareModel({ usage, alternative, prices, budget: budgetUsd, projectedCostUsd, expectedDays }) : null;
  const collecting = dayOfPeriod !== undefined && dayOfPeriod < 5;
  // Display-primary money: USD facts convert at the frozen period rate; without
  // a rate the original USD stands with the disclosure — never a guess.
  const show = (usd: number | null): string => {
    if (usd === null) return copy.unavailable;
    if (fxRate !== null && fxRate > 0) return `${money(usd * fxRate, currency)} (${money(usd, "USD")})`;
    return money(usd, "USD");
  };
  const perMillion = show(economics.costPerMillionUsd);
  const coverage = economics.coverage.expectedDays !== null && economics.coverage.expectedDays !== undefined
    ? copy.coveragePartial(economics.coverage.observedDays, economics.coverage.expectedDays)
    : copy.coverage(economics.coverage.observedDays);
  return <>
    <Button type="button" variant="tertiary" size="xs" shape="full" onClick={() => setOpen(true)} aria-label={`${copy.action} ${source.model}`}><RiArrowLeftRightLine aria-hidden />{copy.action}</Button>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md"><SheetHeader className="border-b px-5 py-5 pr-12"><SheetTitle>{copy.title}</SheetTitle><SheetDescription>{copy.description}</SheetDescription></SheetHeader><div className="grid gap-5 p-5">
      <div className="grid gap-1"><p className="text-[11px] text-muted-foreground">{copy.source}</p><p className="font-medium">{source.provider} · {source.model}</p></div>
      {lastSyncAt && <p className="text-[11px] text-muted-foreground tabular-nums">{copy.staleNote(lastSyncAt)}</p>}
      {alternatives.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{copy.noAlternatives}</p> : <>
        <label className="grid gap-2"><span className="text-xs font-medium">{copy.alternative}</span><Select value={selected} onValueChange={(next) => setSelected(next ?? "")}><SelectTrigger><SelectValue placeholder={copy.alternative} /></SelectTrigger><SelectContent>{alternatives.map((price) => <SelectItem key={`${price.provider}:${price.model}`} value={`${price.provider}:${price.model}`}>{price.provider} · {price.model}</SelectItem>)}</SelectContent></Select></label>
        {result && <div className="grid gap-4"><div className="grid grid-cols-2 gap-2"><Metric label={copy.current} value={show(result.sourceCostUsd)} /><Metric label={copy.equivalent} value={show(result.equivalentCostUsd)} /></div><div className="grid gap-2 rounded-lg border border-border p-3"><Row label={copy.delta} value={result.deltaUsd === null ? copy.unavailable : show(result.deltaUsd)} /><Row label={copy.deltaPct} value={result.deltaPct === null ? copy.unavailable : `${(result.deltaPct * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} /><Row label={copy.budget} value={result.budgetFit === "under" ? copy.under : result.budgetFit === "over" ? copy.over : copy.unknown} /><Row label={copy.projected} value={collecting ? copy.collecting : show(result.projectedCostUsd)} /></div>
          {result.status === "uncosted" && <p className="text-xs text-muted-foreground">{copy.uncostedNote}</p>}
          {result.partialCoverage && <p className="text-xs text-muted-foreground">{copy.partialNote}</p>}
          {budgetUsd == null && <p className="text-xs text-muted-foreground">{copy.noBudgetNote}</p>}
          {collecting && <p className="text-xs text-muted-foreground">{copy.collectingNote}</p>}
          <div className="grid gap-2 border-t border-border pt-4"><h3 className="text-xs font-medium">{copy.economics}</h3><Row label={copy.totalTokens} value={(result.inputTokens + result.outputTokens).toLocaleString("pt-BR")} /><Row label={copy.mix} value={`${result.inputTokens.toLocaleString("pt-BR")} / ${result.outputTokens.toLocaleString("pt-BR")}`} /><Row label={copy.perMillion} value={perMillion} /><Row label={copy.coverageLabel} value={coverage} /></div>
          <p className="text-xs text-muted-foreground">{copy.methodology(periodLabel)}</p>
          <p className="text-xs text-muted-foreground">{fxRate !== null && fxRate > 0 ? copy.fxNote(money(fxRate, currency), fxDate ?? "—") : copy.fxMissingNote}</p>
          <p className="text-xs text-muted-foreground">{copy.disclaimer}</p></div>}
      </>}
    </div></SheetContent></Sheet>
  </>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="grid gap-1 rounded-lg border border-border p-3"><span className="text-[11px] text-muted-foreground">{label}</span><strong className="tabular-nums">{value}</strong></div>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground">{label}</span><strong className="tabular-nums">{value}</strong></div>; }
