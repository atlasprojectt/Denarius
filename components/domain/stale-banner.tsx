import { HugeiconsIcon } from "@hugeicons/react";
import { HistoryIcon } from "@hugeicons/core-free-icons";

import { SidebarNotice } from "@/components/domain/sidebar-notice";
import { stateIcons } from "@/components/domain/state-icons";
import type { ConnectionFreshness, SyncState } from "@/lib/engine/freshness";
import { syncStamp } from "@/lib/format";

// Honesty in the chrome (frontend §3.2): when a connector's last sync failed or
// went stale, say so globally — app totals may be understated. The card stays
// neutral: freshness is not budget status (principle #5), so this is a calm
// data-quality notice, not an alarm. Only a sync that actually FAILED marks its
// own line in the destructive state tone.
//
// One line per provider, failures first, each saying when its data is from
// (the last successful sync), then the effect on totals once. Nothing is
// clamped: a second provider's failure must never hide behind an ellipsis.

const copy = {
  title: "Dados possivelmente desatualizados",
  failed: "sincronização falhou",
  never: "ainda não sincronizou",
  syncedAt: (stamp: string) => `atualizado ${stamp}`,
  effect: "Os totais podem estar subestimados.",
  reconnect: "Reconectar",
};

const providerLabel: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

const severity: Record<SyncState, number> = {
  failed: 0,
  never: 1,
  stale: 2,
  fresh: 3,
};

function line(item: ConnectionFreshness) {
  return {
    provider: item.provider,
    failed: item.state === "failed",
    label: providerLabel[item.provider] ?? item.provider,
    status:
      item.state === "failed" ? copy.failed : item.state === "never" ? copy.never : null,
    stamp: item.lastSyncAt === null ? null : copy.syncedAt(syncStamp(item.lastSyncAt)),
  };
}

export function StaleBanner({ items }: { items: ConnectionFreshness[] }) {
  if (items.length === 0) return null;
  const lines = [...items]
    .sort((a, b) => severity[a.state] - severity[b.state])
    .map(line);
  const spoken = lines
    .map(({ label, status, stamp }) => [label, status, stamp].filter(Boolean).join(", "))
    .join(". ");

  return (
    <SidebarNotice
      icon={<HugeiconsIcon icon={HistoryIcon} />}
      title={copy.title}
      description={
        <>
          <ul className="mt-1 flex flex-col gap-1">
            {lines.map(({ provider, failed, label, status, stamp }) => (
              <li key={provider} className="flex gap-1.5">
                <HugeiconsIcon
                  icon={failed ? stateIcons.failure : stateIcons.pending}
                  className={`mt-0.5 size-3 shrink-0 ${failed ? "text-badge-destructive" : ""}`}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className={failed ? "text-badge-destructive" : "text-sidebar-foreground"}>
                    <span className="font-medium">{label}</span>
                    {status && ` · ${status}`}
                  </span>
                  {stamp && <span className="block tabular-nums">{stamp}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5">{copy.effect}</p>
        </>
      }
      href="/ajustes/conexoes"
      cta={copy.reconnect}
      ariaLabel={`${copy.title}. ${spoken}. ${copy.effect} ${copy.reconnect}.`}
      railIconId="stale"
    />
  );
}
