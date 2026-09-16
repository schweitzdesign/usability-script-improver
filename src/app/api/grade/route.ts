import { NextResponse } from "next/server";
import { z } from "zod";
import {
  GradingFailedError,
  GradingUnavailableError,
  LOW_INFO_OPENING_MESSAGE,
  isLowInfo,
  runGrading,
} from "@/lib/grading";
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

  if (isLowInfo(scriptText)) {
    // Nothing to grade yet — this is an onboarding moment, not a fake grade.
    return NextResponse.json({
      ok: true,
      graded: false,
      openingMessage: LOW_INFO_OPENING_MESSAGE,
    });
  }

  let result;
  try {
    result = await runGrading(scriptText);
  } catch (error) {
    if (error instanceof GradingUnavailableError) {
      return NextResponse.json({ error: "Grading isn't configured yet." }, { status: 502 });
    }
    if (error instanceof GradingFailedError) {
      return NextResponse.json(
        { error: "Couldn't grade that script. Try again." },
        { status: 502 }
      );
    }
    console.error("[grade] Anthropic call failed:", error);
    return NextResponse.json(
      { error: "Couldn't grade that script. Try again." },
      { status: 502 }
    );
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

  return NextResponse.json({ ok: true, graded: true, result });
}
