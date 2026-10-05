import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// The design system's custom scale steps (app/globals.css): without them
// tailwind-merge reads `text-ui` as a color and drops the real text color.
// `label-caps` carries its own size, weight, tracking and leading, so it must
// replace a component's base size (e.g. a Button's `text-xs`) when passed in.
const twMerge = extendTailwindMerge<"label-caps">({
  extend: {
    theme: {
      text: ["2xs", "ui", "display-sm", "display"],
      radius: ["pill"],
    },
    classGroups: {
      "label-caps": ["label-caps"],
    },
    conflictingClassGroups: {
      "label-caps": ["font-size", "font-weight", "tracking", "leading"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
