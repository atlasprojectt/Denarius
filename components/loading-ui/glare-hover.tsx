"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

import styles from "./glare-hover.module.css";

type GlareHoverProps = {
  width?: string;
  height?: string;
  background?: string;
  borderRadius?: string;
  borderColor?: string;
  children?: ReactNode;
  glareColor?: string;
  glareOpacity?: number;
  glareAngle?: number;
  glareSize?: number;
  transitionDuration?: number;
  playOnce?: boolean;
  className?: string;
  style?: CSSProperties;
};

type GlareHoverVars = CSSProperties & {
  "--gh-width": string;
  "--gh-height": string;
  "--gh-bg": string;
  "--gh-br": string;
  "--gh-angle": string;
  "--gh-duration": string;
  "--gh-size": string;
  "--gh-rgba": string;
  "--gh-border": string;
};

function glareColorWithOpacity(color: string, opacity: number): string {
  const hex = color.replace("#", "");
  if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
  }

  if (/^[0-9A-Fa-f]{3}$/.test(hex)) {
    const red = Number.parseInt(hex[0] + hex[0], 16);
    const green = Number.parseInt(hex[1] + hex[1], 16);
    const blue = Number.parseInt(hex[2] + hex[2], 16);
    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
  }

  return color;
}

export function GlareHover({
  width = "500px",
  height = "500px",
  background = "#000",
  borderRadius = "10px",
  borderColor = "#333",
  children,
  glareColor = "#ffffff",
  glareOpacity = 0.5,
  glareAngle = -45,
  glareSize = 250,
  transitionDuration = 650,
  playOnce = false,
  className,
  style,
}: GlareHoverProps) {
  const variables: GlareHoverVars = {
    "--gh-width": width,
    "--gh-height": height,
    "--gh-bg": background,
    "--gh-br": borderRadius,
    "--gh-angle": `${glareAngle}deg`,
    "--gh-duration": `${transitionDuration}ms`,
    "--gh-size": `${glareSize}%`,
    "--gh-rgba": glareColorWithOpacity(glareColor, glareOpacity),
    "--gh-border": borderColor,
  };

  return (
    <div
      className={cn(styles.glareHover, playOnce && styles.playOnce, className)}
      style={{ ...variables, ...style }}
    >
      {children}
    </div>
  );
}

export default GlareHover;
