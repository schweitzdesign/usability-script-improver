import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, GRADING_MODEL } from "@/lib/anthropic";
import { boundedString } from "@/lib/grading";
import { recordUsage } from "@/lib/usage";

/**
 * Agentic tool: offered via `tools`, never forced. Claude calls this on a
 * task's wording whenever one has been drafted or edited, before presenting
 * it as final.
 */
export const REFINE_TASK_TOOL: Anthropic.Tool = {
  name: "refine_task_wording",
  description:
    "Checks a single usability-test task's wording for leading bias, opinion-framing, colloquial tone, over-explained steps, and brevity. Call this whenever a task has been drafted or edited, before presenting it as final. Returns structured findings with severity.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      taskText: { type: "string", description: "The exact task wording to check." },
    },
    required: ["taskText"],
    additionalProperties: false,
  },
};

const FindingTypeSchema = z.enum(["opinion", "leading", "colloquial", "hand-holding", "brevity"]);
const SeveritySchema = z.enum(["critical", "warning", "note"]);

export const RefinementFindingSchema = z.object({
  type: FindingTypeSchema,
  severity: SeveritySchema,
  detail: boundedString(180),
  excerpt: boundedString(60).optional(),
});
export type RefinementFinding = z.infer<typeof RefinementFindingSchema>;

export const RefinementResultSchema = z.object({
  clean: z.boolean(),
  findings: z.array(RefinementFindingSchema),
});
export type RefinementResult = z.infer<typeof RefinementResultSchema>;

// ---- Layer 1: deterministic, zero-token lint. Real code, real rules, no
// model involved — this is the part that's genuinely "a function that
// performs work on knowledge" rather than a prompt in a trench coat.

const OPINION_PATTERNS = [
  /\bwhat do you think\b/i,
  /\bhow do you feel\b/i,
  /\bdo you like\b/i,
  /\bwould you use\b/i,
  /\brate how\b/i,
  /\bon a scale of\b/i,
  /\bhow satisfied\b/i,
  /\bdo you find\b/i,
  /\bis this (easy|hard|intuitive|confusing)\b/i,
  /\bwhat('s| is) your (opinion|impression|first reaction)\b/i,
];

const LEADING_PATTERNS = [
  /\beasily\b/i,
  /\bsimply\b/i,
  /\bquickly\b/i,
  /\bintuitively\b/i,
  /\bobviously\b/i,
  /\bclearly\b/i,
  /\bconveniently\b/i,
  /\beffortlessly\b/i,
  /\bseamlessly\b/i,
  /\binstantly\b/i,
  /\bjust (tap|click|find|select|hit|press)\b/i,
  /\bof course\b/i,
  /\bshould (only |just )?take (only )?(a )?(second|moment|minute)s?\b/i,
];

const HANDHOLD_PATTERNS = [
  /\bclick\b/gi,
  /\bthen\b/gi,
  /\bnext\b/gi,
  /\bafter that\b/gi,
  /\bnavigate to\b/gi,
  /\bgo to\b/gi,
  /\bselect\b/gi,
  /\btap on\b/gi,
];

const COLLOQUIAL_PATTERNS = [
  /\bkinda\b/i,
  /\bgonna\b/i,
  /\bwanna\b/i,
  /\bstuff\b/i,
  /\bawesome\b/i,
  /\bsuper\b/i,
  /\bcool\b/i,
  /\bbasically\b/i,
  /!/,
];

function firstMatch(text: string, patterns: RegExp[]): RegExpMatchArray | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

export function lintTaskWording(taskText: string): RefinementFinding[] {
  const findings: RefinementFinding[] = [];

  const opinionMatch = firstMatch(taskText, OPINION_PATTERNS);
  if (opinionMatch) {
    findings.push({
      type: "opinion",
      severity: "critical",
      detail:
        "This asks for an opinion, not a task. Rewrite it as something the participant does, not something they judge.",
      excerpt: opinionMatch[0],
    });
  }

  const leadingMatch = firstMatch(taskText, LEADING_PATTERNS);
  if (leadingMatch) {
    findings.push({
      type: "leading",
      severity: "warning",
      detail: "This tells the participant the task should be easy before they've tried it. Cut the difficulty judgment.",
      excerpt: leadingMatch[0],
    });
  }

  const handholdCount = HANDHOLD_PATTERNS.reduce(
    (count, pattern) => count + (taskText.match(pattern)?.length ?? 0),
    0
  );
  if (handholdCount >= 3) {
    findings.push({
      type: "hand-holding",
      severity: "warning",
      detail:
        "This spells out the click path instead of stating the goal. It tests whether they can follow directions, not whether they can find their way.",
    });
  }

  if (COLLOQUIAL_PATTERNS.some((pattern) => pattern.test(taskText))) {
    findings.push({
      type: "colloquial",
      severity: "note",
      detail: "Casual phrasing here works against precise, neutral wording.",
    });
  }

  const sentenceCount = (taskText.match(/[.!?]+/g) ?? []).length;
  const wordCount = taskText.trim().split(/\s+/).filter(Boolean).length;
  if (sentenceCount > 2 || wordCount > 45) {
    findings.push({
      type: "brevity",
      severity: "note",
      detail: "This is running long. A short scenario is fine, but this reads like it's rambling past the point.",
    });
  }

  return findings;
}

// ---- Layer 2: a nested Haiku call, scoped narrowly to the two defects
// keyword matching can't reliably catch: bias and opinion-framing that
// don't use an obvious tell word.

const SEMANTIC_REFINEMENT_TOOL: Anthropic.Tool = {
  name: "submit_semantic_findings",
  description: "Submit any leading-bias or opinion-framing defects found, or an empty list if the task is clean.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      findings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["opinion", "leading"] },
            detail: { type: "string" },
          },
          required: ["type", "detail"],
          additionalProperties: false,
        },
      },
    },
    required: ["findings"],
    additionalProperties: false,
  },
};

