"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const ROOT_SELECTOR = "[data-home-motion-root]";
const TARGET_SELECTOR = "[data-home-animate]";
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
  if (element.dataset.homeAnimateState !== "idle") return;

  element.dataset.homeAnimateState = reducedMotion ? "done" : "running";
}

export function HomeAnimationController() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;

    const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
    if (!root) return;

    let observer: IntersectionObserver | null = null;
    let frame = 0;
    const media = window.matchMedia(REDUCED_MOTION_QUERY);

    const startRun = () => {
      const targets = Array.from(
        root.querySelectorAll<HTMLElement>(TARGET_SELECTOR),
      );
      const reducedMotion = media.matches;

      observer?.disconnect();

      for (const target of targets) {
        target.dataset.homeAnimateState = "idle";
      }

      // Commit the idle styles before switching visible targets to running.
      void root.offsetHeight;

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              playTarget(entry.target as HTMLElement, reducedMotion);
              observer?.unobserve(entry.target);
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.16 },
      );

      for (const target of targets) {
        observer.observe(target);
      }

      frame = window.requestAnimationFrame(() => {
        for (const target of targets) {
          if (isInViewport(target)) {
            playTarget(target, reducedMotion);
            observer?.unobserve(target);
          }
        }
      });
    };

    startRun();

    const handlePageShow = () => startRun();
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      observer?.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [pathname]);

  return null;
}
