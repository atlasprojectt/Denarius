import Link from "next/link";
import { RiCheckLine, RiCircleLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { homeCopy } from "./copy";

const steps = [
  { key: "connected", href: "/ajustes/conexoes" },
  { key: "hasRoster", href: "/ajustes/roster" },
  { key: "hasBudget", href: "/ajustes/orcamentos" },
] as const;

export function SetupChecklist({
  state,
}: {
  state: { connected: boolean; hasRoster: boolean; hasBudget: boolean };
}) {
  const next = steps.find((step) => !state[step.key]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{homeCopy.setup.title}</CardTitle>
        <CardDescription>{homeCopy.setup.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => {
            const done = state[step.key];
            return (
              <li key={step.key}>
                <Link
                  href={step.href}
                  className="flex h-full items-start gap-3 rounded-lg border p-4 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  {done ? (
                    <RiCheckLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <RiCircleLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span>
                    <span className="block text-xs text-muted-foreground">
                      {homeCopy.setup.step(index + 1)}
                    </span>
                    <span className="mt-0.5 block text-sm font-medium">
                      {homeCopy.setup[step.key]}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        {next && (
          <Button asChild className="mt-5">
            <Link href={next.href}>{homeCopy.setup.continue}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
