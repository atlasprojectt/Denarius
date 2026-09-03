"use client";

import { useMemo, useState } from "react";
import { RiArrowLeftRightLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { compareModel, type ComparisonUsage } from "@/lib/engine/model-comparison";
import type { ModelPrice } from "@/lib/engine/derive";
import { money } from "@/lib/money";

const copy = { action: "Comparar", title: "Comparação financeira", description: "Mesmo volume observado de tokens · sem afirmar equivalência técnica.", source: "Modelo de origem", alternative: "Modelo alternativo", current: "Custo derivado", equivalent: "Custo equivalente", delta: "Diferença", deltaPct: "Diferença percentual", budget: "Encaixe no orçamento", projected: "Fechamento projetado", unavailable: "Indisponível", noAlternatives: "Não há outro modelo precificado neste período.", under: "Dentro do orçamento", over: "Acima do orçamento", unknown: "Sem dados suficientes", economics: "Economia de uso", totalTokens: "Tokens totais", mix: "Participação input / output", perMillion: "Custo por 1M tokens", coverageLabel: "Cobertura", coverage: (days: number) => `${days} ${days === 1 ? "dia observado" : "dias observados"}`, disclaimer: "A comparação usa o mesmo volume observado e não representa equivalência técnica entre modelos." };

export function ModelComparisonDrawer({ source, usage, prices, budget, projectedCost, expectedDays }: { source: { provider: string; model: string }; usage: ComparisonUsage[]; prices: ModelPrice[]; budget?: number | null; projectedCost?: number | null; expectedDays?: number }) {
  const [open, setOpen] = useState(false);
  const alternatives = useMemo(() => prices.filter((price) => !(price.provider === source.provider && price.model === source.model)).filter((price, index, all) => all.findIndex((item) => item.provider === price.provider && item.model === price.model) === index), [prices, source]);
  const [selected, setSelected] = useState("");
  const alternative = alternatives.find((price) => `${price.provider}:${price.model}` === selected);
  const result = alternative ? compareModel({ usage, alternative, prices, budget, projectedCostUsd: projectedCost, expectedDays }) : null;
  return <>
    <Button type="button" variant="tertiary" size="xs" shape="full" onClick={() => setOpen(true)} aria-label={`${copy.action} ${source.model}`}><RiArrowLeftRightLine aria-hidden />{copy.action}</Button>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md"><SheetHeader className="border-b px-5 py-5 pr-12"><SheetTitle>{copy.title}</SheetTitle><SheetDescription>{copy.description}</SheetDescription></SheetHeader><div className="grid gap-5 p-5">
      <div className="grid gap-1"><p className="text-[11px] text-muted-foreground">{copy.source}</p><p className="font-medium">{source.provider} · {source.model}</p></div>
      {alternatives.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{copy.noAlternatives}</p> : <>
        <label className="grid gap-2"><span className="text-xs font-medium">{copy.alternative}</span><Select value={selected} onValueChange={(next) => setSelected(next ?? "")}><SelectTrigger><SelectValue placeholder={copy.alternative} /></SelectTrigger><SelectContent>{alternatives.map((price) => <SelectItem key={`${price.provider}:${price.model}`} value={`${price.provider}:${price.model}`}>{price.provider} · {price.model}</SelectItem>)}</SelectContent></Select></label>
        {result && <div className="grid gap-4"><div className="grid grid-cols-2 gap-2"><Metric label={copy.current} value={result.sourceCostUsd === null ? copy.unavailable : money(result.sourceCostUsd, "USD")} /><Metric label={copy.equivalent} value={result.equivalentCostUsd === null ? copy.unavailable : money(result.equivalentCostUsd, "USD")} /></div><div className="grid gap-2 rounded-lg border border-border/70 p-3"><Row label={copy.delta} value={result.deltaUsd === null ? copy.unavailable : money(result.deltaUsd, "USD")} /><Row label={copy.deltaPct} value={result.deltaPct === null ? copy.unavailable : `${(result.deltaPct * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} /><Row label={copy.budget} value={result.budgetFit === "under" ? copy.under : result.budgetFit === "over" ? copy.over : copy.unknown} /><Row label={copy.projected} value={result.projectedCostUsd === null ? copy.unavailable : money(result.projectedCostUsd, "USD")} /></div><div className="grid gap-2 border-t border-border/70 pt-4"><h3 className="text-xs font-medium">{copy.economics}</h3><Row label={copy.totalTokens} value={(result.inputTokens + result.outputTokens).toLocaleString("pt-BR")} /><Row label={copy.mix} value={`${result.inputTokens.toLocaleString("pt-BR")} / ${result.outputTokens.toLocaleString("pt-BR")}`} /><Row label={copy.perMillion} value={result.sourceCostUsd !== null && result.inputTokens + result.outputTokens > 0 ? money(result.sourceCostUsd / (result.inputTokens + result.outputTokens) * 1_000_000, "USD") : copy.unavailable} /><Row label={copy.coverageLabel} value={copy.coverage(result.coverageDays)} /></div><p className="text-xs text-muted-foreground">{copy.disclaimer}</p></div>}
      </>}
    </div></SheetContent></Sheet>
  </>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="grid gap-1 rounded-lg border border-border/70 p-3"><span className="text-[11px] text-muted-foreground">{label}</span><strong className="tabular-nums">{value}</strong></div>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground">{label}</span><strong className="tabular-nums">{value}</strong></div>; }
