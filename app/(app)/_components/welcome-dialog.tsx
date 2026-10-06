"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { homeCopy } from "./copy";

const copy = homeCopy.welcome;

/** Shown once, when the guided setup hands the Admin to the cockpit. Closing
 *  it drops the URL flag, so a reload or a shared link never reopens it. */
export function WelcomeDialog({
  name,
  hasBudget,
}: {
  name: string | null;
  hasBudget: boolean;
}) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) router.replace(pathname, { scroll: false });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* No corner X: it would sit on the banner. Esc, a click outside, and
          the footer button all close it. */}
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto p-6 sm:max-w-xl"
      >
        {/* Full-bleed banner: cancels the popup's p-6 on three sides. The
            wordmark is decorative here; the title names the product. Served
            as-is (unoptimized): the source is already a sized WebP, and the
            optimizer's re-encode visibly softened the grain. */}
        <Image
          src="/brand/welcome-banner.webp"
          alt=""
          width={2400}
          height={869}
          unoptimized
          priority
          className="-mx-6 -mt-6 aspect-[2400/869] w-[calc(100%+3rem)] max-w-none object-cover"
        />
        <DialogHeader className="gap-2">
          <DialogTitle className="text-2xl font-normal tracking-tight text-foreground">
            {copy.title(name)}
          </DialogTitle>
          <DialogDescription className="text-sm/relaxed text-ink-secondary">
            {hasBudget ? copy.ready : copy.pending}
          </DialogDescription>
        </DialogHeader>
        <section aria-labelledby="welcome-tour" className="flex flex-col gap-3">
          <h3 id="welcome-tour" className="label-caps text-muted-foreground">
            {copy.tourLabel}
          </h3>
          <dl className="divide-y divide-border border-y border-border">
            {copy.tour.map(({ place, what }) => (
              <div
                key={place}
                className="grid gap-0.5 py-2.5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4"
              >
                <dt className="text-sm font-medium text-foreground">{place}</dt>
                <dd className="text-sm text-ink-secondary">{what}</dd>
              </div>
            ))}
          </dl>
        </section>
        <DialogFooter>
          <Button type="button" size="lg" onClick={() => handleOpenChange(false)} autoFocus>
            {copy.start}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
