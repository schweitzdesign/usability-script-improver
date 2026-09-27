import { motion } from "motion/react";
import { STAGGER_CONTAINER, SLIDE_LEFT } from "@/lib/motion";
import type { DraftTasksResult } from "@/lib/tools/draft-tasks";

export function TaskDraftCard({ draft }: { draft: DraftTasksResult }) {
  return (
    <div className="border-ink bg-card w-full max-w-[85%] overflow-hidden rounded-2xl border-[3px]">
      <div className="bg-forest text-bone flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-xs font-semibold">
        <span>Draft test plan</span>
        <span className="opacity-70">{draft.designState}</span>
        <span className="opacity-70">{draft.methodology}</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium">Objective:</span> {draft.learningObjective}
        </p>
      </div>
      <motion.ol
        className="divide-border flex flex-col divide-y"
        initial="hidden"
        animate="visible"
        variants={STAGGER_CONTAINER}
      >
        {draft.tasks.map((t, i) => (
          <motion.li key={i} variants={SLIDE_LEFT} className="flex gap-3 px-4 py-3">
            <span className="border-ink bg-chartreuse text-ink flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm leading-snug font-medium">{t.task}</p>
              <p className="text-muted-foreground mt-1 text-xs leading-snug">{t.whyThisTask}</p>
            </div>
          </motion.li>
        ))}
      </motion.ol>
    </div>
  );
}
