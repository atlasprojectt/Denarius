import { IconHistory } from "@tabler/icons-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ConnectionFreshness } from "@/lib/engine/freshness";

// Honesty in the chrome (frontend §3.2): when a connector's last sync failed or
// went stale, say so — the totals below may be understated. Deliberately NOT a
// semaphore color: green/amber/red are reserved for budget status (product
// principle #5). This is a calm data-quality notice, not an alarm.

const copy = {
  title: "Dados possivelmente desatualizados",
  reconnect: "Reconectar",
};

const providerLabel: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

function detail(item: ConnectionFreshness): string {
  const label = providerLabel[item.provider] ?? item.provider;
  if (item.state === "failed") {
    return `A última sincronização da ${label} falhou — os totais podem estar subestimados.`;
  }
  if (item.state === "never") {
    return `A ${label} ainda não sincronizou — os totais podem estar subestimados.`;
  }
  // stale — express the gap in whole days (≥1 by definition of stale).
  const days = Math.max(1, Math.floor((item.ageHours ?? 24) / 24));
  const unit = days === 1 ? "dia" : "dias";
  return `A ${label} não sincroniza há ${days} ${unit} — os totais podem estar subestimados.`;
}

export function StaleBanner({ items }: { items: ConnectionFreshness[] }) {
  if (items.length === 0) return null;
  const summary = items.map(detail).join(" ");
  return (
    <Alert role="status" className="bg-muted/50 sm:grid-cols-[1rem_minmax(0,1fr)_auto]">
      <IconHistory />
      <AlertTitle>{copy.title}</AlertTitle>
      <AlertDescription className="sm:col-start-2">
        <p>{summary}</p>
      </AlertDescription>
      <Link
        href="/ajustes/conexoes"
        className="col-start-2 text-xs font-medium text-primary underline-offset-4 hover:underline sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:self-center"
      >
        {copy.reconnect}
      </Link>
    </Alert>
  );
}
