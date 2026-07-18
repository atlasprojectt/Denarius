"use client";

import { useEffect, useState } from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const copy = {
  label: "Visualizações de gastos",
  models: "Modelos",
  seats: "Assentos",
};

type TabValue = "models" | "seats";

export function ExploreTabs({
  models,
  seats,
}: {
  models?: React.ReactNode;
  seats?: React.ReactNode;
}) {
  const defaultValue: TabValue = models ? "models" : "seats";
  const [value, setValue] = useState<TabValue>(defaultValue);
  const hasModels = Boolean(models);
  const hasSeats = Boolean(seats);

  // Preserve the old anchored entry points while the compact tabs replace the
  // full-width anchor bar. This is navigation compatibility only; no route or
  // data contract changes.
  useEffect(() => {
    const syncFromHash = () => {
      if (window.location.hash === "#assentos" && hasSeats) setValue("seats");
      if (window.location.hash === "#por-modelo" && hasModels) setValue("models");
    };
    const timer = window.setTimeout(syncFromHash, 0);
    window.addEventListener("hashchange", syncFromHash);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, [hasModels, hasSeats]);

  return (
    <Tabs value={value} onValueChange={(next) => setValue(next as TabValue)}>
      <TabsList aria-label={copy.label}>
        {models && <TabsTrigger value="models">{copy.models}</TabsTrigger>}
        {seats && <TabsTrigger value="seats">{copy.seats}</TabsTrigger>}
      </TabsList>
      {models && <TabsContent value="models">{models}</TabsContent>}
      {seats && <TabsContent value="seats">{seats}</TabsContent>}
    </Tabs>
  );
}
