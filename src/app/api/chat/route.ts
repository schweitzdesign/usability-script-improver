import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { ChatRequestSchema, buildChatSystemPrompt, CHAT_MAX_TOKENS } from "@/lib/chat";
import { isLowInfo, truncateScript } from "@/lib/grading";
import { getAnthropicClient, GRADING_MODEL } from "@/lib/anthropic";

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

  try {
    const response = await anthropic.messages.create({
      model: GRADING_MODEL,
      max_tokens: CHAT_MAX_TOKENS,
      system: buildChatSystemPrompt({
        scriptText: truncateScript(scriptText),
        grade,
        lowInfo: isLowInfo(scriptText),
      }),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    return NextResponse.json({ ok: true, reply: textBlock?.text ?? "" });
  } catch (error) {
    console.error("[chat] Anthropic call failed:", error);
    return NextResponse.json({ error: "Couldn't send that. Try again." }, { status: 502 });
  }
}
