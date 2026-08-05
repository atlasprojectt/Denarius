"use client";

import { DM_Sans, Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { RiErrorWarningLine } from "@remixicon/react";

import { EmptyState } from "@/components/domain/empty-state";
import { LogoWordmark } from "@/components/domain/logo";
import { Button } from "@/components/ui/button";
import { THEME_SCRIPT } from "@/lib/theme-script";
import { cn } from "@/lib/utils";

// Root error boundary: the app's own root layout failed to render, so this
// file renders its own <html>/<body> instead of relying on app/layout.tsx —
// Next.js requires that for global-error. Re-declares the same fonts and
// theme script as the root layout so the fallback still reads as Denarius,
// not a bare browser error page. The script is IMPORTED rather than copied:
// the CSP admits it by hash, which only holds while both call sites ship the
// identical source (issue #60).

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const copy = {
  title: "Algo deu errado",
  description:
    "Não conseguimos carregar o Denarius agora. Tente novamente em instantes.",
  retry: "Tentar novamente",
  home: "Ir para o início",
};

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        geistSans.variable,
        geistMono.variable,
        dmSans.variable,
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col items-center justify-center gap-6 p-6 font-sans">
        <LogoWordmark className="h-6 w-auto" />
        <EmptyState
          className="max-w-sm"
          icon={<RiErrorWarningLine />}
          title={copy.title}
          description={copy.description}
        />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => reset()}>{copy.retry}</Button>
          <Button variant="outline" asChild>
            <Link href="/">{copy.home}</Link>
          </Button>
        </div>
      </body>
    </html>
  );
}
