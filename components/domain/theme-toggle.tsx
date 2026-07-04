"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

// Light/dark toggle for the PROVISIONAL front. No dependency: it flips the
// `.dark` class on <html> and persists to localStorage; the no-FOUC inline
// script in app/layout.tsx reads that value on first paint so the theme never
// flashes. The button reads the live class via useSyncExternalStore (a
// MutationObserver on <html>), so it stays in sync no matter what flips it.
// Deliberately tiny — system-follow / per-tenant default is out of scope for
// the approximation.

const copy = {
  toLight: "Ativar modo claro",
  toDark: "Ativar modo escuro",
};

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

const isDarkNow = () => document.documentElement.classList.contains("dark");
// Server + first hydration render assume light, matching the SSR HTML; the real
// value takes over right after mount (no hydration mismatch on the icon).
const isDarkOnServer = () => false;

export function ThemeToggle({ className }: { className?: string }) {
  const isDark = useSyncExternalStore(subscribe, isDarkNow, isDarkOnServer);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Private mode / storage disabled — the toggle still works for this session.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? copy.toLight : copy.toDark}
      title={isDark ? copy.toLight : copy.toDark}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {isDark ? (
        <SunIcon className="size-4" weight="bold" />
      ) : (
        <MoonIcon className="size-4" weight="bold" />
      )}
    </button>
  );
}
