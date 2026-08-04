import Link from "next/link";
import { RiCompass3Line } from "@remixicon/react";

import { EmptyState } from "@/components/domain/empty-state";
import { LogoWordmark } from "@/components/domain/logo";

// Root not-found: an unmatched URL outside the authenticated app shell (e.g.
// before login), so it carries its own wordmark and a link home rather than
// relying on the (app) sidebar.

const copy = {
  title: "Página não encontrada",
  description: "Este endereço não existe ou foi movido.",
  home: "Ir para o início",
};

export default function RootNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <LogoWordmark className="h-6 w-auto" />
      <EmptyState
        className="max-w-sm"
        icon={<RiCompass3Line />}
        title={copy.title}
        description={copy.description}
        primaryAction={<Link href="/">{copy.home}</Link>}
      />
    </div>
  );
}
