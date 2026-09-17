import type { Variants } from "motion/react";

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const SPRING_POP = { type: "spring", stiffness: 260, damping: 18 } as const;
export const SPRING_PRESS = { type: "spring", stiffness: 400, damping: 25 } as const;
export const DURATION_FAST = 0.18;
export const DURATION_BASE = 0.35;
export const STAGGER_STEP = 0.08;

// Shared reveal variants — the same choreography language everywhere
// (grade panel, home page): a staggered container plus a small set of
// per-child arrival styles, so every "cascade" in the app reads as one
// system instead of each component inventing its own timing.

/** Wrap the parent of a group of reveal children in this. */
export const STAGGER_CONTAINER: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER_STEP, delayChildren: 0.1 } },
};

/** Confident arrival with a slight overshoot — badges, icons, anything that should feel like it "lands." */
export const POP_IN: Variants = {
  hidden: { opacity: 0, scale: 0.5, rotate: -8 },
  visible: { opacity: 1, scale: 1, rotate: 0, transition: SPRING_POP },
};

/** Quiet arrival for text — headlines, body copy, anything that should feel calm. */
export const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION_BASE, ease: EASE_OUT } },
};

/** Sideways arrival for list-like content reading top-to-bottom or left-to-right. */
export const SLIDE_LEFT: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};
