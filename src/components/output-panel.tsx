"use client";

import { AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { GradeReport } from "@/components/grade-report";
import { ChatThread } from "@/components/chat-thread";
import { PokeLoader } from "@/components/poke-loader";
import { DURATION_BASE, EASE_OUT } from "@/lib/motion";
import type { GradeResult } from "@/lib/grading";
import type { ChatMessage } from "@/lib/chat";

export type PanelStatus =
  | "submitting" // POST /api/submissions in flight
  | "submission-error" // /api/submissions failed — nothing was saved, full retry
  | "grading" // submission saved; POST /api/grade in flight
  | "grade-error" // submission saved, grading failed — retry grading only
  | "chatting"; // onboarding or graded — chat visible, grade header optional

export function OutputPanel({
  status,
  errorMessage,
  grade,
  onboarding,
  messages,
  chatSending,
  onReset,
  onRetryGrade,
  onSendMessage,
}: {
  status: PanelStatus;
  errorMessage?: string | null;
  grade?: GradeResult | null;
  onboarding?: boolean;
  messages?: ChatMessage[];
  chatSending?: boolean;
  onReset: () => void;
  onRetryGrade?: () => void;
  onSendMessage?: (text: string) => void;
}) {
  if (status === "chatting") {
    return (
      <div
        role="status"
        className="border-ink bg-card motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 flex min-h-[22rem] flex-1 rotate-[-0.4deg] flex-col overflow-hidden rounded-3xl border-4 shadow-[8px_8px_0_var(--ink)] duration-300"
      >
        <AnimatePresence>
          {grade && !onboarding && (
            <motion.div
              key="grade-header"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: DURATION_BASE, ease: EASE_OUT }}
              className="border-ink overflow-hidden border-b-4"
            >
              <GradeReport result={grade} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex min-h-0 flex-1 flex-col gap-4 p-6 sm:p-8 sm:pt-6">
          <div className="min-h-0 flex-1">
            <ChatThread
              messages={messages ?? []}
              onSend={onSendMessage ?? (() => {})}
              isSending={Boolean(chatSending)}
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onReset} className="self-start">
            Poke another one
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="border-border bg-card motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 flex min-h-[22rem] flex-1 flex-col items-center justify-center rounded-3xl border-2 p-8 text-center duration-300"
    >
      {(status === "submitting" || status === "grading") && (
        <div className="flex flex-col items-center gap-3">
          <PokeLoader />
          <p className="text-lg font-medium">
            {status === "grading" ? "Poking holes…" : "Poking around…"}
          </p>
        </div>
      )}

      {status === "submission-error" && (
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="text-destructive h-10 w-10" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">That didn&rsquo;t land.</h2>
            <p className="text-muted-foreground max-w-xs text-sm">
              {errorMessage ?? "Something went wrong. Please try again."}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onReset}>
            Try again
          </Button>
        </div>
      )}

      {status === "grade-error" && (
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="text-destructive h-10 w-10" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Saved, but the grade didn&rsquo;t come through.</h2>
            <p className="text-muted-foreground max-w-xs text-sm">
              {errorMessage ?? "It's saved either way."} Want to try grading again?
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onRetryGrade}>
            Retry grading
          </Button>
        </div>
      )}
    </div>
  );
}
