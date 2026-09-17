"use client";

import { motion, useReducedMotion } from "motion/react";

// Three vertices of the orbit triangle.
const PATH_CX = [20, 26, 14, 20];
const PATH_CY = [12, 26, 26, 12];

// Each dot starts at a different vertex (rotate the path by its own index)
// so all three are always visually distinct from frame 0 — no shared
// start position, no delay-based stacking before they "spread out."
function rotated(path: number[], offset: number) {
  return [...path.slice(offset), ...path.slice(1, offset + 1)];
}

const DOTS = [
  { color: "var(--forest)", radius: 7, offset: 0, pulseDelay: 0 },
  { color: "var(--chartreuse)", radius: 6, offset: 1, pulseDelay: 0.25 },
  { color: "var(--vermilion)", radius: 5, offset: 2, pulseDelay: 0.5 },
];

/**
 * On-brand loading motif: three brand-colored circles orbiting a shared
 * center, standing in for the generic spinner at the app's most visible
 * loading moment. Falls back to a slow static opacity pulse under
 * prefers-reduced-motion — still communicates activity without motion.
 */
export function PokeLoader() {
  const reduce = useReducedMotion();

  return (
    <svg viewBox="0 0 40 40" className="h-8 w-8" role="img" aria-label="Loading">
      {DOTS.map((dot, i) =>
        reduce ? (
          <motion.circle
            key={i}
            cx="20"
            cy="20"
            r={dot.radius}
            fill={dot.color}
            style={{ mixBlendMode: i === 0 ? "normal" : "multiply" }}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: dot.pulseDelay, ease: "easeInOut" }}
          />
        ) : (
          <motion.circle
            key={i}
            r={dot.radius}
            fill={dot.color}
            style={{ mixBlendMode: i === 0 ? "normal" : "multiply" }}
            initial={{ cx: rotated(PATH_CX, dot.offset)[0], cy: rotated(PATH_CY, dot.offset)[0] }}
            animate={{ cx: rotated(PATH_CX, dot.offset), cy: rotated(PATH_CY, dot.offset) }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )
      )}
    </svg>
  );
}
