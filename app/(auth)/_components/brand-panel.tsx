// Right-hand narrative cover column (two-column auth layout): the product's
// value proposition plus a small static verdict vignette. Used by the invite
// accept page; login carries the image-only CoverPanel instead. Callers may
// provide a page-specific cover image or keep the neutral fallback.

import Image from "next/image";
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

export function BrandPanel({ imageSrc }: { imageSrc?: string } = {}) {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-stone-950 p-10 text-stone-300 lg:flex">
      {imageSrc ? (
        <>
          <Image
            src={imageSrc}
            alt=""
            fill
            priority
            sizes="50vw"
            className="object-cover object-center"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-stone-950/75 via-stone-950/30 to-transparent"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-stone-950/25"
          />
        </>
      ) : null}

      <LogoWordmark className="relative z-10 h-6 w-auto text-white" />

      <div className="relative z-10 max-w-md">
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

      <p className="relative z-10 text-xs text-stone-400">{copy.footnote}</p>
    </div>
  );
}
