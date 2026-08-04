import Link from "next/link";
import { RiCompass3Line } from "@remixicon/react";

import { EmptyState } from "@/components/domain/empty-state";
import { PageContainer } from "@/components/domain/page-container";

// App-group not-found: reached via `notFound()` from inside the shell
// (today only the team drill-down with an unknown id), so it keeps the
// sidebar and points back to Times.

const copy = {
  title: "Página não encontrada",
  description: "Este time ou endereço não existe dentro do Denarius.",
  cta: "Ir para Times",
};

export default function AppNotFound() {
  return (
    <PageContainer variant="settings" className="flex-1">
      <EmptyState
        icon={<RiCompass3Line />}
        title={copy.title}
        description={copy.description}
        primaryAction={<Link href="/times">{copy.cta}</Link>}
      />
    </PageContainer>
  );
}
