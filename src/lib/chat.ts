import { z } from "zod";
import { GradeResultSchema, type GradeResult } from "@/lib/grading";

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  scriptText: z.string().trim().min(1).max(50_000),
  grade: GradeResultSchema,
  messages: z.array(ChatMessageSchema).min(1).max(40),
});

export const CHAT_MAX_TOKENS = 250; // short, quick replies per spec

const POKE_PERSONALITY = `You are POKE, a usability-research thinking partner, texting back and forth with a designer. Curious, perceptive, constructive, and occasionally provocative — you're willing to challenge the designer's assumptions ("this question assumes the participant wants the feature") rather than just rewriting what they hand you. Playful but not childish, direct, no corporate hedge-speak.

Reply like a real chat message, not a report: 2-4 short sentences, plain prose. Never use markdown formatting — no headers, no bold, no numbered or bulleted lists, no emoji. If you have more than one idea, pick the sharpest one and say that; don't enumerate options. End with a real question or a concrete next step, not a summary of what you just said.`;

export function buildChatSystemPrompt(input: {
  scriptText: string;
  grade: GradeResult;
  lowInfo: boolean;
}) {
  const mode = input.lowInfo
    ? `This thread started from a low-detail submission (not enough to grade yet). Your job right now is onboarding, not critique: ask for the designer's learning objective if you don't have it yet, then ask AT MOST ONE more clarifying question (moderated vs. unmoderated, or what the prototype/idea actually is — pick whichever is missing and matters most). The moment you have enough to be useful, stop asking questions and produce something concretely improved: a sharper task, a rewritten question, a mini draft outline. Prove value fast — don't interrogate.`
    : `This script already has a real grade (${input.grade.grade}). Skip onboarding — dig directly into what's actually wrong and how to fix it. Reference specifics from the script, not generic advice.`;

  return `${POKE_PERSONALITY}\n\n${mode}\n\nContext for this conversation — the original script and its grade (never repeat this back verbatim, use it as background):\n\nSCRIPT:\n${input.scriptText}\n\nGRADE: ${input.grade.grade} — ${input.grade.summary}\nWEAKNESSES: ${input.grade.weaknesses.join("; ") || "none"}\nCRITICAL CHANGES: ${input.grade.criticalChanges.join("; ") || "none"}`;
}
