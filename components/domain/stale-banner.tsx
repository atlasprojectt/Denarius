import type { ConnectionFreshness } from "@/lib/engine/freshness";

// Honesty in the chrome (frontend §3.2): when a connector's last sync failed or
// went stale, say so — the totals below may be understated. Deliberately NOT a
// semaphore color: green/amber/red are reserved for budget status (product
// principle #5). This is a calm data-quality notice, not an alarm.

const providerLabel: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

function line(item: ConnectionFreshness): string {
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
  return (
    <div
      role="status"
      className="rounded-xl border border-l-4 border-l-foreground/40 bg-muted/50 p-4 text-sm"
    >
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.provider} className="text-foreground">
            {line(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}
