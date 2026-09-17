"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { BrandCluster } from "@/components/brand-cluster";
import { ShapeDivider } from "@/components/shape-divider";
import { STAGGER_CONTAINER, POP_IN, FADE_UP, SLIDE_LEFT, SPRING_POP } from "@/lib/motion";

// Same arrival as POP_IN, but this one decorative circle rests at partial
// opacity (it's a dimmed background layer, not a full-strength shape) —
// POP_IN's default target of opacity: 1 would fight its static 0.25.
const DIM_POP_IN: Variants = {
  hidden: { opacity: 0, scale: 0.5, rotate: -8 },
  visible: { opacity: 0.25, scale: 1, rotate: 0, transition: SPRING_POP },
};

const STEPS = [
  {
    color: "bg-forest",
    textColor: "text-bone",
    rotate: "-rotate-2",
    title: "Drop it.",
    body: "Paste a script, upload a .docx, or just describe what you're testing.",
  },
  {
    color: "bg-vermilion",
    textColor: "text-ink",
    rotate: "",
    title: "Poke it.",
    body: "We ask the annoying question you skipped: is this a task, or are you fishing for a compliment?",
  },
  {
    color: "bg-chartreuse",
    textColor: "text-ink",
    rotate: "rotate-2",
    title: "Discover something.",
    body: "Leave with a test built to find out what's true, not confirm what you hoped.",
  },
];

export function MarketingSections() {
  const reduce = useReducedMotion();
  const initial = reduce ? "visible" : "hidden";

  return (
    <>
      <div className="mx-auto w-full max-w-5xl px-6">
        <ShapeDivider />
      </div>

      {/* Forest pull-quote band */}
      <section aria-label="POKE's philosophy" className="bg-forest relative w-full overflow-hidden">
        {/* BrandCluster isn't used here directly — its forest-colored circle
            would blend invisibly into this section's own forest background. */}
        <motion.svg
          viewBox="0 0 200 130"
          aria-hidden="true"
          className="absolute top-8 right-14 hidden w-28 opacity-90 sm:block"
          initial={initial}
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={STAGGER_CONTAINER}
        >
          <motion.circle cx="20" cy="60" r="7" fill="var(--bone)" variants={POP_IN} />
          <motion.circle cx="82" cy="65" r="45" fill="var(--ink)" variants={DIM_POP_IN} />
          <motion.circle
            cx="118" cy="75" r="27"
            fill="var(--chartreuse)"
            style={{ mixBlendMode: "multiply" }}
            variants={POP_IN}
          />
          <motion.circle
            cx="148" cy="62" r="36"
            fill="var(--vermilion)"
            style={{ mixBlendMode: "multiply" }}
            variants={POP_IN}
          />
        </motion.svg>
        <motion.blockquote
          className="text-bone relative mx-auto max-w-4xl px-6 py-20 text-center sm:py-28"
          initial={initial}
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={STAGGER_CONTAINER}
        >
          <motion.p variants={FADE_UP} className="font-display text-3xl leading-tight font-semibold text-balance sm:text-5xl">
            Most usability tests are designed to validate.
            <br />
            POKE helps you discover.
          </motion.p>
          <motion.p variants={FADE_UP} className="mt-6 text-lg text-balance opacity-80">
            Designers already have plenty of tools for making things. This one&rsquo;s for
            thinking harder about whether they work.
          </motion.p>
        </motion.blockquote>
      </section>

      <div
        aria-hidden="true"
        className="h-5 w-full"
        style={{
          background:
            "repeating-conic-gradient(var(--ink) 0% 25%, var(--bone) 0% 50%) 0 0/22px 22px",
        }}
      />

      {/* How it works */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
        <h2 className="font-display mb-10 text-3xl font-semibold tracking-tight sm:text-4xl">
          Three moves.
        </h2>
        <motion.div
          className="grid gap-8 sm:grid-cols-3"
          initial={initial}
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={STAGGER_CONTAINER}
        >
          {STEPS.map((step, i) => (
            <motion.div key={step.title} variants={FADE_UP} className="space-y-3">
              <motion.div
                variants={POP_IN}
                className={`${step.color} ${step.textColor} ${step.rotate} border-ink flex h-10 w-10 items-center justify-center rounded-full border-[3px] text-sm font-semibold shadow-[3px_3px_0_var(--ink)]`}
              >
                {i + 1}
              </motion.div>
              <h3 className="font-display text-xl font-semibold">{step.title}</h3>
              <p className="text-muted-foreground">{step.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Who it's for */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
        <motion.div
          className="grid gap-10 sm:grid-cols-[1fr_auto] sm:items-center"
          initial={initial}
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={STAGGER_CONTAINER}
        >
          <div className="space-y-4">
            <motion.h2 variants={FADE_UP} className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Built for people who already know how to ask.
            </motion.h2>
            <motion.p variants={FADE_UP} className="text-muted-foreground max-w-xl text-lg">
              And want to ask better. POKE is for UX and product designers turning a rough
              idea, an existing script, or a test plan into something rigorous enough to
              trust.
            </motion.p>
          </div>
          <motion.div variants={POP_IN}>
            <BrandCluster className="hidden w-40 shrink-0 sm:block" />
          </motion.div>
        </motion.div>

        <motion.dl
          className="mt-10 grid gap-8 border-t pt-10 sm:grid-cols-3"
          initial={initial}
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={STAGGER_CONTAINER}
        >
          <motion.div variants={SLIDE_LEFT}>
            <dt className="font-medium">Solo designers</dt>
            <dd className="text-muted-foreground mt-1 text-sm">
              Shipping without a research team, who still want evidence over instinct.
            </dd>
          </motion.div>
          <motion.div variants={SLIDE_LEFT}>
            <dt className="font-medium">Researchers</dt>
            <dd className="text-muted-foreground mt-1 text-sm">
              Tired of writing tests that just rubber-stamp a decision already made.
            </dd>
          </motion.div>
          <motion.div variants={SLIDE_LEFT}>
            <dt className="font-medium">Teams</dt>
            <dd className="text-muted-foreground mt-1 text-sm">
              Who want to walk into a review with what actually happened, not opinions.
            </dd>
          </motion.div>
        </motion.dl>
      </section>

    </>
  );
}
