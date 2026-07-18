import type { ReactNode } from "react";

export function PreferenceSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="px-5 py-6 sm:px-6">
      <div>
        <h2 id={id} className="text-sm font-medium">
          {title}
        </h2>
        <p className="mt-1 text-xs/relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
