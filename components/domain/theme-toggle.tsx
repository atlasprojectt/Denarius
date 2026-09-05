"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  RiComputerLine,
  RiMoonLine,
  RiSunLine,
} from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  RadioGroup,
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

// Quiet window miniature (the reference look): a soft shell — the one
// contrast anchor — holding a lifted window with a narrow rail and four
// equal content blocks. One interior tone only; hierarchy comes from the
// shell/window step, never from competing grays. Palettes are FIXED per
// variant (warm Stone ramps, never semantic tokens) so each option shows its
// own appearance under any active theme. No OS chrome: no traffic-light
// dots, so the preview reads on every operating system.
function WindowPreview({ dark }: { dark: boolean }) {
  const shell = dark ? "bg-black" : "bg-stone-200";
  const pane = dark ? "bg-stone-900" : "bg-white";
  const shape = dark ? "bg-stone-700" : "bg-stone-200";

  return (
    <span aria-hidden className={cn("flex h-full min-h-0 flex-1 p-2", shell)}>
      <span
        className={cn(
          "flex min-h-0 min-w-0 flex-1 gap-2 rounded-[5px] p-2",
          pane,
        )}
      >
        <span className="flex w-1/4 shrink-0 flex-col gap-1.5">
          <span className={cn("h-1 w-full rounded-full", shape)} />
          <span className={cn("h-1 w-full rounded-full", shape)} />
          <span className={cn("h-1 w-2/3 rounded-full", shape)} />
        </span>
        <span className="grid min-h-0 min-w-0 flex-1 grid-cols-2 grid-rows-2 gap-1.5">
          <span className={cn("min-h-0 rounded-[3px]", shape)} />
          <span className={cn("min-h-0 rounded-[3px]", shape)} />
          <span className={cn("min-h-0 rounded-[3px]", shape)} />
          <span className={cn("min-h-0 rounded-[3px]", shape)} />
        </span>
      </span>
    </span>
  );
}

function ThemePreview({ variant }: { variant: ThemePreference }) {
  if (variant === "system") {
    // Follows the OS: one full window per half, edge to edge — the shell
    // step between them is the divider, so neither side squeezes.
    return (
      <span
        aria-hidden
        className="grid h-24 grid-cols-2 overflow-hidden rounded-md border border-stone-300"
      >
        <span className="flex min-h-0 min-w-0">
          <WindowPreview dark={false} />
        </span>
        <span className="flex min-h-0 min-w-0">
          <WindowPreview dark />
        </span>
      </span>
    );
  }

  const dark = variant === "dark";
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-24 overflow-hidden rounded-md border",
        dark ? "border-stone-800" : "border-stone-300",
      )}
    >
      <WindowPreview dark={dark} />
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
        "group relative min-h-32 min-w-0 rounded-lg border p-3 transition-[border-color,background-color] duration-(--motion-duration-standard) ease-(--motion-ease-standard)",
        selected
          ? "border-brand-accent/50 bg-brand-accent-muted"
          : "border-border bg-card hover:border-border hover:bg-surface-hover",
      )}
    >
      <RadioGroupItem
        value={variant}
        aria-label={label}
        aria-describedby={descriptionId}
        className="absolute inset-0 z-10 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />

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
