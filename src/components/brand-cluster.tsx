import { cn } from "@/lib/utils";

/**
 * The recurring "collision" cluster from the brand mark: a few circles
 * overlapping with multiply blending, so the overlaps darken naturally
 * instead of needing hand-picked intersection colors.
 */
export function BrandCluster({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 130"
      className={cn("w-full", className)}
      aria-hidden="true"
    >
      <circle cx="20" cy="60" r="6" fill="var(--ink)" />
      <circle cx="82" cy="65" r="45" fill="var(--forest)" />
      <circle
        cx="118" cy="75" r="27"
        fill="var(--chartreuse)"
        style={{ mixBlendMode: "multiply" }}
      />
      <circle
        cx="148" cy="62" r="36"
        fill="var(--vermilion)"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
