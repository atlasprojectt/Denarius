import { money } from "@/lib/money";
import type { UsdDisplay } from "@/lib/engine/money-model";

// Renders the money-model UsdDisplay contract (2026-07-11 audit, S1/UX-01):
// the display currency leads, the original USD stays visible as secondary
// detail. When the period FX is missing the USD original stands alone — the
// caller discloses why (never a guessed conversion). Server-renderable; used
// by every screen that shows a USD-native figure, so the presentation of the
// same concept can never fork between routes.

export function UsdValue({
  value,
  className,
}: {
  value: UsdDisplay;
  className?: string;
}) {
  if (value.display === null) {
    return <span className={className}>{money(value.usd, "USD")}</span>;
  }
  return (
    <span className={className}>
      {money(value.display, value.currency)}
      <span className="ml-1 text-xs font-normal text-muted-foreground">
        ({money(value.usd, "USD")})
      </span>
    </span>
  );
}
