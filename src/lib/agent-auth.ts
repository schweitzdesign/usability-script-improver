import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { requirePortfolioOpen } from "@/lib/portfolio";

function digest(s: string) {
  return createHash("sha256").update(s).digest();
}

/** Returns an error response if the request isn't from an agent, or null if it is. */
export function requireAgent(request: Request) {
  const closed = requirePortfolioOpen();
  if (closed) return closed;
  const expected = process.env.AGENT_API_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Agent API isn't configured." }, { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  // Hash both sides so the comparison is constant-time regardless of length.
  if (!token || !timingSafeEqual(digest(token), digest(expected))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}

export type ReplyMode = "draft" | "send";

/** Replies stay drafts unless AGENT_REPLY_MODE is explicitly "send". */
export function getReplyMode(): ReplyMode {
  return process.env.AGENT_REPLY_MODE === "send" ? "send" : "draft";
}
