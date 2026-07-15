import { RiHistoryLine } from "@remixicon/react";

import { SidebarNotice } from "@/components/domain/sidebar-notice";
import type { ConnectionFreshness } from "@/lib/engine/freshness";

// Honesty in the chrome (frontend §3.2): when a connector's last sync failed or
// went stale, say so globally — app totals may be understated. Deliberately
// NOT a semaphore color: green/amber/red are reserved for budget status (product
// principle #5). This is a calm data-quality notice, not an alarm. The card
// shape is shared with every other sidebar notice (SidebarNotice).

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
    <SidebarNotice
      icon={<RiHistoryLine />}
      title={copy.title}
      description={summary}
      href="/ajustes/conexoes"
      cta={copy.reconnect}
      ariaLabel={`${copy.title}. ${summary} ${copy.reconnect}.`}
      railIconId="stale"
    />
  );
}
