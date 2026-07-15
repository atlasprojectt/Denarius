import { RiHistoryLine } from "@remixicon/react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { ConnectionFreshness } from "@/lib/engine/freshness";

// Honesty in the chrome (frontend §3.2): when a connector's last sync failed or
// went stale, say so globally — app totals may be understated. Deliberately
// NOT a semaphore color: green/amber/red are reserved for budget status (product
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
    <>
      <Link
        href="/ajustes/conexoes"
        aria-label={`${copy.title}. ${summary} ${copy.reconnect}.`}
        className="block rounded-lg outline-hidden ring-sidebar-ring focus-visible:ring-2 group-data-[collapsible=icon]:hidden"
      >
        <Alert
          role="status"
          className="bg-sidebar-accent/55 px-2.5 py-2 transition-colors hover:bg-sidebar-accent"
        >
          <RiHistoryLine />
          <AlertTitle className="leading-4">{copy.title}</AlertTitle>
          <AlertDescription className="col-start-2 line-clamp-3 text-left text-[11px]/4 text-sidebar-foreground/65">
            <p>{summary}</p>
          </AlertDescription>
          <span className="col-start-2 mt-1 text-[11px] font-medium text-sidebar-foreground">
            {copy.reconnect}
          </span>
        </Alert>
      </Link>

      <SidebarMenu className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center">
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip={copy.title}>
            <Link href="/ajustes/conexoes" aria-label={copy.title}>
              <RiHistoryLine />
              <span>{copy.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
