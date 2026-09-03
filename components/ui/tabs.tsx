"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  children,
  ...props
}: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "relative flex h-9 w-fit items-center gap-0.5 rounded-full border border-border/70 bg-card p-0.5 text-muted-foreground",
        className,
      )}
      {...props}
    >
      <TabsPrimitive.Indicator
        aria-hidden
        data-slot="tabs-indicator"
        className="pointer-events-none absolute top-0 left-0 z-0 rounded-full bg-background [height:var(--active-tab-height)] [transform:translate(var(--active-tab-left),var(--active-tab-top))] [width:var(--active-tab-width)] transition-[transform,width] duration-(--motion-duration-max) ease-(--motion-ease-standard) motion-reduce:transition-none"
      />
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  ...props
}: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-medium outline-none transition-colors duration-(--motion-duration-standard) ease-(--motion-ease-standard) focus-visible:ring-2 focus-visible:ring-ring/40 data-active:text-foreground",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "mt-4 outline-none data-hidden:hidden focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
