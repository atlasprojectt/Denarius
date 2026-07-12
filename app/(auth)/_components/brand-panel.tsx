// Right-hand cover column of the auth pages (login-02/signup-02 layout):
// instead of a stock image, the product's value proposition over a neutral
// charcoal (no navy/slate cast — frontend §4) plus a small static verdict
// vignette that hints at what's inside.

import { LogoWordmark } from "@/components/domain/logo";

const copy = {
  headline: "Você está no controle do gasto com IA?",
  sub: "Orçamentos, projeção de fechamento e avisos antecipados — a resposta em 10 segundos, todos os dias.",
  vignette: {
    verdict: "Dentro do orçamento — no ritmo atual, fecha 8% abaixo.",
    meta: "Projeção de fechamento · dia 18 de 31",
  },
  footnote: "Denarius é read-only: avisa e recomenda, nunca bloqueia.",
};

export function BrandPanel() {
  return (
    <div className="relative hidden flex-col justify-between bg-stone-950 p-10 text-stone-300 lg:flex">
      <LogoWordmark className="h-6 w-auto text-white" />

      <div className="max-w-md">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight text-balance text-white">
          {copy.headline}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-stone-400">
          {copy.sub}
        </p>

        {/* Static product vignette — a verdict line, the product's whole point. */}
        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start gap-2.5">
            <span
              aria-hidden
              className="mt-1.5 size-2 shrink-0 rounded-full bg-[#22c55e]"
            />
            <p className="text-sm/relaxed font-medium text-stone-100">
              {copy.vignette.verdict}
            </p>
          </div>
          <p className="mt-2 pl-[18px] text-xs text-stone-500 tabular-nums">
            {copy.vignette.meta}
          </p>
        </div>
      </div>

      <p className="text-xs text-stone-500">{copy.footnote}</p>
    </div>
  );
}
