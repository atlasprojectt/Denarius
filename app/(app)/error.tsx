"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RiErrorWarningLine } from "@remixicon/react";

import { EmptyState } from "@/components/domain/empty-state";
import { PageContainer } from "@/components/domain/page-container";

// Route-level failure inside the app shell. The sidebar and navigation survive
// this boundary, so the user is never stranded: retry re-renders the segment,
// and every other destination stays one click away.
//
// Tone is deliberately neutral — no red, no alarm styling. The semaphore is
// reserved for budget status (product principle #5), and an app error says
// nothing about whether the company is over budget. Nothing about the
// exception reaches the screen either; it goes to the console for the
// operator, never to the executive reading it.

const copy = {
  title: "Não conseguimos carregar esta tela",
  description:
    "A falha é nossa, não dos seus dados — nada foi alterado. Tente de novo; se persistir, os números continuam disponíveis nas outras telas.",
  retry: "Tentar de novo",
  home: "Ir para o início",
};

export default function AppError({
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
    <PageContainer variant="wide" className="gap-6">
      <EmptyState
        icon={<RiErrorWarningLine />}
        title={copy.title}
        description={copy.description}
        primaryAction={
          <button type="button" onClick={reset}>
            {copy.retry}
          </button>
        }
        secondaryAction={<Link href="/">{copy.home}</Link>}
      />
    </PageContainer>
  );
}
