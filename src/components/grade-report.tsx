"use client";

import { motion, useReducedMotion } from "motion/react";
import { STAGGER_CONTAINER, POP_IN, FADE_UP, SLIDE_LEFT } from "@/lib/motion";
import type { GradeResult } from "@/lib/grading";

const TIER_CLASSES: Record<GradeResult["grade"], string> = {
  "A+": "bg-forest text-bone",
  A: "bg-forest text-bone",
  "A-": "bg-forest text-bone",
  "B+": "bg-chartreuse text-ink",
  B: "bg-chartreuse text-ink",
  "B-": "bg-chartreuse text-ink",
  "C+": "bg-bone border-ink/20 text-ink",
  C: "bg-bone border-ink/20 text-ink",
  "C-": "bg-bone border-ink/20 text-ink",
  "D+": "bg-vermilion-ink text-bone",
  D: "bg-vermilion-ink text-bone",
  "D-": "bg-vermilion-ink text-bone",
  F: "bg-vermilion-ink text-bone",
};

const SECTION_BAR_CLASSES = {
  working: "bg-forest text-bone",
  leaky: "bg-chartreuse text-ink",
  critical: "bg-vermilion-ink text-bone",
} as const;

function GradeSection({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: keyof typeof SECTION_BAR_CLASSES;
}) {
  return (
    <motion.div variants={SLIDE_LEFT}>
      <h3
        className={`font-display px-6 py-2.5 text-sm font-bold sm:px-8 ${SECTION_BAR_CLASSES[tone]}`}
      >
        {title}
      </h3>
      <ul className="flex flex-col gap-3 px-6 py-5 sm:px-8">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-base leading-snug font-medium sm:text-lg">
            <span className="bg-ink mt-2 h-2 w-2 shrink-0 rounded-full" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export function GradeReport({ result }: { result: GradeResult }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="divide-ink divide-y-4 text-left"
      initial={reduce ? "visible" : "hidden"}
      animate="visible"
      variants={STAGGER_CONTAINER}
    >
      <div className="flex items-center gap-5 px-6 py-6 sm:px-8">
        <motion.span
          variants={POP_IN}
          className={`font-display border-ink flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[3px] text-3xl font-bold shadow-[5px_5px_0_var(--ink)] sm:h-24 sm:w-24 sm:text-4xl ${TIER_CLASSES[result.grade]}`}
        >
          {result.grade}
        </motion.span>
        <motion.p variants={FADE_UP} className="font-display text-xl leading-snug font-semibold sm:text-2xl">
          {result.summary}
        </motion.p>
      </div>

      {result.strengths.length > 0 && (
        <GradeSection title="What's working" items={result.strengths} tone="working" />
      )}
      {result.weaknesses.length > 0 && (
        <GradeSection title="What's leaky" items={result.weaknesses} tone="leaky" />
      )}
      {result.criticalChanges.length > 0 && (
        <GradeSection
          title="Fix before you launch this"
          items={result.criticalChanges}
          tone="critical"
        />
      )}
    </motion.div>
  );
}
