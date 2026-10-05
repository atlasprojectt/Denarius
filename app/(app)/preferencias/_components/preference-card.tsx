import type { ReactNode } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** One section of /preferencias: an icon-led title, one line on what the
 *  section controls, then the controls themselves. */
export function PreferenceCard({
  id,
  icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: IconSvgElement;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <Card className="gap-5 py-5 [--card-spacing:--spacing(5)] sm:gap-6 sm:py-6 sm:[--card-spacing:--spacing(6)]">
        <CardHeader>
          <CardTitle
            as="h2"
            id={id}
            className="flex items-center gap-2 text-sm text-foreground"
          >
            <HugeiconsIcon
              icon={icon}
              className="size-4 shrink-0 text-ink-faint"
              aria-hidden
            />
            {title}
          </CardTitle>
          <CardDescription className="text-xs/relaxed">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  );
}
