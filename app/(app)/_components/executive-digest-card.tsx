import Link from "next/link";
import { RiSparkling2Line } from "@remixicon/react";

import {
  CockpitCard,
  CockpitCardContent,
  CockpitCardFrame,
  CockpitCardHeader,
  CockpitCardTitle,
} from "@/components/domain/cockpit-card";
import type { Cockpit } from "@/lib/engine/cockpit";
import { buildHomeDigest, type DigestSegment } from "@/lib/narrate/digest";
import { homeCopy } from "./copy";

function renderSegment(segment: DigestSegment, index: number) {
  const emphasisClass = segment.emphasis ? "font-semibold text-foreground" : "";
  if (segment.type === "text") {
    return (
      <span key={index} className={emphasisClass}>
        {segment.value}
      </span>
    );
  }
  return (
    <Link
      key={index}
      href={segment.href}
      className={`rounded-sm text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand-accent-light focus-visible:text-brand-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${emphasisClass}`}
    >
      {segment.value}
    </Link>
  );
}

export function ExecutiveDigestCard({
  cockpit,
  currency,
}: {
  cockpit: Cockpit;
  currency: string;
}) {
  const attentionTeam =
    cockpit.state === "ready" && cockpit.verdict.status === "red"
      ? cockpit.verdict.teamId === null
        ? null
        : cockpit.needsAttention.find((team) => team.teamId === cockpit.verdict.teamId) ?? null
      : cockpit.state === "ready"
        ? cockpit.needsAttention[0] ?? null
        : null;

  const lines = buildHomeDigest(
    cockpit.state === "cold-start"
      ? {
          status: "collecting",
          collecting: true,
          currency,
          spent: 0,
          budget: 0,
          projection: null,
          projectedMargin: null,
          attentionTeam: null,
        }
      : {
          status: cockpit.verdict.status,
          collecting: cockpit.collecting,
          currency,
          spent: cockpit.org.spent,
          budget: cockpit.org.budget,
          projection: cockpit.org.projection,
          projectedMargin: cockpit.org.projectedMargin,
          attentionTeam: attentionTeam
            ? { id: attentionTeam.teamId, name: attentionTeam.teamName }
            : null,
        },
  );

  return (
    <CockpitCard
      className="w-full min-w-0 lg:self-stretch xl:aspect-[1.16/1] xl:min-h-0 xl:max-w-[24rem] xl:self-start"
      aria-labelledby="home-digest-title"
    >
      <CockpitCardHeader>
        <CockpitCardTitle id="home-digest-title" className="flex items-center gap-2">
          <RiSparkling2Line className="size-4 text-muted-foreground" aria-hidden />
          {homeCopy.digest.title}
        </CockpitCardTitle>
      </CockpitCardHeader>
      <CockpitCardFrame>
      <CockpitCardContent className="flex min-h-[10rem] flex-1 flex-col justify-center px-8 py-4 text-[17px]/[1.6] font-medium text-muted-foreground sm:px-10">
        {cockpit.state === "cold-start" && (
          <p
            data-digest-lines
            className="max-w-[38ch] digest-line font-medium text-foreground"
            style={{ animationDelay: "40ms" }}
          >
            {homeCopy.digest.coldStart}
          </p>
        )}
        {cockpit.state !== "cold-start" && (
          <p data-digest-lines className="max-w-[38ch] text-pretty">
            {lines.map((line, lineIndex) => (
              <span
                key={lineIndex}
                className="digest-line block"
                style={{ animationDelay: `${40 + lineIndex * 55}ms` }}
              >
                {line.map(renderSegment)}
              </span>
            ))}
          </p>
        )}
      </CockpitCardContent>
      </CockpitCardFrame>
    </CockpitCard>
  );
}
