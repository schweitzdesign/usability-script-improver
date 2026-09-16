"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradeReport } from "@/components/grade-report";
import { ChatThread } from "@/components/chat-thread";
import type { GradeResult } from "@/lib/grading";
import type { ChatMessage } from "@/lib/chat";

export type PanelStatus =
  | "submitting" // POST /api/submissions in flight
  | "submission-error" // /api/submissions failed — nothing was saved, full retry
  | "grading" // submission saved; POST /api/grade in flight
  | "grade-error" // submission saved, grading failed — retry grading only
  | "graded"; // grade + chat visible

export function OutputPanel({
  status,
  errorMessage,
  grade,
  messages,
  chatSending,
  onReset,
  onRetryGrade,
  onSendMessage,
}: {
  status: PanelStatus;
  errorMessage?: string | null;
  grade?: GradeResult | null;
  messages?: ChatMessage[];
  chatSending?: boolean;
  onReset: () => void;
  onRetryGrade?: () => void;
  onSendMessage?: (text: string) => void;
}) {
  if (status === "graded" && grade) {
    return (
      <div
        role="status"
        className="border-ink bg-card animate-in fade-in slide-in-from-right-4 flex min-h-[22rem] flex-1 rotate-[0.4deg] flex-col gap-5 rounded-3xl border-4 p-6 shadow-[8px_8px_0_var(--ink)] duration-300 sm:p-8"
      >
        <GradeReport result={grade} />
        <div className="border-border flex-1 border-t pt-5">
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
    );
  }

  return (
    <div
      role="status"
      className="border-border bg-card animate-in fade-in slide-in-from-right-4 flex min-h-[22rem] flex-1 flex-col items-center justify-center rounded-3xl border-2 p-8 text-center duration-300"
    >
      {(status === "submitting" || status === "grading") && (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-forest h-8 w-8 animate-spin" aria-hidden="true" />
          <p className="text-lg font-medium">
            {status === "grading" ? "Grading it…" : "Poking around…"}
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
            <h2 className="text-lg font-semibold">Saved — but the grade didn&rsquo;t come through.</h2>
            <p className="text-muted-foreground max-w-xs text-sm">
              {errorMessage ?? "Your team still got it."} Want to try grading again?
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
