"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  RiCheckLine,
  RiComputerLine,
  RiMoonLine,
  RiSunLine,
} from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  RadioGroup,
  RadioGroupIndicator,
  RadioGroupItem,
} from "@/components/ui/radio-group";
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
  lightHint: "Usa o tema claro neste navegador.",
  darkHint: "Usa o tema escuro neste navegador.",
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
        className="relative flex h-14 overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700"
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
        "flex h-14 rounded-md border p-2",
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
}: {
  variant: ThemePreference;
  selected: boolean;
  label: string;
  hint: string;
  icon: ReactNode;
}) {
  const descriptionId = `theme-option-${variant}-description`;

  return (
    <div
      className={cn(
        "group relative min-h-32 min-w-0 rounded-lg border p-3 transition-colors",
        selected
          ? "border-foreground/20 bg-muted"
          : "border-border bg-card hover:bg-surface-hover",
      )}
    >
      <RadioGroupItem
        value={variant}
        aria-label={label}
        aria-describedby={descriptionId}
        className="absolute inset-0 z-10 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <RadioGroupIndicator className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full border border-brand-accent bg-card text-brand-accent">
          <RiCheckLine className="size-3.5" aria-hidden />
        </RadioGroupIndicator>
      </RadioGroupItem>

      <div className="flex flex-col gap-3">
        <ThemePreview variant={variant} />
        <span className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center",
            selected ? "text-brand-accent" : "text-muted-foreground",
          )}
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{label}</span>
          <span
            id={descriptionId}
            className="mt-0.5 block text-xs/relaxed text-muted-foreground"
          >
            {hint}
          </span>
        </span>
      </span>
      </div>
    </div>
  );
}

export function ThemePicker() {
  const preference = useThemePreference();

  return (
    <RadioGroup<ThemePreference>
      value={preference}
      onValueChange={setPreference}
      aria-label="Aparência"
      className="grid w-full gap-3 md:grid-cols-3"
    >
      <ThemeOption
        variant="system"
        selected={preference === "system"}
        label={copy.system}
        hint={copy.systemHint}
        icon={<RiComputerLine className="size-4" />}
      />
      <ThemeOption
        variant="light"
        selected={preference === "light"}
        label={copy.light}
        hint={copy.lightHint}
        icon={<RiSunLine className="size-4" />}
      />
      <ThemeOption
        variant="dark"
        selected={preference === "dark"}
        label={copy.dark}
        hint={copy.darkHint}
        icon={<RiMoonLine className="size-4" />}
      />
    </RadioGroup>
  );
}
