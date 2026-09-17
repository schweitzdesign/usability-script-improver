"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * The recurring "collision" cluster from the brand mark: a few circles
 * overlapping with multiply blending, so the overlaps darken naturally
 * instead of needing hand-picked intersection colors.
 *
 * At rest, each circle drifts and breathes on its own independent loop —
 * different duration/delay per circle so they never sync up (no "twins").
 * Fully static under prefers-reduced-motion.
 */
export function BrandCluster({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <svg
      viewBox="0 0 240 150"
      className={cn("w-full", className)}
      aria-hidden="true"
    >
      <motion.circle
        cx="24"
        r="8"
        fill="var(--ink)"
        initial={{ cy: 80 }}
        animate={reduce ? undefined : { cy: [80, 75, 80] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="96"
        r="50"
        fill="var(--forest)"
        initial={{ cy: 82, scale: 1 }}
        animate={reduce ? undefined : { cy: [82, 78, 82], scale: [1, 1.03, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />
      <motion.circle
        cx="144"
        r="38"
        fill="var(--chartreuse)"
        style={{ mixBlendMode: "multiply" }}
        initial={{ cy: 96 }}
        animate={reduce ? undefined : { cy: [96, 101, 96] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      />
      <motion.circle
        cx="174"
        r="32"
        fill="var(--vermilion)"
        style={{ mixBlendMode: "multiply" }}
        initial={{ cy: 72, scale: 1 }}
        animate={reduce ? undefined : { cy: [72, 76, 72], scale: [1, 1.04, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      />
    </svg>
  );
}
