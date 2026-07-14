"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const ROOT_SELECTOR = "[data-reveal-root]";
const TARGET_SELECTOR = "[data-reveal]";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function isInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  const height = window.innerHeight || document.documentElement.clientHeight;
  const width = window.innerWidth || document.documentElement.clientWidth;

  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < height * 0.92 &&
    rect.left < width
  );
}

function playTarget(element: HTMLElement, reducedMotion: boolean) {
  if (element.dataset.revealState !== "idle") return;

  element.dataset.revealState = reducedMotion ? "done" : "running";
}

// App-wide chart/bar open-animation controller. Server components render the
// motion targets ([data-reveal] with child [data-reveal-bar|-wipe|-donut|-legend]
// markers); this single client controller — mounted once in the (app) layout —
// flips [data-reveal-state] idle→running as each target enters the viewport, and
// replays on every navigation (the pathname effect) and bfcache restore
// (pageshow). Motion is pure CSS (globals.css); reduced motion jumps to "done".
export function RevealController() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
    if (!root) return;

    let observer: IntersectionObserver | null = null;
    let frame = 0;
    const media = window.matchMedia(REDUCED_MOTION_QUERY);

    const observeTargets = (targets: HTMLElement[]) => {
      if (targets.length === 0) return;
      const reducedMotion = media.matches;

      for (const target of targets) {
        target.dataset.revealState = "idle";
      }

      // Commit the idle styles before switching visible targets to running.
      void root.offsetHeight;

      observer ??= new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              playTarget(entry.target as HTMLElement, media.matches);
              observer?.unobserve(entry.target);
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.16 },
      );

      for (const target of targets) {
        observer.observe(target);
      }

      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        for (const target of targets) {
          if (isInViewport(target)) {
            playTarget(target, reducedMotion);
            observer?.unobserve(target);
          }
        }
      });
    };

    const startRun = () => {
      observer?.disconnect();
      observer = null;
      observeTargets(Array.from(root.querySelectorAll<HTMLElement>(TARGET_SELECTOR)));
    };

    startRun();

    // Suspense/loading.tsx streams targets in AFTER the pathname effect ran
    // (and server-action revalidates mount new ones under the same pathname) —
    // without this, those targets never get a state and never animate.
    const mutation = new MutationObserver((records) => {
      const added = new Set<HTMLElement>();
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches(TARGET_SELECTOR) && node.dataset.revealState === undefined) {
            added.add(node);
          }
          for (const el of node.querySelectorAll<HTMLElement>(TARGET_SELECTOR)) {
            if (el.dataset.revealState === undefined) added.add(el);
          }
        }
      }
      if (added.size > 0) observeTargets([...added]);
    });
    mutation.observe(root, { childList: true, subtree: true });

    // "running" would otherwise be terminal, leaving will-change (a pinned
    // compositor layer) on every animated element for the page's lifetime.
    const handleAnimationEnd = (event: AnimationEvent) => {
      const target = (event.target as HTMLElement | null)?.closest?.(
        TARGET_SELECTOR,
      );
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.revealState !== "running") return;
      const stillRunning = target
        .getAnimations({ subtree: true })
        .some((a) => a.playState === "running" || a.pending);
      if (!stillRunning) target.dataset.revealState = "done";
    };
    root.addEventListener("animationend", handleAnimationEnd);

    // pageshow fires on every load; only bfcache restores need a replay (the
    // pathname effect already covered the initial run).
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) startRun();
    };
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      observer?.disconnect();
      mutation.disconnect();
      window.cancelAnimationFrame(frame);
      root.removeEventListener("animationend", handleAnimationEnd);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [pathname]);

  return null;
}
