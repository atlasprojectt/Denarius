import Link from "next/link";
import { RiCompass3Line } from "@remixicon/react";

import { EmptyState } from "@/components/domain/empty-state";
import { LogoWordmark } from "@/components/domain/logo";

// Unmatched URL. Next resolves these against the ROOT layout, so there is no
// sidebar to fall back on — the page carries its own wordmark and its own way
// out. Signed-out visitors never reach here (the proxy redirects them to
// /login first), so "início" is a safe destination for whoever does.

const copy = {
  title: "Esta página não existe",
  description:
    "O endereço pode estar incompleto ou ter mudado de lugar. Voltar ao início leva ao veredito do mês.",
  home: "Ir para o início",
};

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-6">
      <LogoWordmark className="h-6 w-auto" />
      <EmptyState
        icon={<RiCompass3Line />}
        title={copy.title}
        description={copy.description}
        primaryAction={<Link href="/">{copy.home}</Link>}
      />
    </main>
  );
}
