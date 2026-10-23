"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { GradeFixtureKey } from "@/lib/preview-fixtures";

export type PreviewKind = GradeFixtureKey | "low-info-first" | "low-info-long";

const GRADE_OPTIONS: { key: PreviewKind; label: string; hint: string }[] = [
  { key: "A", label: "A", hint: "Strong script" },
  { key: "B", label: "B", hint: "Good, a few leaks" },
  { key: "C", label: "C", hint: "Mixed" },
  { key: "D", label: "D", hint: "Weak" },
  { key: "F", label: "F", hint: "Needs a rethink" },
];

const ONBOARDING_OPTIONS: { key: PreviewKind; label: string }[] = [
  { key: "low-info-first", label: "Too little to grade: first reply" },
  { key: "low-info-long", label: "Too little to grade: long chat" },
];

/**
 * Demo controls, shown in the header: jumps the app straight to a canned grade or chat state without calling the real
 * /api/grade or /api/chat routes. Whether this renders at all (dev-only on the real page, always
 * on /demo) is the caller's decision. On /demo it is how a visitor explores every result without
 * writing a script, so it is large, labelled in plain words, and uses the brand's sticker style.
 */
export function DevPreviewPanel({
  onApply,
  onClear,
}: {
  onApply: (kind: PreviewKind) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Escape closes the panel and puts focus back on the button that opened it; a press anywhere
  // outside closes it too.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  function pick(kind: PreviewKind) {
    onApply(kind);
    setOpen(false);
  }

  const optionClass =
    "border-ink bg-card text-foreground hover:bg-chartreuse focus-visible:ring-ring flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border-2 px-3 py-2 text-left text-sm font-medium outline-none focus-visible:ring-2";

  return (
    <div ref={rootRef} className="relative">
      {open && (
        <section
          id={panelId}
          aria-label="Demo controls"
          className="border-ink bg-bone text-foreground fixed inset-x-3 bottom-3 z-50 max-h-[80dvh] overflow-y-auto rounded-2xl border-2 p-4 shadow-[6px_6px_0_var(--ink)] sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:bottom-auto sm:mt-3 sm:w-80"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg leading-tight font-semibold">Jump to a result</h2>
              <p className="text-muted-foreground mt-1 text-sm leading-snug">
                This demo uses canned data. Pick any result to see it without writing a script.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close demo controls"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mt-1 -mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <h3 className="font-display mb-2 text-sm font-semibold">Grades</h3>
          <div className="mb-4 flex flex-col gap-2">
            {GRADE_OPTIONS.map((opt) => (
              <button key={opt.key} type="button" onClick={() => pick(opt.key)} className={optionClass}>
                <span>
                  <span className="sr-only">Grade </span>
                  <span className="font-display text-base font-semibold">{opt.label}</span>
                </span>
                <span className="text-muted-foreground text-sm font-normal">{opt.hint}</span>
              </button>
            ))}
          </div>

          <h3 className="font-display mb-2 text-sm font-semibold">When a script is too thin</h3>
          <div className="mb-4 flex flex-col gap-2">
            {ONBOARDING_OPTIONS.map((opt) => (
              <button key={opt.key} type="button" onClick={() => pick(opt.key)} className={optionClass}>
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              onClear();
              setOpen(false);
            }}
            className="border-ink hover:bg-chartreuse focus-visible:ring-ring flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-dashed px-3 py-2 text-sm font-semibold outline-none focus-visible:ring-2"
          >
            Start over
          </button>
        </section>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="border-ink bg-chartreuse text-ink focus-visible:ring-ring font-display inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-base font-semibold shadow-[3px_3px_0_var(--ink)] outline-none transition-transform duration-200 ease-[var(--ease-brand)] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
        Demo controls
      </button>
    </div>
  );
}
