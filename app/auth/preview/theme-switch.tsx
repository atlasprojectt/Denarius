"use client";

// Preview-only theme flip (this route lives outside the app shell, so it has no
// sidebar ThemeToggle). Writes the same `theme` key the root layout's no-FOUC
// script reads, so a reload keeps whatever was picked here.
export function ThemeSwitch() {
  return (
    <button
      type="button"
      className="rounded-pill border px-3 py-1.5 text-xs font-medium"
      onClick={() => {
        const dark = document.documentElement.classList.toggle("dark");
        localStorage.setItem("theme", dark ? "dark" : "light");
      }}
    >
      Alternar tema
    </button>
  );
}
