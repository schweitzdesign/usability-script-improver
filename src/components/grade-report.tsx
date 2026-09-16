import type { GradeResult } from "@/lib/grading";

const TIER_CLASSES: Record<GradeResult["grade"], string> = {
  "A+": "bg-forest text-bone",
  A: "bg-forest text-bone",
  "A-": "bg-forest text-bone",
  "B+": "bg-chartreuse text-ink",
  B: "bg-chartreuse text-ink",
  "B-": "bg-chartreuse text-ink",
  "C+": "bg-muted text-muted-foreground",
  C: "bg-muted text-muted-foreground",
  "C-": "bg-muted text-muted-foreground",
  "D+": "bg-destructive/10 text-destructive",
  D: "bg-destructive/10 text-destructive",
  "D-": "bg-destructive/10 text-destructive",
  F: "bg-destructive/10 text-destructive",
};

function GradeList({
  title,
  items,
  dotClass,
}: {
  title: string;
  items: string[];
  dotClass: string;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-wide uppercase">{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-snug">
            <span className={`${dotClass} mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GradeReport({ result }: { result: GradeResult }) {
  return (
    <div className="space-y-5 text-left">
      <div className="flex items-start gap-4">
        <span
          className={`font-display border-ink flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] text-2xl font-semibold shadow-[4px_4px_0_var(--ink)] ${TIER_CLASSES[result.grade]}`}
        >
          {result.grade}
        </span>
        <p className="pt-1 text-base leading-snug font-medium">{result.summary}</p>
      </div>

      {(result.strengths.length > 0 || result.weaknesses.length > 0) && (
        <div className="grid gap-5 sm:grid-cols-2">
          {result.strengths.length > 0 && (
            <GradeList title="What's working" items={result.strengths} dotClass="bg-forest" />
          )}
          {result.weaknesses.length > 0 && (
            <GradeList title="What's leaky" items={result.weaknesses} dotClass="bg-vermilion" />
          )}
        </div>
      )}

      {result.criticalChanges.length > 0 && (
        <div className="border-destructive/30 bg-destructive/5 rounded-xl border p-4">
          <h3 className="text-destructive text-xs font-semibold tracking-wide uppercase">
            Fix before you launch this
          </h3>
          <ul className="mt-2 space-y-1.5">
            {result.criticalChanges.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-snug">
                <span className="bg-destructive mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
