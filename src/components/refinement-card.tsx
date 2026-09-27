import type { RefinementResult } from "@/lib/tools/refine-task";

const SEVERITY_CLASSES = {
  critical: "bg-vermilion-ink text-bone",
  warning: "bg-chartreuse text-ink",
  note: "bg-bone border-ink/20 text-ink",
} as const;

export function RefinementCard({
  taskText,
  result,
}: {
  taskText: string;
  result: RefinementResult;
}) {
  return (
    <div className="border-ink bg-card w-full max-w-[85%] overflow-hidden rounded-2xl border-[3px]">
      <div className="border-border border-b px-4 py-2">
        <p className="text-muted-foreground text-xs">Checked:</p>
        <p className="text-sm leading-snug font-medium">&ldquo;{taskText}&rdquo;</p>
      </div>
      {result.clean ? (
        <div className="bg-forest text-bone px-4 py-3 text-sm font-medium">Clean. No issues found.</div>
      ) : (
        <ul className="flex flex-col gap-2 px-4 py-3">
          {result.findings.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className={`border-ink shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_CLASSES[f.severity]}`}
              >
                {f.severity}
              </span>
              <span className="text-sm leading-snug">{f.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
