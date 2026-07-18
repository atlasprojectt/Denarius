import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { RiLoader4Line } from "@remixicon/react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-[8px] border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary/90",
        secondary:
          "border-border/70 bg-muted/30 text-foreground hover:border-border hover:bg-muted/55 active:bg-muted/70",
        tertiary:
          "border-border/60 bg-muted/10 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:bg-primary/15 dark:hover:text-primary-hover",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80",
        destructive:
          "border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/25 focus-visible:border-destructive/50 focus-visible:ring-destructive/25 dark:bg-destructive/20 dark:hover:bg-destructive/30",
        outline:
          "border-border bg-transparent text-foreground hover:bg-muted/50 active:bg-muted/70 dark:bg-input/10",
        link: "rounded-none text-primary underline-offset-4 hover:underline dark:text-primary-hover",
        // Compatibility aliases while downstream call sites finish migrating.
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary/90",
        accent:
          "border-border/60 bg-muted/10 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary dark:hover:text-primary-hover",
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
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    loadingText?: string;
  };

function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  loading = false,
  loadingText,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const render = asChild && React.isValidElement(children) ? children : undefined;
  const loadingContent = loading ? (
    <>
      <span className="invisible inline-flex items-center gap-[inherit]" aria-hidden>
        {children}
      </span>
      <span className="absolute inset-0 flex items-center justify-center gap-[inherit]">
        <RiLoader4Line className="size-4 animate-spin" aria-hidden />
        {loadingText ? <span>{loadingText}</span> : null}
      </span>
    </>
  ) : (
    children
  );

  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading ? "true" : undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      render={render}
      nativeButton={render ? render.type === "button" : true}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
      {...(render ? {} : { children: loadingContent })}
    />
  );
}

export { Button, buttonVariants, type ButtonProps };
