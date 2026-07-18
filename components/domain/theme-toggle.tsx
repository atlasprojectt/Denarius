"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { RiComputerLine, RiMoonLine, RiSunLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Local appearance preference. No dependency: it flips the `.dark` class on
// <html> and persists to localStorage. The no-FOUC inline script in
// app/layout.tsx reads the value on first paint (so the theme never flashes)
// and keeps a matchMedia listener live so "system" tracks the OS in real time.

type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "theme";
// Same-tab preference changes broadcast on this event (the `storage` event only
// fires in *other* tabs), so every mounted picker/toggle re-reads in sync.
const CHANGE_EVENT = "denarius-theme";

const copy = {
  toLight: "Ativar modo claro",
  toDark: "Ativar modo escuro",
  system: "Sistema",
  light: "Claro",
  dark: "Escuro",
  systemHint: "Acompanha o tema do seu sistema operacional.",
  lightHint: "Fundo claro para uso durante o dia.",
  darkHint: "Contraste reduzido para ambientes escuros.",
};

function prefersDark() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Storage disabled — fall back to following the system.
  }
  return "system";
}

function resolveDark(preference: ThemePreference): boolean {
  return preference === "dark" || (preference === "system" && prefersDark());
}

function setPreference(preference: ThemePreference) {
  try {
    // "system" is stored explicitly (rather than cleared) so the choice is
    // durable and distinguishable from "never chose".
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Private mode / storage disabled: the choice still works for this session.
  }
  document.documentElement.classList.toggle("dark", resolveDark(preference));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** The stored preference (system | light | dark), kept in sync across mounts. */
function useThemePreference(): ThemePreference {
  const [preference, setPref] = useState<ThemePreference>("system");

  useEffect(() => {
    const sync = () => setPref(readPreference());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return preference;
}

/** The resolved appearance (true = dark), tracking the live `.dark` class. */
function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export function ThemeToggle({ className }: { className?: string }) {
  const isDark = useIsDark();

  // A compact header control only has room for two states, so it sets an
  // explicit light/dark preference (the three-way choice lives in ThemePicker).
  function toggle() {
    setPreference(isDark ? "light" : "dark");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label={isDark ? copy.toLight : copy.toDark}
      title={isDark ? copy.toLight : copy.toDark}
      className={cn(
        "size-8 border border-border",
        className,
      )}
    >
      {isDark ? (
        <RiSunLine className="size-4" />
      ) : (
        <RiMoonLine className="size-4" />
      )}
    </Button>
  );
}

function ThemePreview({ variant }: { variant: ThemePreference }) {
  if (variant === "system") {
    // A diagonal split hints "follows the OS" — half light, half dark.
    return (
      <span
        aria-hidden
        className="relative flex h-16 overflow-hidden rounded-lg border border-zinc-300 shadow-xs dark:border-zinc-700"
      >
        <span className="flex-1 bg-zinc-50" />
        <span
          className="absolute inset-0 bg-zinc-950"
          style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
        />
        <span className="absolute top-2 left-2 h-2 w-10 rounded-full bg-zinc-300" />
        <span className="absolute right-2 bottom-2 h-2 w-10 rounded-full bg-orange-500/80" />
      </span>
    );
  }

  const dark = variant === "dark";
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-16 rounded-lg border p-2 shadow-xs",
        dark ? "border-zinc-700 bg-zinc-950" : "border-zinc-200 bg-zinc-50",
      )}
    >
      <span
        className={cn(
          "mr-2 h-full w-5 rounded-md",
          dark ? "bg-zinc-800" : "bg-white",
        )}
      />
      <span className="flex flex-1 flex-col gap-1.5">
        <span
          className={cn(
            "h-2 w-16 rounded-full",
            dark ? "bg-zinc-500" : "bg-zinc-300",
          )}
        />
        <span className={cn("h-5 rounded-md", dark ? "bg-zinc-800" : "bg-white")} />
        <span
          className={cn(
            "h-2 w-20 rounded-full",
            dark ? "bg-orange-500/80" : "bg-orange-500",
          )}
        />
      </span>
    </span>
  );
}

function ThemeOption({
  variant,
  selected,
  label,
  hint,
  icon,
  onSelect,
}: {
  variant: ThemePreference;
  selected: boolean;
  label: string;
  hint: string;
  icon: ReactNode;
  onSelect: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group relative h-auto min-w-0 flex-col items-stretch gap-3 rounded-xl bg-card p-3 text-left whitespace-normal hover:bg-muted/40",
        selected
          ? "border-border bg-muted/25 after:absolute after:right-5 after:bottom-1 after:left-5 after:h-0.5 after:rounded-full after:bg-brand-accent after:content-['']"
          : "border-border",
      )}
    >
      <ThemePreview variant={variant} />
      <span className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center",
            selected ? "text-brand-accent-light" : "text-muted-foreground",
          )}
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{label}</span>
          <span className="mt-0.5 block text-xs/relaxed text-muted-foreground">
            {hint}
          </span>
        </span>
      </span>
    </Button>
  );
}

export function ThemePicker() {
  const preference = useThemePreference();

  return (
    <div className="grid w-full gap-3 sm:grid-cols-3">
      <ThemeOption
        variant="system"
        selected={preference === "system"}
        label={copy.system}
        hint={copy.systemHint}
        icon={<RiComputerLine className="size-4" />}
        onSelect={() => setPreference("system")}
      />
      <ThemeOption
        variant="light"
        selected={preference === "light"}
        label={copy.light}
        hint={copy.lightHint}
        icon={<RiSunLine className="size-4" />}
        onSelect={() => setPreference("light")}
      />
      <ThemeOption
        variant="dark"
        selected={preference === "dark"}
        label={copy.dark}
        hint={copy.darkHint}
        icon={<RiMoonLine className="size-4" />}
        onSelect={() => setPreference("dark")}
      />
    </div>
  );
}
