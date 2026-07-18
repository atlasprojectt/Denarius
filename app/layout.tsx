import type { Metadata } from "next";
import { DM_Sans, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Denarius — governança de gasto de IA",
  description:
    "Orçamentos, projeção de fechamento e avisos antecipados para o gasto de IA da sua empresa.",
};

// Runs before first paint: applies the saved theme (or the OS preference) so
// the .dark class is present before the body renders — no flash of the wrong
// theme. Also keeps a matchMedia listener live so a "system" preference tracks
// the OS in real time. Kept as a raw string so it ships inline in <head>.
// See ThemePicker.
const themeScript = `(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');function a(){var t=localStorage.getItem('theme');var d=t==='dark'||((t==='system'||!t)&&m.matches);document.documentElement.classList.toggle('dark',d);}a();m.addEventListener('change',a);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        geistSans.variable,
        geistMono.variable,
        dmSans.variable,
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
