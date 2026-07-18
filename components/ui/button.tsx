import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { Spokes } from "@/components/loading-ui/spokes";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,opacity,transform] [transition-duration:var(--motion-duration-standard)] [transition-timing-function:var(--motion-ease-standard)] outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 disabled:transform-none aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:transform-none data-[loading=true]:transform-none aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary/90",
        secondary:
          "border-border/70 bg-muted/30 text-foreground hover:border-border/90 hover:bg-muted/50 hover:text-foreground active:bg-muted/65",
        tertiary:
          "border-border/60 bg-muted/10 text-muted-foreground [transition-duration:var(--motion-duration-fast)] hover:border-border/85 hover:bg-muted/40 hover:text-foreground hover:[&_svg]:text-brand-accent-light active:bg-muted/55",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80",
        destructive:
          "border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/25 focus-visible:border-destructive/50 focus-visible:ring-destructive/25 dark:bg-destructive/20 dark:hover:bg-destructive/30",
        outline:
          "border-border bg-transparent text-foreground hover:bg-muted/50 active:bg-muted/70 dark:bg-input/10",
        link: "rounded-none text-primary underline-offset-4 hover:underline dark:text-primary-hover",
      },
      size: {
        sm: "h-7 gap-1.5 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        default: "h-9 gap-2 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-10 gap-2 px-5 text-sm [&_svg:not([class*='size-'])]:size-4",
        icon: "size-9 p-0 [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-7 p-0 [&_svg:not([class*='size-'])]:size-3.5",
        // Kept for compact primitive integrations that predate this system.
        xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        "icon-xs": "size-6 p-0 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-10 p-0 [&_svg:not([class*='size-'])]:size-4",
      },
      shape: {
        default: "rounded-lg",
        compact: "rounded-md",
        pill: "rounded-pill",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      shape: "default",
    },
  },
);

function buttonShapeFor(
  variant: ButtonProps["variant"],
  size: ButtonProps["size"],
): NonNullable<ButtonProps["shape"]> {
  const isContextual = variant === "tertiary";
  const isIconOnly = typeof size === "string" && size.startsWith("icon");
  return isContextual || isIconOnly ? "pill" : "default";
}

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    loadingText?: string;
    motion?: "none" | "forward" | "backward" | "disclosure";
  };

function Button({
  className,
  variant = "primary",
  size = "default",
  shape,
  asChild = false,
  loading = false,
  loadingText,
  motion = "none",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const resolvedShape = shape ?? buttonShapeFor(variant, size);
  const renderElement =
    asChild && React.isValidElement<{ children?: React.ReactNode }>(children)
      ? children
      : undefined;
  const content = renderElement?.props.children ?? children;
  const composedChildren = (
    <>
      <span
        data-button-content
        aria-hidden={loading || undefined}
        className={cn(
          "inline-flex items-center gap-[inherit] transition-opacity [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)]",
          loading && "opacity-0",
        )}
      >
        {content}
      </span>
      <span
        data-button-loading
        aria-hidden={!loading || undefined}
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center gap-[inherit] opacity-0 transition-opacity [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)]",
          loading && "opacity-100",
        )}
      >
        <Spokes className="size-4 motion-reduce:[animation:none]" aria-hidden />
        {loadingText ? <span>{loadingText}</span> : null}
      </span>
    </>
  );
  const render = renderElement
    ? React.cloneElement(renderElement, undefined, composedChildren)
    : undefined;

  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading ? "true" : undefined}
      data-motion={motion === "none" ? undefined : motion}
      className={cn(
        buttonVariants({ variant, size, shape: resolvedShape, className }),
      )}
      render={render}
      nativeButton={render ? render.type === "button" : true}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
      {...(render ? {} : { children: composedChildren })}
    />
  );
}

export { Button, buttonShapeFor, buttonVariants, type ButtonProps };
