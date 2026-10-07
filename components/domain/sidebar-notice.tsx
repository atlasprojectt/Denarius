"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, ChevronRightIcon } from "@hugeicons/core-free-icons";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

// The sidebar notice (2026-07-15, founder-directed): every chrome-level notice
// wears this one shape, so the reconnect caveat and the all-clear read as one
// voice instead of two unrelated cards — an Alert card while the sidebar is
// expanded, the same size-8 icon slot on the collapsed rail.
//
// Tone is NOT decoration: `neutral` is the calm data-quality voice (the
// reconnect notice deliberately avoids the semaphore, product principle #5),
// and `green` exists only for a notice that IS a budget statement (all-clear).
//
// A notice only takes the collapsed rail when it has somewhere to go: an icon
// button that does nothing is a mystery, so a linkless notice (the all-clear)
// stays hidden on the rail rather than becoming a dead pictogram.

export type SidebarNoticeTone = "neutral" | "green";

const tones: Record<
  SidebarNoticeTone,
  { card: string; hover: string; description: string }
> = {
  neutral: {
    card: "bg-sidebar-accent",
    hover: "transition-colors hover:bg-surface-hover",
    description: "text-ink-secondary",
  },
  // text-status-green colors the icon through the Alert's `*:[svg]:text-current`;
  // the title/description restate their own color on top of it.
  green: {
    card: "bg-status-green-soft text-status-green",
    hover: "transition-colors hover:bg-status-green/15",
    description: "text-status-green-fg",
  },
};

const titleTone: Record<SidebarNoticeTone, string> = {
  neutral: "",
  green: "text-status-green-fg",
};

const iconSlot = "grid size-8 shrink-0 place-items-center";
const reveal =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-(--motion-duration-max)";

export type SidebarNoticeProps = {
  /** Rendered as the Alert's leading svg — pass an element, e.g. <HugeiconsIcon icon={HistoryIcon} />. */
  icon: ReactNode;
  title: string;
  /** The body: a sentence, or richer content such as the stale banner's
   *  per-provider lines. Never clamped, so nothing in it can be hidden. */
  description: ReactNode;
  tone?: SidebarNoticeTone;
  /** Makes the whole card a link, and gives it the collapsed-rail icon button. */
  href?: string;
  /** The call-to-action line under the description (only with `href`). */
  cta?: string;
  /** Accessible name for the link/rail button — defaults to the title. */
  ariaLabel?: string;
  onDismiss?: () => void;
  dismissLabel?: string;
  /** Exit animation hook: the owner keeps the closing state (see AllClear). */
  closing?: boolean;
  /** Marks the rail icon slot (`data-sidebar-notice-icon`) for the motion audit. */
  railIconId?: string;
  className?: string;
};

export function SidebarNotice({
  icon,
  title,
  description,
  tone = "neutral",
  href,
  cta,
  ariaLabel,
  onDismiss,
  dismissLabel,
  closing = false,
  railIconId,
  className,
}: SidebarNoticeProps) {
  const t = tones[tone];

  const card = (
    <Alert
      role="status"
      className={`${t.card} px-2.5 py-2 ${href ? t.hover : ""} ${
        onDismiss ? "pr-8" : ""
      }`}
    >
      {icon}
      <AlertTitle className={`leading-4 ${titleTone[tone]}`}>{title}</AlertTitle>
      <AlertDescription className={`col-start-2 text-left text-xs/4 ${t.description}`}>
        {description}
      </AlertDescription>
      {cta && (
        // The whole card is the link; the CTA only has to LOOK pressable.
        <span
          className={cn(
            buttonVariants({ variant: "tertiary", size: "xs" }),
            "col-start-2 mt-2 w-fit text-sidebar-foreground",
          )}
        >
          {cta}
          <HugeiconsIcon icon={ChevronRightIcon} data-icon="inline-end" aria-hidden />
        </span>
      )}
    </Alert>
  );

  const motion = closing
    ? "pointer-events-none motion-safe:animate-out motion-safe:fade-out-0 motion-safe:zoom-out-95 motion-safe:duration-(--motion-duration-standard)"
    : reveal;

  return (
    <>
      <div
        className={`relative group-data-[collapsible=icon]:hidden ${motion} ${className ?? ""}`}
      >
        {href ? (
          <Link
            href={href}
            aria-label={ariaLabel ?? title}
            className="block rounded-md outline-hidden ring-sidebar-ring focus-visible:ring-2"
          >
            {card}
          </Link>
        ) : (
          card
        )}
        {onDismiss && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={dismissLabel}
            className="absolute top-1 right-1 size-6 text-current opacity-65 transition-opacity hover:bg-transparent hover:opacity-100"
            onClick={onDismiss}
          >
            <HugeiconsIcon icon={Cancel01Icon} aria-hidden />
          </Button>
        )}
      </div>

      {href && (
        <SidebarMenu className={`hidden group-data-[collapsible=icon]:flex ${reveal}`}>
          <SidebarMenuItem className="w-full">
            <SidebarMenuButton
              asChild
              tooltip={title}
              className="mx-auto w-[calc(var(--sidebar-width)-2rem)] gap-0 p-0 group-data-[collapsible=icon]:p-0! [&_svg]:size-4.5"
            >
              <Link href={href} aria-label={ariaLabel ?? title}>
                <span data-sidebar-notice-icon={railIconId} className={iconSlot}>
                  {icon}
                </span>
                <span className="sr-only">{title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      )}
    </>
  );
}
