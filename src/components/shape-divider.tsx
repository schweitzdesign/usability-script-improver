"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { STAGGER_CONTAINER, POP_IN } from "@/lib/motion";

/**
 * A loose row of the brand's shape vocabulary (dots, an arc, a bar) used
 * as a section break — the "collision" motif in its quietest form.
 *
 * Plays a one-time staggered pop-in when scrolled into view, left to
 * right, rather than looping forever — a divider marking a break should
 * read as a single considered beat, not ambient decoration.
 */
export function ShapeDivider({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <motion.svg
      viewBox="0 0 800 64"
      preserveAspectRatio="none"
      className={cn("h-10 w-full sm:h-12", className)}
      aria-hidden="true"
      initial={reduce ? "visible" : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      variants={STAGGER_CONTAINER}
    >
      <motion.circle cx="36" cy="36" r="5" fill="var(--ink)" variants={POP_IN} />
      <motion.circle cx="108" cy="28" r="14" fill="var(--forest)" variants={POP_IN} />
      <motion.path
        d="M 168 40 Q 210 8 252 34"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
        variants={POP_IN}
      />
      <motion.rect
        x="300" y="20" width="10" height="32" rx="4"
        fill="var(--chartreuse)"
        transform="rotate(20 305 36)"
        variants={POP_IN}
      />
      <motion.circle cx="380" cy="32" r="13" fill="none" stroke="var(--border)" strokeWidth="2.5" variants={POP_IN} />
      <motion.circle cx="466" cy="30" r="17" fill="var(--vermilion)" style={{ mixBlendMode: "multiply" }} variants={POP_IN} />
      <motion.circle cx="548" cy="20" r="8" fill="var(--forest)" variants={POP_IN} />
      <motion.path
        d="M 600 20 Q 640 52 682 26"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
        variants={POP_IN}
      />
      <motion.circle cx="742" cy="34" r="6" fill="var(--ink)" variants={POP_IN} />
      <motion.circle cx="770" cy="18" r="4" fill="var(--vermilion)" variants={POP_IN} />
    </motion.svg>
  );
}
