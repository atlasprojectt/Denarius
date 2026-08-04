"use client";

import { useEffect } from "react";

import "./globals.css";

// Last-resort boundary: the root layout itself failed, so this component
// replaces the whole document and must render its own <html> and <body>.
//
// Nothing from the root layout survives here — including the no-FOUC theme
// script, so this screen always renders in the light palette. That is a
// deliberate trade: re-running a script on the page that exists precisely
// because something upstream threw is a second chance to fail. It also stays
// clear of app chrome and domain components; a broken shell must not be able
// to break its own error screen.

const copy = {
  title: "Algo saiu do ar",
  description:
    "Não conseguimos carregar o Denarius agora. Seus dados estão intactos — nada foi alterado. Tente novamente em instantes.",
  retry: "Tentar de novo",
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-lg font-medium">{copy.title}</h1>
          <p className="max-w-prose text-sm/relaxed text-muted-foreground">
            {copy.description}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-2 inline-flex h-9 items-center rounded-[10px] border border-border bg-transparent px-4 text-sm font-medium hover:bg-muted/50"
          >
            {copy.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
