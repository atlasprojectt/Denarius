import Image from "next/image";

// Brand cover for the login right half: the orange texture artwork framing a
// product shot of the cockpit. The wordmark lives in the form column, not here.
// Floats as a rounded card (m-2 + rounded-lg + shadow-sm) matching the app's
// inset sidebar frame, so auth and product share the same chrome. This one
// carries no copy.
export function CoverPanel() {
  return (
    <div className="hidden p-2 lg:flex">
      <div className="relative flex-1 overflow-hidden rounded-lg bg-stone-950 shadow-sm">
        {/* unoptimized: the source is a lossless WebP, pixel-identical to the
            artwork at full resolution; the optimizer's resized variants soften
            the grain and the small type in the product shot. */}
        <Image
          src="/login-cover.webp"
          alt=""
          fill
          priority
          unoptimized
          className="denarius-auth-fade object-cover"
        />
      </div>
    </div>
  );
}
