"use client"

import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

function Slider({
  className,
  getAriaValueText,
  ...props
}: SliderPrimitive.Root.Props<number> & {
  getAriaValueText?: SliderPrimitive.Thumb.Props["getAriaValueText"]
}) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      thumbAlignment="edge"
      className={cn("w-full", className)}
      {...props}
    >
      <SliderPrimitive.Control
        data-slot="slider-control"
        className="relative flex h-full min-h-5 w-full touch-none items-center select-none data-disabled:opacity-50"
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-input select-none"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="h-full rounded-full bg-primary select-none"
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          getAriaValueText={getAriaValueText}
          className="relative block size-4 shrink-0 rounded-full border-2 border-popover bg-primary shadow-sm ring-ring/30 transition-[box-shadow] duration-(--motion-duration-standard) ease-(--motion-ease-standard) select-none after:absolute after:-inset-2 hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden data-dragging:ring-4 data-disabled:pointer-events-none"
        />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
