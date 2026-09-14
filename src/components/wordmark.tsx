import { cn } from "@/lib/utils";

const SIZES = {
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-6xl sm:text-7xl",
} as const;

export function Wordmark({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <span className="sr-only">POKE</span>
      <span
        aria-hidden="true"
        className={cn(
          "text-ink inline-flex items-baseline font-display leading-none font-semibold tracking-tight",
          SIZES[size]
        )}
      >
        <span>P</span>
        <span
          className="bg-forest relative mx-[0.03em] inline-block rounded-full"
          style={{ width: "0.74em", height: "0.74em", top: "0.03em" }}
        />
        <span>K</span>
        <span>E</span>
        <span
          className="bg-vermilion ml-[0.08em] inline-block rounded-full"
          style={{ width: "0.16em", height: "0.16em" }}
        />
      </span>
    </span>
  );
}
