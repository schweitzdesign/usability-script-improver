"use client";

import { useState } from "react";
import type { GradeFixtureKey } from "@/lib/preview-fixtures";

export type PreviewKind = GradeFixtureKey | "low-info-first" | "low-info-long";

const GRADE_OPTIONS: { key: PreviewKind; label: string }[] = [
  { key: "A", label: "Grade: A" },
  { key: "B", label: "Grade: B" },
  { key: "C", label: "Grade: C" },
  { key: "D", label: "Grade: D" },
  { key: "F", label: "Grade: F" },
];

const ONBOARDING_OPTIONS: { key: PreviewKind; label: string }[] = [
  { key: "low-info-first", label: "Too little info: first state" },
  { key: "low-info-long", label: "Too little info: long conversation" },
];

/**
 * Dev-only preview panel: jumps the app straight to a canned grade/chat
 * state without calling the real /api/grade or /api/chat routes. Never
 * rendered in production — this is a QA tool, not a product surface, so it
 * deliberately does NOT use the brand's sticker/tactile visual language.
 */
export function DevPreviewPanel({
  onApply,
  onClear,
}: {
  onApply: (kind: PreviewKind) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (process.env.NODE_ENV === "production") return null;

  function pick(kind: PreviewKind) {
    onApply(kind);
    setOpen(false);
  }

  return (
    <div className="fixed right-3 bottom-3 z-50 flex flex-col items-end font-sans text-xs">
      {open && (
        <div className="mb-2 w-56 rounded-lg border border-neutral-300 bg-white/95 p-2 shadow-lg backdrop-blur-sm">
          <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">
            Grade results
          </p>
          {GRADE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => pick(opt.key)}
              className="block w-full rounded px-2 py-1.5 text-left text-neutral-700 hover:bg-neutral-100"
            >
              {opt.label}
            </button>
          ))}

          <div className="my-1.5 border-t border-neutral-200" />
          <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">
            Onboarding
          </p>
          {ONBOARDING_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => pick(opt.key)}
              className="block w-full rounded px-2 py-1.5 text-left text-neutral-700 hover:bg-neutral-100"
            >
              {opt.label}
            </button>
          ))}

          <div className="my-1.5 border-t border-neutral-200" />
          <button
            type="button"
            onClick={() => {
              onClear();
              setOpen(false);
            }}
            className="block w-full rounded px-2 py-1.5 text-left text-neutral-500 hover:bg-neutral-100"
          >
            Reset to input
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open preview panel"
        className="rounded-full border border-neutral-300 bg-white/80 px-2.5 py-1 text-neutral-400 opacity-40 shadow-sm backdrop-blur-sm transition-opacity hover:opacity-100"
      >
        Preview
      </button>
    </div>
  );
}
