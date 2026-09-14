"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLACEHOLDERS = [
  "Paste your usability script here…",
  "Or tell us what you're testing…",
  "Or just drop a .docx file…",
];

const CYCLE_MS = 2600;

function usePlaceholderCycle(paused: boolean) {
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [paused, reducedMotion]);

  return PLACEHOLDERS[index];
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
  const [isDragging, setIsDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const placeholder = usePlaceholderCycle(focused || text.length > 0 || Boolean(file));
  const hasContent = text.trim().length > 0 || Boolean(file);

  function acceptFile(candidate: File | undefined) {
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".docx")) return;
    onFileChange(candidate);
    onTextChange("");
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => {
          e.preventDefault();
          dragCounter.current += 1;
          setIsDragging(true);
        }}
        onDragLeave={() => {
          dragCounter.current -= 1;
          if (dragCounter.current <= 0) setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={cn(
          "border-border bg-card relative flex min-h-[22rem] flex-1 flex-col rounded-3xl border-2 p-6 transition-colors sm:p-8",
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
          <label className="flex flex-1 flex-col">
            <span className="sr-only">Your usability script</span>
            <textarea
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={placeholder}
              className="placeholder:text-muted-foreground/70 flex-1 resize-none bg-transparent text-xl leading-relaxed outline-none"
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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="hover:text-foreground -my-1 py-1 underline underline-offset-2"
          >
            Browse for a .docx file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
        </div>

        <Button onClick={onSubmit} disabled={!hasContent || submitting} size="lg">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Poking…
            </>
          ) : (
            "Poke it."
          )}
        </Button>
      </div>
    </div>
  );
}
