import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { ChatRequestSchema, buildChatSystemPrompt, CHAT_MAX_TOKENS } from "@/lib/chat";
import { GradingFailedError, GradingUnavailableError, isLowInfo, runGrading, truncateScript } from "@/lib/grading";
import { getAnthropicClient, GRADING_MODEL } from "@/lib/anthropic";
import type { GradeResult } from "@/lib/grading";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = ChatRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Malformed chat request." }, { status: 400 });
  }
  const { scriptText, grade, messages } = parsed.data;

  const anthropic = getAnthropicClient();
  if (!anthropic) {
    return NextResponse.json({ error: "Chat isn't configured yet." }, { status: 502 });
  }

  let reply: string;
  try {
    const response = await anthropic.messages.create({
      model: GRADING_MODEL,
      max_tokens: CHAT_MAX_TOKENS,
      system: buildChatSystemPrompt({ scriptText: truncateScript(scriptText), grade }),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    reply = textBlock?.text ?? "";
  } catch (error) {
    console.error("[chat] Anthropic call failed:", error);
    return NextResponse.json({ error: "Couldn't send that. Try again." }, { status: 502 });
  }

  // Not graded yet — see if this conversation has now said enough to grade for real.
  if (!grade) {
    const userReplies = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n\n");

    // Check the heuristic against the chat replies alone — the original
    // scriptText may itself be junk (e.g. literal "lorem ipsum"), and that
    // would otherwise poison a combined check forever, even once the user
    // has clearly said enough in chat.
    if (!isLowInfo(userReplies)) {
      const combinedText = `${scriptText}\n\n${userReplies}`;
      try {
        const result: GradeResult = await runGrading(combinedText);
        return NextResponse.json({ ok: true, reply, graded: true, result });
      } catch (error) {
        // Auto-grade is a bonus on top of a reply that already succeeded —
        // never fail the chat turn because the follow-up grade attempt failed.
        if (!(error instanceof GradingUnavailableError || error instanceof GradingFailedError)) {
          console.error("[chat] auto-grade attempt failed:", error);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, reply });
}
