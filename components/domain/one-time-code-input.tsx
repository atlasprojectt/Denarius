"use client";

import { Fragment, useState } from "react";

import { cn } from "@/lib/utils";

const CODE_LENGTH = 6;

/**
 * The six-digit e-mail code field shared by the verification flows (signup,
 * account deletion, password change). The real field stays a single sr-only
 * input, so native keyboard, paste, autofill and one-time-code keep working;
 * the six boxes are only its visual mirror. It is a bare <input>, not the
 * Input primitive: that one's w-full/h-8/padding outrank sr-only, and a
 * full-width hidden field scrolls a dialog sideways when it takes focus.
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
}: {
  id: string;
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  autoFocus?: boolean;
  describedBy?: string;
}) {
  const [focused, setFocused] = useState(autoFocus);

  return (
    <>
      <input
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
        className="flex cursor-text items-center gap-2"
      >
        {Array.from({ length: CODE_LENGTH }, (_, index) => {
          const digit = value[index] ?? "";
          const active =
            focused && index === Math.min(value.length, CODE_LENGTH - 1);
          return (
            <Fragment key={index}>
              {/* Two groups of three are easier to check against the e-mail. */}
              {index === CODE_LENGTH / 2 && (
                <span className="h-px w-2.5 shrink-0 bg-ink-faint" />
              )}
              <span
                className={cn(
                  "flex h-12 min-w-0 flex-1 items-center justify-center rounded-sm border bg-input/20 text-[1.375rem] leading-none font-normal text-foreground tabular-nums transition-[border-color,box-shadow] duration-(--motion-duration-fast) ease-(--motion-ease-standard)",
                  invalid ? "border-destructive/60" : "border-input",
                  active &&
                    (invalid
                      ? "border-destructive ring-2 ring-destructive/20"
                      : "border-ring ring-2 ring-ring/40"),
                )}
              >
                {digit ||
                  (active && (
                    <span className="denarius-caret h-6 w-px bg-foreground" />
                  ))}
              </span>
            </Fragment>
          );
        })}
      </div>
    </>
  );
}
