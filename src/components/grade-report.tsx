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
  emphasis,
}: {
  title: string;
  items: string[];
  emphasis?: boolean;
}) {
  return (
    <div>
      <h3 className={`text-sm font-semibold ${emphasis ? "text-destructive" : ""}`}>
        {title}
      </h3>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item} className="text-muted-foreground flex gap-2 text-sm">
            <span aria-hidden="true">&middot;</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GradeReport({ result }: { result: GradeResult }) {
  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center gap-3">
        <span
          className={`font-display flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-semibold ${TIER_CLASSES[result.grade]}`}
        >
          {result.grade}
        </span>
        <p className="text-sm">{result.summary}</p>
      </div>

      {result.strengths.length > 0 && (
        <GradeList title="What's working" items={result.strengths} />
      )}
      {result.weaknesses.length > 0 && (
        <GradeList title="What's leaky" items={result.weaknesses} />
      )}
      {result.criticalChanges.length > 0 && (
        <GradeList title="Fix before you launch this" items={result.criticalChanges} emphasis />
      )}
    </div>
  );
}
