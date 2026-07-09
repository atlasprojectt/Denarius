import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BudgetEvaluation } from "@/lib/engine/budget";
import { percent } from "@/lib/format";
import { money } from "@/lib/money";
import { homeCopy } from "./copy";

const c = homeCopy.monthlyPace;

function point(x: number, value: number, max: number): { x: number; y: number } {
  const y = 112 - (value / max) * 88;
  return { x, y: Math.max(12, Math.min(112, y)) };
}

function serialize(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

export function MonthlyPaceChart({
  org,
  currency,
}: {
  org: BudgetEvaluation;
  currency: string;
}) {
  const projection = org.projection ?? org.spent;
  const max = Math.max(org.budget, org.spent, projection, 1) * 1.08;
  const todayX = Math.max(8, Math.min(148, 8 + org.pctElapsed * 140));
  const start = point(8, 0, max);
  const today = point(todayX, org.spent, max);
  const close = point(148, projection, max);
  const budget = point(8, org.budget, max);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{c.title}</CardTitle>
        <CardDescription>{c.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <svg
          viewBox="0 0 156 124"
          role="img"
          aria-label={c.aria}
          className="h-48 w-full overflow-visible"
        >
          <line
            x1="8"
            x2="148"
            y1={budget.y}
            y2={budget.y}
            className="stroke-muted-foreground/40"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <polyline
            points={serialize([start, today])}
            fill="none"
            className="stroke-primary"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {!org.collecting && (
            <polyline
              points={serialize([today, close])}
              fill="none"
              className="stroke-primary/55"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 6"
            />
          )}
          <circle
            cx={today.x}
            cy={today.y}
            r="4"
            className="fill-card stroke-primary"
            strokeWidth="3"
          />
        </svg>

        <dl className="grid grid-cols-3 gap-3 border-t pt-4 text-xs">
          <div>
            <dt className="text-muted-foreground">{c.spent}</dt>
            <dd className="mt-1 font-medium tabular-nums">
              {money(org.spent, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{c.budget}</dt>
            <dd className="mt-1 font-medium tabular-nums">
              {money(org.budget, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{c.elapsed}</dt>
            <dd className="mt-1 font-medium tabular-nums">
              {percent(org.pctElapsed)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
