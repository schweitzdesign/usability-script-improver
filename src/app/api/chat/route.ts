import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { ChatRequestSchema, buildChatSystemPrompt, CHAT_MAX_TOKENS, CHAT_TOOL_MAX_TOKENS } from "@/lib/chat";
import { GradingFailedError, GradingUnavailableError, runGrading, truncateScript } from "@/lib/grading";
import { getAnthropicClient, GRADING_MODEL } from "@/lib/anthropic";
import { recordUsage } from "@/lib/usage";
import { DRAFT_TASKS_TOOL, DraftTasksResultSchema, type DraftTasksResult } from "@/lib/tools/draft-tasks";
import { REFINE_TASK_TOOL, refineTaskWording, type RefinementResult } from "@/lib/tools/refine-task";
import { ASK_CHOICE_TOOL, AskChoiceResultSchema, type AskChoiceResult } from "@/lib/tools/ask-choice";
import type { GradeResult } from "@/lib/grading";
import { requirePortfolioOpen } from "@/lib/portfolio";

export const runtime = "nodejs";

// Bounded so an agentic exchange can never run away: generous enough for a
// draft_tasks call plus a refine_task_wording call per task, capped against
// a pathological loop.
const MAX_TOOL_ITERATIONS = 4;

export async function POST(request: Request) {
  const closed = requirePortfolioOpen();
  if (closed) return closed;

  const parsed = ChatRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Malformed chat request." }, { status: 400 });
  }
  const { scriptText, grade, messages } = parsed.data;

  const anthropic = getAnthropicClient();
  if (!anthropic) {
    return NextResponse.json({ error: "Chat isn't configured yet." }, { status: 502 });
  }

  const system = buildChatSystemPrompt({ scriptText: truncateScript(scriptText), grade });
  // The tool loop below is scoped to a single request — draft_tasks/
  // refine_task_wording tool_use/tool_result exchanges never leave this
  // function. Without folding their outcome back into the reconstructed
  // history, the model has no memory of what it drafted or refined past the
  // turn it happened on. Appended as a clearly-delimited reference block on
  // the ephemeral Anthropic-bound copy only — never mutates what's shown to
  // the user or re-saved client side.
  const conversation: Anthropic.MessageParam[] = messages.map((m) => {
    let content = m.content;
    if (m.draftedTasks) {
      const lines = m.draftedTasks.tasks.map((t, i) => `${i + 1}. ${t.task}`).join("\n");
      content += `\n\n[Reference, tasks drafted this turn:\n${lines}]`;
    }
    if (m.refinements?.length) {
      const lines = m.refinements
        .map((r) => `"${r.taskText}": ${r.result.clean ? "clean" : r.result.findings.map((f) => f.detail).join("; ")}`)
        .join("\n");
      content += `\n\n[Reference, refinement findings this turn:\n${lines}]`;
    }
    if (m.askChoice) {
      content += `\n\n[Reference, you asked this turn: "${m.askChoice.question}" options: ${m.askChoice.options.join(", ")}]`;
    }
    return { role: m.role, content };
  });

  let reply = "";
  let draftedTasks: DraftTasksResult | null = null;
  const refinements: { taskText: string; result: RefinementResult }[] = [];
  let askChoice: AskChoiceResult | null = null;
  let sawFinalReply = false;

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await anthropic.messages.create({
        model: GRADING_MODEL,
        max_tokens: CHAT_TOOL_MAX_TOKENS,
        system,
        tools: [DRAFT_TASKS_TOOL, REFINE_TASK_TOOL, ASK_CHOICE_TOOL],
        tool_choice: { type: "auto" },
        messages: conversation,
      });
      recordUsage("chat", GRADING_MODEL, response.usage);

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
        const textBlock = response.content.find(
          (b): b is Anthropic.TextBlock => b.type === "text"
        );
        reply = textBlock?.text ?? "";
        sawFinalReply = true;
        break;
      }

      // ask_choice IS the turn's output, not an intermediate step: the
      // question is only answerable by the designer tapping an option, so
      // there's nothing useful a follow-up model call could add. Stop here
      // rather than looping again, taking any short setup line the model
      // wrote alongside the tool call as the reply.
      const askChoiceUse = toolUses.find((t) => t.name === "ask_choice");
      if (askChoiceUse) {
        const validated = AskChoiceResultSchema.safeParse(askChoiceUse.input);
        if (validated.success) {
          askChoice = validated.data;
        } else {
          console.error("[chat] invalid ask_choice input:", askChoiceUse.input);
        }
        const textBlock = response.content.find(
          (b): b is Anthropic.TextBlock => b.type === "text"
        );
        reply = textBlock?.text ?? "";
        sawFinalReply = true;
        break;
      }

      conversation.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        if (toolUse.name === "draft_tasks") {
          const validated = DraftTasksResultSchema.safeParse(toolUse.input);
          if (validated.success) {
            draftedTasks = validated.data;
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: "Draft accepted.",
            });
          } else {
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: "Invalid draft shape. Match the schema exactly and try again.",
              is_error: true,
            });
          }
        } else if (toolUse.name === "refine_task_wording") {
          const input = toolUse.input as { taskText?: string };
          const taskText = typeof input.taskText === "string" ? input.taskText : "";
          const result = await refineTaskWording(taskText);
          refinements.push({ taskText, result });
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });
        } else {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: "Unknown tool.",
            is_error: true,
          });
        }
      }

      conversation.push({ role: "user", content: toolResults });
    }

    // Loop exhausted without a text reply (pathological case) — force one
    // final tool-free call so the user isn't left hanging.
    if (!sawFinalReply) {
      const finalResponse = await anthropic.messages.create({
        model: GRADING_MODEL,
        max_tokens: CHAT_MAX_TOKENS,
        system,
        messages: conversation,
      });
      recordUsage("chat", GRADING_MODEL, finalResponse.usage);
      const textBlock = finalResponse.content.find(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );
      reply = textBlock?.text ?? "Let's pick this up from here. What would you like to do next?";
    }
  } catch (error) {
    console.error("[chat] Anthropic call failed:", error);
    return NextResponse.json({ error: "Couldn't send that. Try again." }, { status: 502 });
  }

  // Not graded yet — if this turn produced a real drafted task list, that's
  // the actual gradable artifact now (not raw chat prose). Grading
  // accumulated conversation text used to be the only signal available;
  // now that draft_tasks exists, grading anything before it fires would
  // just be evaluating small talk, which undermines the whole point of the
  // intake Skill (don't judge before there's something real to judge).
  if (!grade && draftedTasks) {
    const taskLines = draftedTasks.tasks.map((t, i) => `${i + 1}. ${t.task}`).join("\n");
    const draftScriptText = `Learning objective: ${draftedTasks.learningObjective}\nDesign state: ${draftedTasks.designState}\nMethodology: ${draftedTasks.methodology}\n\nTasks:\n${taskLines}`;
    try {
      const result: GradeResult = await runGrading(draftScriptText);
      return NextResponse.json({
        ok: true,
        reply,
        draftedTasks,
        refinements,
        askChoice,
        graded: true,
        result,
      });
    } catch (error) {
      // Auto-grade is a bonus on top of a reply that already succeeded —
      // never fail the chat turn because the follow-up grade attempt failed.
      if (!(error instanceof GradingUnavailableError || error instanceof GradingFailedError)) {
        console.error("[chat] auto-grade attempt failed:", error);
      }
    }
  }

  return NextResponse.json({ ok: true, reply, draftedTasks, refinements, askChoice });
}
