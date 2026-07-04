// Right-hand cover column of the auth pages (login-02/signup-02 layout):
// instead of a stock image, the product's value proposition.

import { LogoWordmark } from "@/components/domain/logo";

const copy = {
  headline: "Você está no controle do gasto com IA?",
  sub: "Orçamentos, projeção de fechamento e avisos antecipados — a resposta em 10 segundos, todos os dias.",
  footnote: "Denarius é read-only: avisa e recomenda, nunca bloqueia.",
};

export function BrandPanel() {
  return (
    <div className="relative hidden flex-col justify-between bg-[#0c1322] p-10 text-slate-200 lg:flex">
      <LogoWordmark className="h-6 w-auto text-white" />
      <div className="max-w-md">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
          {copy.headline}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-slate-400">
          {copy.sub}
        </p>
      </div>
      <p className="text-xs text-slate-500">{copy.footnote}</p>
    </div>
  );
}
