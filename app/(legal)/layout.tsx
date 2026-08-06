import Link from "next/link";
import type { ReactNode } from "react";

import { LogoWordmark } from "@/components/domain/logo";

import { LEGAL_CONTACT_EMAIL, legalChrome } from "./copy";

// Public chrome for /privacidade and /termos (issue #57). These are the only
// pages a stranger — or Google's OAuth reviewer — reaches without a session, so
// they carry the brand and a way back to the product, and nothing else.

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/login" aria-label={legalChrome.backToLogin}>
            <LogoWordmark className="h-6 w-auto" />
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/privacidade"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {legalChrome.privacy}
            </Link>
            <Link
              href="/termos"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {legalChrome.terms}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 md:py-14">
        {children}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-6 text-xs text-muted-foreground">
          <p>
            {legalChrome.contactPrefix}{" "}
            <a
              href={`mailto:${LEGAL_CONTACT_EMAIL}`}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {LEGAL_CONTACT_EMAIL}
            </a>
          </p>
          <Link
            href="/login"
            className="underline underline-offset-4 hover:text-foreground"
          >
            {legalChrome.backToLogin}
          </Link>
        </div>
      </footer>
    </div>
  );
}
