import { z } from "zod";
import { GradeResultSchema, type GradeResult } from "@/lib/grading";
import { ONBOARDING_SKILL_PROMPT } from "@/lib/onboarding-skill";
import { DraftTasksResultSchema, type DraftTasksResult } from "@/lib/tools/draft-tasks";
import { RefinementResultSchema, type RefinementResult } from "@/lib/tools/refine-task";
import { AskChoiceResultSchema, type AskChoiceResult } from "@/lib/tools/ask-choice";

// draftedTasks/refinements/askChoice round-trip on the wire, not just render
// client side: the tool loop that produces them is scoped to a single
// request, so without persisting them back through subsequent requests the
// model has no memory of what it drafted, refined, or asked past that turn.
export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  // min(0): an assistant turn that only asks an ask_choice question can
  // legitimately have no separate prose reply — the QuickChoiceCard render
  // is the content. User-submitted content is still practically always
  // non-empty since the UI disables sending an empty draft.
  content: z.string().max(4000),
  draftedTasks: DraftTasksResultSchema.optional(),
  refinements: z.array(z.object({ taskText: z.string(), result: RefinementResultSchema })).optional(),
  askChoice: AskChoiceResultSchema.optional(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type { DraftTasksResult, RefinementResult, AskChoiceResult };

export const ChatRequestSchema = z.object({
  scriptText: z.string().trim().min(1).max(50_000),
  grade: GradeResultSchema.nullable(),
  messages: z.array(ChatMessageSchema).min(1).max(40),
});

export const CHAT_MAX_TOKENS = 250; // short, quick replies per spec
// A turn that calls draft_tasks needs real room — several tasks, each with
// its own wording plus a rationale, easily exceeds CHAT_MAX_TOKENS. Used for
// every call inside the tool loop; the system prompt's own brevity
// instruction is what keeps the conversational text short, not this ceiling.
export const CHAT_TOOL_MAX_TOKENS = 1024;

const POKE_PERSONALITY = `You are POKE, a usability-research thinking partner, texting back and forth with a designer. Curious, perceptive, constructive, and occasionally provocative — you're willing to challenge the designer's assumptions ("this question assumes the participant wants the feature") rather than just rewriting what they hand you. Playful but not childish, direct, no corporate hedge-speak.

Reply like a real text message, not a report: 1-3 short sentences, plain prose, one idea. If you catch yourself writing a fourth sentence, cut it. Never use markdown or any literal formatting characters: no asterisks, no underscores, no backticks, no headers, no bold, no numbered or bulleted lists, no emoji. Never use an em dash (—) or en dash (–) anywhere, including as a range separator. Use a period, comma, or colon instead. Never stack more than one question or option in a single message — if you have several things to ask or offer, pick the single most useful one and say only that, or call a tool that presents choices instead of listing them in prose. End with a real question or a concrete next step, not a summary of what you just said.`;

export function buildChatSystemPrompt(input: {
  scriptText: string;
  grade: GradeResult | null;
}) {
  const mode = input.grade
    ? `This script already has a real grade (${input.grade.grade}). Skip onboarding — dig directly into what's actually wrong and how to fix it. Reference specifics from the script, not generic advice.`
    : ONBOARDING_SKILL_PROMPT;

  const gradeContext = input.grade
    ? `\n\nGRADE: ${input.grade.grade} — ${input.grade.summary}\nWEAKNESSES: ${input.grade.weaknesses.join("; ") || "none"}\nCRITICAL CHANGES: ${input.grade.criticalChanges.join("; ") || "none"}`
    : "";

  return `${POKE_PERSONALITY}\n\n${mode}\n\nContext for this conversation — the original script${input.grade ? " and its grade" : ""} (never repeat this back verbatim, use it as background):\n\nSCRIPT:\n${input.scriptText}${gradeContext}`;
}
