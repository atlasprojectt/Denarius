"use client";

import Link from "next/link";
import { RiErrorWarningLine } from "@remixicon/react";

import { EmptyState } from "@/components/domain/empty-state";
import { PageContainer } from "@/components/domain/page-container";
import { Button } from "@/components/ui/button";

// App-group error boundary: the sidebar and navigation stay mounted (this
// file lives inside the (app) layout), so a failure in one route still lets
// the user move elsewhere. Offers a retry through the boundary's `reset`.

const copy = {
  title: "Algo deu errado",
  description:
    "Não foi possível carregar esta página. Tente novamente ou volte para o início.",
  retry: "Tentar novamente",
  home: "Ir para o início",
};

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageContainer variant="settings" className="flex-1 gap-4">
      <EmptyState
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
    </PageContainer>
  );
}
