import { cn } from "@/lib/utils";

/**
 * The recurring "collision" cluster from the brand mark: a few circles
 * overlapping with multiply blending, so the overlaps darken naturally
 * instead of needing hand-picked intersection colors.
 */
export function BrandCluster({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 150"
      className={cn("w-full", className)}
      aria-hidden="true"
    >
      <circle cx="24" cy="80" r="8" fill="var(--ink)" />
      <circle cx="96" cy="82" r="50" fill="var(--forest)" />
      <circle
        cx="144" cy="96" r="38"
        fill="var(--chartreuse)"
        style={{ mixBlendMode: "multiply" }}
      />
      <circle
        cx="174" cy="72" r="32"
        fill="var(--vermilion)"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
