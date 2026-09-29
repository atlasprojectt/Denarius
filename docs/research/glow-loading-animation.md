# Loading icon glow: library research

**Date:** 2026-09-27  
**Question:** Which animation library should Denarius use for the small, looping glow around the logo mark while the Home screen is loading?

## Scope and current context

Denarius already depends on `motion` (`^13.1.1`) in [package.json](../../package.json). The target effect is a short client-side loading state: a soft highlight or glow travels around the existing `LogoMark`, loops while data is loading, and stops when the app is ready. It needs to work in both themes and honor reduced-motion preferences.

The fit ratings and recommendation below are engineering assessments derived from the documented APIs and Denarius's current dependencies and component patterns.

## Candidates from primary sources

### Motion for React (already installed)

Motion's React component is a declarative wrapper around normal HTML/SVG elements and accepts `animate`, `initial`, `exit`, and `transition` props. Its keyframe examples use arrays of values and `repeat: Infinity` plus `repeatDelay` for an endless loop ([React animation guide](https://motion.dev/docs/react-animation), [keyframes example](https://motion.dev/examples/react-keyframes)). Motion also documents the Next.js App Router integration: use a client component with `motion/react`, or use `motion/react-client` when the component can remain a Server Component ([Next.js installation](https://motion.dev/docs/react-installation), [motion component](https://motion.dev/docs/react-motion-component)).

For accessibility, `useReducedMotion` reports the user's Reduced Motion preference ([useReducedMotion](https://motion.dev/docs/react-use-reduced-motion)); `MotionConfig reducedMotion="user"` disables transform and layout animations globally while retaining opacity and color changes ([MotionConfig](https://motion.dev/docs/react-motion-config)). Motion's component updates animated values without React re-renders and recommends compositor-friendly `transform` and `opacity` for performance ([motion component performance](https://motion.dev/docs/react-motion-component)).

**Fit:** Excellent. The loading layer can animate the existing SVG mark or a small sibling glow element with declarative keyframes, loop with `repeat: Infinity`, and read reduced-motion preferences through Motion. No dependency or animation asset is added.

### GSAP

GSAP is framework-agnostic and is installed separately with `npm install gsap` ([installation](https://gsap.com/docs/v3/Installation/)). Its timelines support infinite repetition with `repeat: -1`, `repeatDelay`, and `yoyo` ([timeline](https://gsap.com/docs/v3/GSAP/Timeline/), [repeat](https://gsap.com/docs/v3/GSAP/Timeline/repeat%28%29/)). For React, GSAP recommends `gsap.context()` to collect and revert animations, with the `useGSAP()` hook handling cleanup ([context](https://gsap.com/docs/v3/GSAP/gsap.context%28%29/)). `gsap.matchMedia()` can branch on `prefers-reduced-motion` ([matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/)).

**Fit:** Technically strong for a complex, multi-step timeline or an animation that must coordinate many independent targets. For one small logo glow, it adds a new dependency and an imperative lifecycle/context layer even though Motion already covers the required loop.

### React Spring

React Spring's `useSpring` returns animated values for an `animated` element; its documented configuration includes `loop`, `delay`, `pause`, `reverse`, and `immediate` ([`useSpring` API](https://react-spring.dev/docs/components/use-spring)). The library is installed through `@react-spring/web` ([component documentation](https://react-spring.dev/docs/components)).

**Fit:** Good when the desired effect is spring physics or interruptible physical motion. A steady traveling glow is a timed keyframe loop, so adding a second animation model and dependency is unnecessary for this use case. Reduced-motion behavior would need to be wired explicitly through `immediate` or conditional configuration.

### Lottie / dotLottie React

The official dotLottie React package renders a Lottie or dotLottie animation with a `DotLottieReact` component and supports `loop` and `autoplay`; it also exposes playback controls and events ([official React README](https://github.com/LottieFiles/dotlottie-web/tree/main/packages/react)). The original `lottie-web` API likewise accepts `loop`, `autoplay`, and an animation `path` or `animationData` ([official loadAnimation options](https://github.com/airbnb/lottie-web/wiki/loadAnimation-options)).

**Fit:** Appropriate when Design supplies a finished After Effects/Lottie asset with richer vector choreography. It introduces an asset pipeline and an extra player dependency for a glow that can be expressed directly on the existing SVG mark. Design implication: a Lottie asset needs an explicit theme strategy; recoloring the asset at runtime is less direct than using CSS variables on `LogoMark`.

## Recommendation

Use the existing **Motion for React** dependency. It is the smallest change, works with the existing inline SVG `LogoMark`, and provides the required looping keyframes without hand-maintained timers or a new asset format.

For the implementation, keep the loading overlay as a client component because it owns animation state. Animate compositor-friendly properties (for example, opacity and a transform on a masked/highlight layer) and use theme tokens/CSS variables for color. Set `repeat: Infinity` with a calm duration and no abrupt scale pulse. When reduced motion is enabled, freeze the traveling highlight and leave a static low-contrast mark (or use only an opacity transition); do not rely on a perpetual transform loop in that mode. The existing `LogoMark` should remain the single source of path data.

The initial loading state should live in the root `app/loading.tsx` boundary, so the first document load can show the mark before the authenticated app shell is ready. The existing `app/(app)/loading.tsx` and nested route skeletons remain as fallbacks for later or slower sections.

## Sources

- [Motion for React animation guide](https://motion.dev/docs/react-animation)
- [Motion React keyframes and infinite repeat example](https://motion.dev/examples/react-keyframes)
- [Motion Next.js installation](https://motion.dev/docs/react-installation)
- [Motion component and performance](https://motion.dev/docs/react-motion-component)
- [Motion `useReducedMotion`](https://motion.dev/docs/react-use-reduced-motion)
- [MotionConfig reduced-motion policy](https://motion.dev/docs/react-motion-config)
- [GSAP installation](https://gsap.com/docs/v3/Installation/)
- [GSAP timelines](https://gsap.com/docs/v3/GSAP/Timeline/)
- [GSAP repeat](https://gsap.com/docs/v3/GSAP/Timeline/repeat%28%29/)
- [GSAP React cleanup with context](https://gsap.com/docs/v3/GSAP/gsap.context%28%29/)
- [GSAP `matchMedia` and reduced motion](https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/)
- [React Spring `useSpring`](https://react-spring.dev/docs/components/use-spring)
- [React Spring component APIs](https://react-spring.dev/docs/components)
- [dotLottie React official README](https://github.com/LottieFiles/dotlottie-web/tree/main/packages/react)
- [lottie-web `loadAnimation` options](https://github.com/airbnb/lottie-web/wiki/loadAnimation-options)
