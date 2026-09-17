"use client";

import { MotionConfig } from "motion/react";

/**
 * App-wide reduced-motion safety net. `reducedMotion="user"` makes every
 * Motion animation (whileHover, whileTap, AnimatePresence enter/exit,
 * animate) respect the OS-level prefers-reduced-motion setting
 * automatically, snapping transform-based motion to its end state instead
 * of animating it. This is on top of, not instead of, the explicit
 * useReducedMotion() checks in components with genuinely infinite/ambient
 * loops (BrandCluster, PokeLoader), which need to skip the loop entirely
 * rather than just snap to an end state.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
