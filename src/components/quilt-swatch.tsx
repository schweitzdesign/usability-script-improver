import { cn } from "@/lib/utils";

/** A small literal callback to the brand brief's own pattern-swatch tiles. */
export function QuiltSwatch({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-11 w-11 rounded-lg", className)}
      aria-hidden="true"
    >
      <rect width="64" height="64" fill="var(--ink)" />
      <path d="M0 64 L64 0 L64 64 Z" fill="var(--chartreuse)" />
      <circle cx="18" cy="20" r="13" fill="var(--forest)" />
    </svg>
  );
}
