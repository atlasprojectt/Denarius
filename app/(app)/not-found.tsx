import Link from "next/link";
import { RiCompass3Line } from "@remixicon/react";

import { EmptyState } from "@/components/domain/empty-state";
import { PageContainer } from "@/components/domain/page-container";

// notFound() raised from inside the app shell — today only the team drill-down,
// reached with an id that doesn't belong to this tenant (RLS makes another
// tenant's team indistinguishable from a deleted one, which is the point).
// The chrome survives, so the user keeps their bearings.

const copy = {
  title: "Não encontramos esta página",
  description:
    "O endereço pode ter mudado, ou o time deixou de existir. As telas do lado continuam funcionando normalmente.",
  teams: "Ver times",
  home: "Ir para o início",
};

export default function AppNotFound() {
  return (
    <PageContainer variant="wide" className="gap-6">
      <EmptyState
        icon={<RiCompass3Line />}
        title={copy.title}
        description={copy.description}
        primaryAction={<Link href="/times">{copy.teams}</Link>}
        secondaryAction={<Link href="/">{copy.home}</Link>}
      />
    </PageContainer>
  );
}
