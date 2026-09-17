"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { FileText, Loader2, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SPRING_PRESS, SPRING_POP, DURATION_BASE, EASE_OUT } from "@/lib/motion";

// A mix of functional hints and on-brand personality — the placeholder is
// the very first thing anyone reads, so it carries real brand voice, not
// just instructions.
const PLACEHOLDERS = [
  "Paste your usability script here…",
  "Or tell us what you're testing…",
  "Or just drop a .docx file…",
  "What are you actually trying to learn?",
  "Skip the compliment-fishing. Ask the real question.",
  "Got a rough idea? That's plenty to start.",
  "This is where validation theater goes to die.",
];

const TYPE_MS = 32;
const DELETE_MS = 16;
const PAUSE_MS = 1300;

/** Typewriter cycle through PLACEHOLDERS: types, pauses, deletes, advances. */
function useTypewriter(paused: boolean, reduce: boolean) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (paused || reduce) return;
    const current = PLACEHOLDERS[phraseIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting) {
      if (charCount < current.length) {
        timeout = setTimeout(() => setCharCount((c) => c + 1), TYPE_MS);
      } else {
        timeout = setTimeout(() => setDeleting(true), PAUSE_MS);
      }
    } else {
      if (charCount > 0) {
        timeout = setTimeout(() => setCharCount((c) => c - 1), DELETE_MS);
      } else {
        timeout = setTimeout(() => {
          setDeleting(false);
          setPhraseIndex((i) => (i + 1) % PLACEHOLDERS.length);
        }, DELETE_MS);
      }
    }
    return () => clearTimeout(timeout);
  }, [charCount, deleting, phraseIndex, paused, reduce]);

  const text = reduce ? PLACEHOLDERS[0] : PLACEHOLDERS[phraseIndex].slice(0, charCount);
  return { text, cycling: !paused && !reduce };
}

export function MegaInput({
  text,
  onTextChange,
  file,
  onFileChange,
  onSubmit,
  submitting,
}: {
  text: string;
  onTextChange: (value: string) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [isDragging, setIsDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const [showEmptyError, setShowEmptyError] = useState(false);
  const dragCounterRef = useRef(0);

  const hasContent = text.trim().length > 0 || Boolean(file);
  const { text: placeholderText, cycling } = useTypewriter(focused || hasContent, Boolean(reduceMotion));

  useEffect(() => {
    if (!showEmptyError) return;
    const t = setTimeout(() => setShowEmptyError(false), 2200);
    return () => clearTimeout(t);
  }, [showEmptyError]);

  function acceptFile(candidate: File | undefined) {
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".docx")) return;
    onFileChange(candidate);
    onTextChange("");
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  }

  function handlePokeClick() {
    if (!hasContent) {
      setShakeCount((c) => c + 1);
      setShowEmptyError(true);
      return;
    }
    onSubmit();
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <motion.div
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => {
          e.preventDefault();
          dragCounterRef.current += 1;
          setIsDragging(true);
        }}
        onDragLeave={() => {
          dragCounterRef.current -= 1;
          if (dragCounterRef.current <= 0) setIsDragging(false);
        }}
        onDrop={handleDrop}
        initial={{ opacity: 0, scale: 0.82, rotate: -10, y: 50 }}
        animate={{ opacity: 1, scale: 1, rotate: -0.4, y: 0 }}
        transition={SPRING_POP}
        className={cn(
          "border-ink bg-card relative flex min-h-[22rem] flex-1 flex-col rounded-3xl border-4 p-6 shadow-[8px_8px_0_var(--ink)] transition-colors duration-300 ease-[var(--ease-brand)] sm:p-8",
          isDragging && "border-forest bg-chartreuse/15",
          focused && !isDragging && "border-forest"
        )}
      >
        {file ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="bg-chartreuse/40 flex h-14 w-14 items-center justify-center rounded-full">
              <FileText className="text-ink h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-muted-foreground text-sm">Ready to send</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFileChange(null)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Remove
            </Button>
          </div>
        ) : (
          <label className="relative flex flex-1 flex-col">
            <span className="sr-only">
              Your usability script. Paste it, describe what you&rsquo;re testing, or drop a
              .docx file.
            </span>
            {!hasContent && (
              <span
                aria-hidden="true"
                className="text-muted-foreground/70 pointer-events-none absolute top-0 left-0 text-xl leading-relaxed select-none"
              >
                {placeholderText}
                {cycling && (
                  <span className="motion-safe:animate-pulse" aria-hidden="true">
                    |
                  </span>
                )}
              </span>
            )}
            <textarea
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="flex-1 resize-none bg-transparent text-xl leading-relaxed outline-none"
            />
          </label>
        )}

        {isDragging && (
          <div
            aria-hidden="true"
            className="bg-chartreuse/20 border-forest text-forest pointer-events-none absolute inset-0 flex items-center justify-center rounded-3xl border-2 border-dashed text-lg font-medium"
          >
            Drop it.
          </div>
        )}
      </motion.div>

      <div className="flex flex-col items-end gap-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: DURATION_BASE, ease: EASE_OUT }}
        >
          <motion.span
            key={shakeCount}
            className="inline-block"
            animate={shakeCount > 0 ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : undefined}
            transition={{ duration: 0.4 }}
          >
            <motion.span
              className="inline-block"
              whileHover={!submitting ? { scale: 1.05 } : undefined}
              whileTap={!submitting ? { scale: 0.93 } : undefined}
              transition={SPRING_PRESS}
            >
              <Button
                onClick={handlePokeClick}
                disabled={submitting}
                size="lg"
                className={cn(
                  "border-ink rotate-[1.5deg] rounded-full border-4 px-12 py-8 font-display text-2xl font-semibold shadow-[8px_8px_0_var(--ink)] disabled:rotate-0 disabled:shadow-none sm:px-16 sm:py-9 sm:text-3xl",
                  showEmptyError && "border-vermilion-ink"
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                    Poking…
                  </>
                ) : (
                  "Poke it."
                )}
              </Button>
            </motion.span>
          </motion.span>
        </motion.div>

        {showEmptyError && (
          <p role="alert" className="text-vermilion-ink text-sm font-medium">
            Give it something to poke first.
          </p>
        )}
      </div>
    </div>
  );
}
