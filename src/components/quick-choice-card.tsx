import type { AskChoiceResult } from "@/lib/tools/ask-choice";

/**
 * Deliberately lower-chrome than TaskDraftCard/RefinementCard: this renders
 * every turn the model asks an enumerable question, so heavy borders here
 * would compete with, not support, the actual decision the designer is
 * making. A question line plus tappable pills, nothing else.
 */
export function QuickChoiceCard({
  choice,
  onPick,
  disabled,
}: {
  choice: AskChoiceResult;
  onPick: (option: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex max-w-[85%] flex-col gap-2 pl-1">
      <p className="text-foreground text-sm font-semibold">{choice.question}</p>
      <div className="flex flex-wrap gap-2">
        {choice.options.map((option, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(option)}
            disabled={disabled}
            className="border-ink bg-bone hover:bg-chartreuse focus-visible:ring-ring rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
