import { NextResponse } from "next/server";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import {
  GRADE_TOOL,
  GradeResultSchema,
  GRADING_SYSTEM_PROMPT,
  isLowInfo,
  lowInfoResult,
  truncateScript,
} from "@/lib/grading";
import { getAnthropicClient, GRADING_MODEL } from "@/lib/anthropic";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const bodySchema = z.object({
  scriptText: z.string().trim().min(1).max(50_000),
  submissionId: z.string().uuid().nullable().optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing script text." }, { status: 400 });
  }
  const { scriptText, submissionId } = parsed.data;

  let result;
  if (isLowInfo(scriptText)) {
    result = lowInfoResult(); // zero-token path
  } else {
    const anthropic = getAnthropicClient();
    if (!anthropic) {
      return NextResponse.json({ error: "Grading isn't configured yet." }, { status: 502 });
    }
    try {
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
        console.error("[grade] model returned invalid shape:", validated.error);
        return NextResponse.json(
          { error: "Couldn't grade that script. Try again." },
          { status: 502 }
        );
      }
      result = validated.data;
    } catch (error) {
      console.error("[grade] Anthropic call failed:", error);
      return NextResponse.json(
        { error: "Couldn't grade that script. Try again." },
        { status: 502 }
      );
    }
  }

  // Best-effort persistence — mirrors the Slack-failure-doesn't-fail-the-request pattern.
  const supabase = getSupabaseServerClient();
  if (supabase && submissionId) {
    const { error } = await supabase
      .from("submissions")
      .update({
        grade: result.grade,
        grade_summary: result.summary,
        grade_strengths: result.strengths,
        grade_weaknesses: result.weaknesses,
        grade_critical_changes: result.criticalChanges,
        graded_at: new Date().toISOString(),
      })
      .eq("id", submissionId);
    if (error) console.error("[grade] Supabase update failed (non-fatal):", error);
  }

  return NextResponse.json({ ok: true, result });
}
