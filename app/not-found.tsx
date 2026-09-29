import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Compass01Icon } from "@hugeicons/core-free-icons";

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

// Rendered per request so Next can stamp the CSP nonce on its inline flight
// scripts (issue #60); prerendered, they ship without one and the strict
// `script-src` blocks them.
export const dynamic = "force-dynamic";

export default function RootNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <LogoWordmark className="h-6 w-auto" />
      <EmptyState
        className="max-w-sm"
        icon={<HugeiconsIcon icon={Compass01Icon} />}
        title={copy.title}
        description={copy.description}
        primaryAction={<Link href="/">{copy.home}</Link>}
      />
    </div>
  );
}
