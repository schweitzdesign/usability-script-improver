"use client";

import { useState, type KeyboardEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/lib/chat";

export function ChatThread({
  messages,
  onSend,
  isSending,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isSending: boolean;
}) {
  const [draft, setDraft] = useState("");

  function submit() {
    if (!draft.trim() || isSending) return;
    onSend(draft.trim());
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "assistant" ? "text-left" : "text-right"}>
            <p
              className={`inline-block max-w-[85%] rounded-2xl px-4 py-2 text-left text-sm ${
                m.role === "assistant" ? "bg-muted text-foreground" : "bg-forest text-bone"
              }`}
            >
              {m.content}
            </p>
          </div>
        ))}
        {isSending && (
          <Loader2 className="text-forest h-4 w-4 animate-spin" aria-hidden="true" />
        )}
      </div>

      <div className="flex gap-2">
        <label className="sr-only" htmlFor="chat-input">
          Reply to POKE
        </label>
        <textarea
          id="chat-input"
          value={draft}
          rows={2}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Reply…"
          className="border-border bg-background focus-visible:ring-ring flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
        <Button onClick={submit} disabled={!draft.trim() || isSending}>
          Send
        </Button>
      </div>
    </div>
  );
}
