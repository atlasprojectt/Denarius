"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"

type ProgressOrientation = "horizontal" | "vertical"

type ProgressProps = ProgressPrimitive.Root.Props & {
  orientation?: ProgressOrientation
}

function Progress({
  className,
  children,
  value,
  min = 0,
  max = 100,
  orientation = "horizontal",
  ...props
}: ProgressProps) {
  const percentage =
    value === null || !Number.isFinite(value) || max <= min
      ? null
      : Math.min(1, Math.max(0, (value - min) / (max - min)))

  return (
    <ProgressPrimitive.Root
      value={value}
      min={min}
      max={max}
      data-slot="progress"
      data-orientation={orientation}
      data-bar-orientation={orientation}
      aria-orientation={orientation}
      className={cn(
        "group/progress flex gap-3",
        orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
        className,
      )}
      {...props}
    >
      {children}
      <ProgressTrack orientation={orientation}>
        <ProgressIndicator orientation={orientation} percentage={percentage} />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}

type ProgressTrackProps = ProgressPrimitive.Track.Props & {
  orientation?: ProgressOrientation
}

function ProgressTrack({
  className,
  orientation = "horizontal",
  ...props
}: ProgressTrackProps) {
  return (
    <ProgressPrimitive.Track
      className={cn(
        "relative flex items-center overflow-hidden rounded-md bg-muted",
        orientation === "vertical"
          ? "h-full w-1 flex-1 flex-col"
          : "h-1 w-full",
        className,
      )}
      data-slot="progress-track"
      {...props}
    />
  )
}

function ProgressIndicator({
  className,
  orientation = "horizontal",
  percentage = null,
  style,
  ...props
}: ProgressPrimitive.Indicator.Props & {
  orientation?: ProgressOrientation
  percentage?: number | null
}) {
  const verticalValues = {
    width: "100%",
    height: percentage === null ? "35%" : `${percentage * 100}%`,
    insetInlineStart: "auto",
    insetBlockEnd: 0,
  }
  const verticalStyle =
    orientation === "vertical"
      ? typeof style === "function"
        ? (state: ProgressPrimitive.Indicator.State) => ({
            ...style(state),
            ...verticalValues,
          })
        : { ...style, ...verticalValues }
      : style

  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn(
        "bg-primary transition-[width,height] duration-(--motion-duration-standard) ease-(--motion-ease-standard)",
        orientation === "vertical" ? "w-full" : "h-full",
        className,
      )}
      style={verticalStyle}
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn("text-xs/relaxed font-medium", className)}
      data-slot="progress-label"
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn(
        "ml-auto text-xs/relaxed text-muted-foreground tabular-nums",
        className
      )}
      data-slot="progress-value"
      {...props}
    />
  )
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
}
