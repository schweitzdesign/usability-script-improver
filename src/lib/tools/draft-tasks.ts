import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { boundedString } from "@/lib/grading";

/**
 * Agentic tool: offered via `tools`, never forced. Claude calls this once
 * the onboarding Skill has gathered a learning objective, design state,
 * methodology, and something concrete to build tasks around — not before.
 */
export const DRAFT_TASKS_TOOL: Anthropic.Tool = {
  name: "draft_tasks",
  description:
    "Drafts a structured set of candidate usability-test tasks once the learning objective, design state, testing methodology, and what the designer wants to learn are all known. Produces a clean, renderable draft for the designer to review. Not a substitute for asking the intake questions first.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      learningObjective: {
        type: "string",
        description: "The single learning objective this test is built around.",
      },
      designState: {
        type: "string",
        description: "The fidelity of what's being tested: wireframe, clickable prototype, or live product.",
      },
      methodology: {
        type: "string",
        enum: ["moderated", "unmoderated"],
      },
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            task: {
              type: "string",
              description: "The task wording itself. Precise and neutral tone, 1-2 sentences.",
            },
            whyThisTask: {
              type: "string",
              description: "One sentence: what this task is meant to reveal, tied back to the learning objective.",
            },
          },
          required: ["task", "whyThisTask"],
          additionalProperties: false,
        },
      },
    },
    required: ["learningObjective", "designState", "methodology", "tasks"],
    additionalProperties: false,
  },
};

export const DraftedTaskSchema = z.object({
  task: boundedString(220),
  whyThisTask: boundedString(200),
});

export const DraftTasksResultSchema = z.object({
  learningObjective: boundedString(200),
  designState: boundedString(80),
  methodology: z.enum(["moderated", "unmoderated"]),
  tasks: z.array(DraftedTaskSchema).min(1).max(6),
});
export type DraftTasksResult = z.infer<typeof DraftTasksResultSchema>;
