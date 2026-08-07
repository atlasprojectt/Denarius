import { referenceId } from "@/lib/logging/reference";
import { cn } from "@/lib/utils";

// The one line about a failure that reaches the screen (issue #79).
//
// #70 correctly put no stack trace, exception message or digest detail in front
// of the user. But a failure nobody can name is reported as "não funcionou" and
// can never be reproduced. This is the string that closes that gap and nothing
// more: it discloses nothing about what broke — only the server log knows what
// the reference stands for.
//
// Renders nothing when there is no digest (a client-side error, or dev mode).
// An invented reference would send someone searching for a string that appears
// in no log, which is worse than saying nothing.

const copy = {
  label: "Referência",
};

export function ErrorReference({
  digest,
  className,
}: {
  digest?: string | null;
  className?: string;
}) {
  const reference = referenceId(digest);
  if (reference === null) return null;

  return (
    <p
      className={cn(
        "text-muted-foreground text-center text-xs text-balance",
        className,
      )}
    >
      {copy.label}:{" "}
      <span className="font-mono tabular-nums select-all">{reference}</span>
    </p>
  );
}
