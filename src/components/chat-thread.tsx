"use client";

import { useState, type KeyboardEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/lib/chat";

function PokeAvatar() {
  return (
    <span
      aria-hidden="true"
      className="bg-forest border-ink mt-0.5 inline-block h-8 w-8 shrink-0 rounded-full border-2"
    />
  );
}

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
    <div className="flex flex-1 flex-col gap-4">
      <div role="log" aria-live="polite" className="flex-1 space-y-4 overflow-y-auto">
        {messages.map((m, i) =>
          m.role === "assistant" ? (
            <div key={i} className="flex items-start gap-2.5">
              <PokeAvatar />
              <p className="border-ink bg-bone text-foreground max-w-[85%] rounded-2xl rounded-tl-sm border-[3px] px-4 py-3 text-base leading-relaxed font-medium">
                {m.content}
              </p>
            </div>
          ) : (
            <div key={i} className="flex justify-end">
              <p className="border-ink bg-forest text-bone max-w-[85%] rounded-2xl rounded-tr-sm border-[3px] px-4 py-3 text-base leading-relaxed font-medium">
                {m.content}
              </p>
            </div>
          )
        )}
        {isSending && (
          <div className="flex items-center gap-2.5 pl-1">
            <PokeAvatar />
            <Loader2 className="text-forest h-5 w-5 animate-spin" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex gap-2.5">
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
          className="border-ink bg-bone focus-visible:ring-ring flex-1 resize-none rounded-2xl border-[3px] px-4 py-3 text-base outline-none focus-visible:ring-2"
        />
        <Button
          onClick={submit}
          disabled={!draft.trim() || isSending}
          className="border-ink hover:rotate-0 rotate-[1.5deg] rounded-2xl border-[3px] px-6 font-bold shadow-[4px_4px_0_var(--ink)] transition-transform disabled:rotate-0 disabled:shadow-none"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
