import Image from "next/image";

import { LogoWordmark } from "@/components/domain/logo";

// Brand cover for the login right half: the orange texture artwork with the
// wordmark overlaid top-right in a light-orange monochrome. Floats as a rounded
// card (m-2 + rounded-xl + shadow-sm) matching the app's inset sidebar frame,
// so auth and product share the same chrome. The invite page keeps the
// narrative BrandPanel; this one carries no copy.
export function CoverPanel() {
  return (
    <div className="hidden p-2 lg:flex">
      <div className="relative flex-1 overflow-hidden rounded-xl bg-stone-950 shadow-sm">
        {/* unoptimized: serve the lossless artwork at its native resolution —
            the optimizer's resized variants soften the fine grain texture. */}
        <Image
          src="/login-cover.webp"
          alt=""
          fill
          priority
          unoptimized
          className="denarius-auth-fade object-cover"
        />
        <LogoWordmark
          monochrome
          className="denarius-auth-fade absolute top-8 right-8 z-10 h-6 w-auto text-[#ffdcc9]"
        />
      </div>
    </div>
  );
}
