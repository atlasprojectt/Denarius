import Link from "next/link";

import { LogoWordmark } from "@/components/domain/logo";

import { AuthForm } from "../_components/auth-form";
import { CoverPanel } from "../_components/cover-panel";

const copy = {
  privacy: "Privacidade",
  terms: "Termos de uso",
  separator: "·",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const oauthError =
    error === "oauth"
      ? "Não foi possível entrar com o Google. Tente novamente."
      : undefined;

  return (
    <div className="grid min-h-svh bg-surface-canvas lg:grid-cols-[minmax(28rem,0.82fr)_minmax(0,1.18fr)]">
      <div className="flex min-w-0 flex-col gap-4 bg-surface-card px-5 py-6 sm:px-8 md:px-12 md:py-10 lg:px-[clamp(3rem,6vw,6.5rem)]">
        {/* On desktop the wordmark lives on the cover; keep it here for small
            screens where the cover column is hidden. */}
        <div className="flex items-center gap-2 lg:hidden">
          <LogoWordmark className="h-6 w-auto" />
        </div>
        <div className="flex flex-1 items-center justify-center py-8 lg:py-12">
          <div className="w-full max-w-[26rem]">
            <AuthForm oauthError={oauthError} />
          </div>
        </div>
        {/* The legal pages are public and have to be reachable from the only
            screen a stranger sees (issue #57). */}
        <nav className="flex items-center justify-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <Link
            href="/privacidade"
            className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
          >
            {copy.privacy}
          </Link>
          <span aria-hidden>{copy.separator}</span>
          <Link
            href="/termos"
            className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
          >
            {copy.terms}
          </Link>
        </nav>
      </div>
      <CoverPanel />
    </div>
  );
}
