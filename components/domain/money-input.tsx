"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { formatPtBrMoneyInput, normalizePtBrMoney } from "@/lib/locale-money";
import { cn } from "@/lib/utils";

export function MoneyInput({
  id,
  name,
  currency,
  defaultValue,
  className,
  form,
  invalid = false,
}: {
  id: string;
  name: string;
  currency: string;
  defaultValue?: number | string;
  className?: string;
  form?: string;
  invalid?: boolean;
}) {
  const [display, setDisplay] = useState(() => formatPtBrMoneyInput(defaultValue));

  return (
    <div className={cn("flex items-center rounded-md border border-input bg-transparent focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40 dark:bg-input/30", invalid && "border-destructive ring-2 ring-destructive/20", className)}>
      <span className="shrink-0 border-r px-2 text-xs text-muted-foreground" aria-hidden>
        {currency}
      </span>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={(event) => setDisplay(event.target.value)}
        onBlur={() => {
          const normalized = normalizePtBrMoney(display);
          if (normalized !== "" && Number.isFinite(Number(normalized))) {
            setDisplay(formatPtBrMoneyInput(normalized));
          }
        }}
        aria-describedby={`${id}-currency`}
        form={form}
        aria-invalid={invalid}
        className="border-0 bg-transparent tabular-nums shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      <span id={`${id}-currency`} className="sr-only">Valor em {currency}</span>
      <input type="hidden" name={name} value={normalizePtBrMoney(display)} form={form} />
    </div>
  );
}
