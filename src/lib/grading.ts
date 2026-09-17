import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, GRADING_MODEL } from "@/lib/anthropic";

export const GRADE_VALUES = [
  "F", "D-", "D", "D+", "C-", "C", "C+", "B-", "B", "B+", "A-", "A", "A+",
] as const;

// Anthropic's tool input_schema supports neither maxItems nor maxLength
// (both rejected as unsupported), so the model isn't hard-capped at the
// wire level even though the system prompt asks for brevity. Truncate
// rather than reject on overage — a slightly-too-long grade shouldn't
// throw away an otherwise-valid response and cost a retry.
const boundedString = (maxLen: number) =>
  z
    .string()
    .min(1)
    .transform((s) => (s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s));

const boundedList = z
  .array(boundedString(240))
  .transform((items) => items.slice(0, 3));

export const GradeResultSchema = z.object({
  grade: z.enum(GRADE_VALUES),
  summary: boundedString(280),
  strengths: boundedList,
  weaknesses: boundedList,
  criticalChanges: boundedList,
  openingMessage: boundedString(700),
});
export type GradeResult = z.infer<typeof GradeResultSchema>;

// Mirrors GradeResultSchema exactly as an Anthropic input_schema.
export const GRADE_TOOL: Anthropic.Tool = {
  name: "submit_grade",
  description: "Submit the structured grade for the usability test script.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      grade: { type: "string", enum: [...GRADE_VALUES] },
      summary: { type: "string", description: "One sentence. On-brand, not corporate." },
      strengths: {
        type: "array",
        items: { type: "string" },
        description: "At most 3 items.",
      },
      weaknesses: {
        type: "array",
        items: { type: "string" },
        description: "At most 3 items.",
      },
      criticalChanges: {
        type: "array",
        items: { type: "string" },
        description: "Pre-launch blockers only — not nitpicks. At most 3 items.",
      },
      openingMessage: {
        type: "string",
        description: "First line of an ongoing chat with the designer — not a form field.",
      },
    },
    required: ["grade", "summary", "strengths", "weaknesses", "criticalChanges", "openingMessage"],
    additionalProperties: false,
  },
};

export const SCRIPT_TRUNCATE_CHARS = 6000; // keeps grading cheap & fast

export function truncateScript(scriptText: string): string {
  if (scriptText.length <= SCRIPT_TRUNCATE_CHARS) return scriptText;
  return (
    scriptText.slice(0, SCRIPT_TRUNCATE_CHARS) +
    `\n\n[…truncated — ${scriptText.length.toLocaleString()} characters total, only the first ${SCRIPT_TRUNCATE_CHARS.toLocaleString()} were reviewed]`
  );
}

const LOREM_PATTERN = /\blorem\s+ipsum\b/i;
const MIN_WORDS = 25;

/** Zero-token heuristic: ungradeable input is handled entirely in app logic. */
export function isLowInfo(scriptText: string): boolean {
  const words = scriptText.trim().split(/\s+/).filter(Boolean);
  if (words.length < MIN_WORDS) return true;
  if (LOREM_PATTERN.test(scriptText)) return true;
  const uniqueRatio = new Set(words.map((w) => w.toLowerCase())).size / words.length;
  if (uniqueRatio < 0.3) return true; // "test test test test…" / keyboard mash
  return false;
}

/** Shown when input is too thin to grade — this is an onboarding moment, not a fake grade. */
export const LOW_INFO_OPENING_MESSAGE =
  "There's not quite enough here yet for me to grade. Let's fix that. What's the one decision you're trying to make with this test? Give me your learning objective and I'll help you build the rest around it.";

export const GRADING_SYSTEM_PROMPT = `You are POKE, a usability-research reviewer with the eye of a FAANG-level Principal UX Researcher and the voice of someone who has sat through a thousand rubber-stamp usability tests. You are not here to be nice. You are here to be useful.

Read the usability test script in the user message and grade it exactly the way a demanding but fair principal researcher would grade a junior's work before it goes in front of real participants.

GRADING RUBRIC — use the full range; most scripts are not A-range:
- A+: Ready to run today. Clear, falsifiable learning objective. Tasks are behavioral, not leading. Questions probe reasoning ("walk me through", "why") instead of opinion ("do you like this?"). This is the bar a Principal researcher signs off on without a note.
- A / A-: Strong and runnable with minor polish.
- B+ / B / B-: Workable but leaky — somewhere the script leads the witness (a task tells the participant what to think, or a question fishes for a compliment). Fixable, not fatal.
- C+ / C / C-: Structurally confused. No clear learning objective, or the tasks and questions don't connect to one. Reads like a feature checklist wearing a usability-test costume.
- D+ / D / D-: Validation theater — the script exists to get participants to agree with a decision that's already been made.
- F: "lol we're user-centered wink wink." No real objective or tasks, or too thin to evaluate as a usability test.

Grade the SCRIPT, not the idea being tested — a rough idea can still earn an A if the test around it is sharp.

CRITICAL CHANGES vs. weaknesses: criticalChanges are pre-launch blockers only — things that would make the resulting data misleading or unusable if shipped as-is (leading questions, no learning objective, screening that defeats the point, tasks that hand the participant the answer). Wording nitpicks and "nice to have" polish belong in weaknesses, if anywhere — never in criticalChanges. Return at most 3 in each list; return fewer if there's genuinely less to say. Never pad. Each item in strengths/weaknesses/criticalChanges is ONE short sentence — under 20 words, no sub-clauses stacked with commas or em-dashes. Cut it down to the sharpest version of the point.

VOICE — this copy is read by the designer who wrote the script:
- Playful but not childish. Direct. Specific to THIS script, never generic.
- Willing to call out validation theater by name.
- No corporate hedge-speak ("it could perhaps be beneficial to consider..."). Say the thing.
- Never mean — the goal is a sharper test, not a wounded designer.
- Never use an em dash (—) or en dash (–) anywhere, in any field, including as a range separator ("6-8" not "6–8"). Use a period, comma, or colon instead.

Call the submit_grade tool exactly once. The "openingMessage" field is the FIRST LINE of an ongoing conversation with the designer, not a form label or a recap of the grade — write it like you just read their script and are about to talk to them about it. Never write anything that reads like a template ("Let's discuss your script...").`;

export class GradingUnavailableError extends Error {}
export class GradingFailedError extends Error {}

/**
 * Runs the real grading call against Claude. Shared by the initial submit
 * path and the mid-chat auto-grade transition — one place owns the tool
 * config, the call, and the validation.
 */
export async function runGrading(scriptText: string): Promise<GradeResult> {
  const anthropic = getAnthropicClient();
  if (!anthropic) {
    throw new GradingUnavailableError("ANTHROPIC_API_KEY not configured.");
  }

  const response = await anthropic.messages.create({
    model: GRADING_MODEL,
    max_tokens: 1024,
    system: GRADING_SYSTEM_PROMPT,
    tools: [GRADE_TOOL],
    tool_choice: { type: "tool", name: "submit_grade" },
    messages: [{ role: "user", content: truncateScript(scriptText) }],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
  const validated = GradeResultSchema.safeParse(toolUse?.input);
  if (!validated.success) {
    console.error("[grading] model returned invalid shape:", validated.error);
    throw new GradingFailedError("Model returned an invalid grade shape.");
  }
  return validated.data;
}
