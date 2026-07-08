"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { IconMoon, IconSun } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

// Local appearance preference. No dependency: it flips the `.dark` class on
// <html> and persists to localStorage; the no-FOUC inline script in app/layout.tsx
// reads that value on first paint so the theme never flashes.

const copy = {
  toLight: "Ativar modo claro",
  toDark: "Ativar modo escuro",
  light: "Claro",
  dark: "Escuro",
  lightHint: "Fundo claro para uso durante o dia.",
  darkHint: "Contraste reduzido para ambientes escuros.",
};

function useThemeState() {
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

function setTheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  try {
    localStorage.setItem("theme", isDark ? "dark" : "light");
  } catch {
    // Private mode / storage disabled: the choice still works for this session.
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  const isDark = useThemeState();

  function toggle() {
    setTheme(!document.documentElement.classList.contains("dark"));
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
        <IconSun className="size-4" />
      ) : (
        <IconMoon className="size-4" />
      )}
    </button>
  );
}

function ThemePreview({ dark }: { dark: boolean }) {
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
        <span
          className={cn(
            "h-5 rounded-md",
            dark ? "bg-zinc-800" : "bg-white",
          )}
        />
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
  dark,
  selected,
  label,
  hint,
  icon,
  onSelect,
}: {
  dark: boolean;
  selected: boolean;
  label: string;
  hint: string;
  icon: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/40",
        selected ? "border-primary ring-1 ring-primary/25" : "border-border",
      )}
    >
      <ThemePreview dark={dark} />
      <span className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center",
            selected ? "text-primary" : "text-muted-foreground",
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
    </button>
  );
}

export function ThemePicker() {
  const isDark = useThemeState();

  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      <ThemeOption
        dark={false}
        selected={!isDark}
        label={copy.light}
        hint={copy.lightHint}
        icon={<IconSun className="size-4" />}
        onSelect={() => setTheme(false)}
      />
      <ThemeOption
        dark
        selected={isDark}
        label={copy.dark}
        hint={copy.darkHint}
        icon={<IconMoon className="size-4" />}
        onSelect={() => setTheme(true)}
      />
    </div>
  );
}
