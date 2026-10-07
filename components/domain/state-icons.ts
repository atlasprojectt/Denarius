import type { IconSvgElement } from "@hugeicons/react";
import {
  Alert02Icon,
  AlertCircleIcon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";

// The icon grammar (DESIGN.md › Badges and status): one glyph per meaning,
// shared by badges, notices, toasts and inline results, so the same state never
// wears two icons. Context glyphs (a lock, a wallet, a provider mark) stay with
// their call sites; these carry state.
export const stateIcons = {
  /** Done, under control, connected. */
  done: CheckmarkCircle02Icon,
  /** Needs attention: amber budget, a warning threshold reached, a data gap. */
  attention: AlertCircleIcon,
  /** Budget breached. */
  breached: CancelCircleIcon,
  /** A system or action failure: a sync error, a save that did not go through. */
  failure: Alert02Icon,
  /** Not yet: collecting pace, pending, coming soon, a projected risk. */
  pending: Clock01Icon,
  /** A neutral disclosure. */
  info: InformationCircleIcon,
} satisfies Record<string, IconSvgElement>;
