"use client";

import { ChartBackground } from "@/components/evilcharts/ui/background";

// Shared chart grammar for cumulative spend on Home and Times. Both charts
// use the same square grid and the same restrained vertical area fade; their
// data contracts remain separate because the engines already own those shapes.

export function SpendChartGrid() {
  return <ChartBackground variant="grid" />;
}

export function SpendAreaGradient({
  id,
  color = "var(--brand-accent)",
}: {
  id: string;
  color?: string;
}) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={0.22} />
        <stop offset="58%" stopColor={color} stopOpacity={0.075} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}
