import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Coins01Icon,
  InformationCircleIcon,
  Plug01Icon,
} from "@hugeicons/core-free-icons";

import { Notice } from "@/components/domain/notice";
import { ProviderConnectionCard } from "@/components/domain/provider-connection-card";
import { SubscriptionForm } from "@/components/domain/subscription-form";
import type { SeatSubscription } from "@/lib/engine/accrual";
import { money } from "@/lib/money";
import { counted } from "@/lib/plural";
import type { SetupConnection } from "@/lib/setup/queries";
import type { SourceMode } from "@/lib/setup/steps";
import type { Team } from "@/lib/teams/queries";
import { cn } from "@/lib/utils";

import { setupCopy } from "../copy";

const copy = setupCopy.sources;

const PROVIDERS = ["openai", "anthropic"] as const;

const modes: readonly { mode: SourceMode; icon: IconSvgElement }[] = [
  { mode: "apis", icon: Plug01Icon },
  { mode: "assinaturas", icon: Coins01Icon },
];

function ModeChoice({ selected }: { selected: SourceMode }) {
  return (
    <nav aria-label={copy.modes} className="grid gap-2 sm:grid-cols-2">
      {modes.map(({ mode, icon }) => {
        const active = mode === selected;
        return (
          <Link
            key={mode}
            href={`/configuracao?etapa=fontes&modo=${mode}`}
            aria-current={active ? "true" : undefined}
            scroll={false}
            className={cn(
              "flex items-start gap-3 rounded-md border p-3 outline-none transition-colors duration-(--motion-duration-fast) ease-(--motion-ease-standard) focus-visible:ring-2 focus-visible:ring-ring/40",
              active
                ? "border-foreground/40 bg-surface-selected"
                : "border-border hover:bg-surface-hover",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-sm",
                active ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
              )}
            >
              <HugeiconsIcon icon={icon} className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{copy[mode].title}</span>
              <span className="mt-0.5 block text-xs/relaxed text-muted-foreground">
                {copy[mode].body}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SourcesStep({
  mode,
  connections,
  subscriptions,
  teams,
  currency,
}: {
  mode: SourceMode;
  connections: SetupConnection[];
  subscriptions: SeatSubscription[];
  teams: Team[];
  currency: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ModeChoice selected={mode} />

      {mode === "apis" ? (
        <>
          {PROVIDERS.map((provider) => {
            const connection = connections.find((c) => c.provider === provider);
            return (
              <ProviderConnectionCard
                key={provider}
                provider={provider}
                status={connection?.status ?? null}
                lastSyncAt={connection?.last_sync_at ?? null}
                lastSyncError={connection?.last_sync_error ?? null}
              />
            );
          })}
          <p className="text-xs/relaxed text-muted-foreground">
            {copy.apisNote} {copy.readOnly}
          </p>
        </>
      ) : (
        <>
          <SubscriptionForm teams={teams} currency={currency} />
          {subscriptions.length > 0 && (
            <section aria-labelledby="setup-subscriptions" className="flex flex-col gap-2">
              <h3 id="setup-subscriptions" className="label-caps text-muted-foreground">
                {copy.subscriptionsTitle}
              </h3>
              <ul className="flex flex-col divide-y rounded-md border text-sm">
                {subscriptions.map((sub) => (
                  <li key={sub.id} className="px-3 py-2 tabular-nums">
                    {copy.subscriptionLine(
                      sub.tool,
                      counted(sub.seatCount, "assento", "assentos"),
                      money(sub.seatCount * sub.unitPrice, currency),
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {teams.length === 0 && (
            <Notice icon={<HugeiconsIcon icon={InformationCircleIcon} />}>
              {copy.sharedTeamsNote}
            </Notice>
          )}
        </>
      )}
    </div>
  );
}
