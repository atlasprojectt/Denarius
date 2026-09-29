"use client";

import { useReducedMotion, motion } from "motion/react";

import { LogoMark } from "@/components/domain/logo";
import { GlareHover } from "@/components/loading-ui/glare-hover";

const glowAnimation = {
  x: ["-7px", "7px", "-7px"],
  opacity: [0.2, 0.45, 0.2],
  scale: [0.9, 1.08, 0.9],
};

const glowTransition = {
  duration: 2.4,
  ease: "easeInOut" as const,
  repeat: Infinity,
};

export function DenariusLoader() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <main
      aria-busy="true"
      aria-label="Carregando o Denarius"
      className="fixed inset-0 z-50 grid min-h-dvh place-items-center bg-background text-foreground"
      role="status"
    >
      <div className="relative grid size-16 place-items-center">
        <motion.span
          aria-hidden
          className="absolute size-12 rounded-full bg-brand-accent opacity-25 blur-xl"
          animate={prefersReducedMotion ? undefined : glowAnimation}
          transition={glowTransition}
        />
        <GlareHover
          width="4rem"
          height="4rem"
          background="transparent"
          borderRadius="9999px"
          borderColor="transparent"
          glareColor="#ffffff"
          glareOpacity={0.32}
          glareAngle={-30}
          glareSize={300}
          transitionDuration={1250}
          className="relative z-10"
        >
          <span aria-hidden className="relative z-10 text-brand-accent">
            <LogoMark className="size-8" title="" />
          </span>
        </GlareHover>
      </div>
      <span className="sr-only">Carregando…</span>
    </main>
  );
}
