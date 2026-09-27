import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { boundedString } from "@/lib/grading";

/**
 * Agentic tool: offered via `tools`, never forced. Claude calls this instead
 * of writing an open paragraph whenever an intake question has a small,
 * enumerable set of good answers — trades typing for tapping, and
 * structurally forces the question itself to stay to one line since the
 * schema only allows a single short string.
 */
export const ASK_CHOICE_TOOL: Anthropic.Tool = {
  name: "ask_choice",
  description:
    "Ask the designer ONE focused question with 2-5 short candidate answers they can tap instead of typing a full reply. Use this for the onboarding intake whenever the likely answers are enumerable (design state, methodology confirmation, narrowing a vague objective down to a few concrete options). Do not use this for genuinely open questions that need a real explanation in their own words.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      question: { type: "string", description: "One short, single question. No stacked alternatives." },
      options: {
        type: "array",
        items: { type: "string" },
        description: "2-5 short answer options, each a few words, not a full sentence.",
      },
    },
    required: ["question", "options"],
    additionalProperties: false,
  },
};

export const AskChoiceResultSchema = z.object({
  question: boundedString(150),
  options: z.array(boundedString(60)).min(2).max(5),
});
export type AskChoiceResult = z.infer<typeof AskChoiceResultSchema>;
