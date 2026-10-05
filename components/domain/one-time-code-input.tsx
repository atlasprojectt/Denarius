"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CODE_LENGTH = 6;

/**
 * The six-digit e-mail code field shared by the verification flows (account
 * deletion, password change). The real field stays a single sr-only input, so
 * native keyboard, paste, autofill and one-time-code keep working; the six
 * boxes are only its visual mirror.
 */
export function OneTimeCodeInput({
  id,
  name,
  value,
  onValueChange,
  placeholder,
  invalid = false,
  autoFocus = false,
  describedBy,
  className,
}: {
  id: string;
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  autoFocus?: boolean;
  describedBy?: string;
  className?: string;
}) {
  const [focused, setFocused] = useState(autoFocus);

  return (
    <>
      <Input
        id={id}
        name={name}
        value={value}
        onChange={(event) =>
          onValueChange(
            event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH),
          )
        }
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        minLength={CODE_LENGTH}
        maxLength={CODE_LENGTH}
        placeholder={placeholder}
        required
        autoFocus={autoFocus}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className="sr-only"
      />
      <div
        aria-hidden
        onClick={() => document.getElementById(id)?.focus()}
        className={cn("grid cursor-text grid-cols-6 gap-2", className)}
      >
        {Array.from({ length: CODE_LENGTH }, (_, index) => {
          const digit = value[index] ?? "";
          const active =
            focused && index === Math.min(value.length, CODE_LENGTH - 1);
          return (
            <span
              key={index}
              className={cn(
                "flex h-12 items-center justify-center rounded-sm border text-xl font-medium tabular-nums transition-colors duration-(--motion-duration-fast) ease-(--motion-ease-standard)",
                digit
                  ? "border-border bg-muted text-foreground"
                  : "border-border bg-input/20 text-muted-foreground",
                invalid && "border-destructive/60",
                active && "border-ring ring-2 ring-ring/40",
              )}
            >
              {digit}
            </span>
          );
        })}
      </div>
    </>
  );
}