const SemanticFindingSchema = z.object({
  type: z.enum(["opinion", "leading"]),
  detail: boundedString(180),
});
const SemanticSubmitSchema = z.object({ findings: z.array(SemanticFindingSchema) });

const SEMANTIC_CRITIC_PROMPT = `You are a usability-testing wording critic. You check ONE task's wording for two specific defects that simple keyword matching misses:

1. LEADING BIAS: the task sets an expectation about difficulty, speed, or outcome without an obvious "easy/quick" keyword. Example: "It should only take a minute" sets a speed expectation. "You'll probably want to check your order first" tells them what they'll want.
2. OPINION-FRAMING disguised as a task: the wording asks for a judgment or reaction while looking like a task. Example: "Try out the new checkout and see how it feels" is really asking for a feeling, not a completion.

If the task has NEITHER defect, call the tool with an empty findings array. Do not invent problems that aren't there, a clean, well-written task should come back clean. Do not flag anything an obvious keyword would already catch (words like "easily", "quickly", "what do you think"), those are handled separately. Call submit_semantic_findings exactly once.`;

/**
 * Real two-layer analysis: deterministic lint always runs (zero cost,
 * instant), the nested model call runs whenever the client is configured
 * and adds anything the lint missed. Never throws — a failed semantic pass
 * just means Layer 1's findings stand alone.
 */
export async function refineTaskWording(taskText: string): Promise<RefinementResult> {
  const findings = lintTaskWording(taskText);

  const anthropic = getAnthropicClient();
  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: GRADING_MODEL,
        max_tokens: 300,
        system: SEMANTIC_CRITIC_PROMPT,
        tools: [SEMANTIC_REFINEMENT_TOOL],
        tool_choice: { type: "tool", name: "submit_semantic_findings" },
        messages: [{ role: "user", content: taskText }],
      });
      recordUsage("refine", GRADING_MODEL, response.usage);
      const toolUse = response.content.find(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      const validated = SemanticSubmitSchema.safeParse(toolUse?.input);
      if (validated.success) {
        for (const f of validated.data.findings) {
          findings.push({
            type: f.type,
            severity: f.type === "opinion" ? "critical" : "warning",
            detail: f.detail,
          });
        }
      }
    } catch (error) {
      console.error("[refine] semantic layer failed (non-fatal):", error);
    }
  }

  return { clean: findings.length === 0, findings };
}
