"use client";

import { useState } from "react";
import { isLowInfo, type GradeResult } from "@/lib/grading";
import type { ChatMessage } from "@/lib/chat";
import type { PanelStatus } from "@/components/output-panel";
import type { PreviewKind } from "@/components/dev-preview-panel";
import {
  PREVIEW_SCRIPT_TEXT,
  GRADE_FIXTURES,
  LOW_INFO_FIRST_MESSAGES,
  LOW_INFO_LONG_MESSAGES,
} from "@/lib/preview-fixtures";

const DEMO_GRADE_ORDER: (keyof typeof GRADE_FIXTURES)[] = ["A", "B", "C", "D", "F"];

const DEMO_REPLIES = [
  "That's a fair point. What would you actually do differently based on that answer?",
  "Worth digging into. Is that something you'd observe directly, or are you relying on what they say?",
  "Good instinct. How would you know if that assumption is wrong?",
  "That changes the task design a bit. Want to sketch out what that looks like?",
];

export type PokeMode = "live" | "demo";

/**
 * Owns all state and orchestration for the POKE input/grade/chat flow.
 * "live" mode calls the real API routes. "demo" mode simulates the same
 * state transitions with canned data and zero network calls, so the exact
 * same UI (via PokeShell) can run in production at /demo without spending
 * on the Anthropic API.
 */
export function usePokeController(mode: PokeMode) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [status, setStatus] = useState<PanelStatus>("submitting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [gradedScript, setGradedScript] = useState<{ text: string; id: string | null } | null>(
    null
  );
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSending, setChatSending] = useState(false);

  async function handleSubmitLive() {
    setPanelOpen(true);
    setStatus("submitting");
    setErrorMessage(null);

    const formData = new FormData();
    formData.set("mode", file ? "upload" : "paste");
    formData.set("name", "");
    formData.set("email", "");
    formData.set("title", "");
    if (file) {
      formData.set("file", file);
    } else {
      formData.set("scriptText", text);
    }

    try {
      const res = await fetch("/api/submissions", { method: "POST", body: formData });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        id?: string | null;
        scriptText?: string;
      };

      if (!res.ok || !data.scriptText) {
        setStatus("submission-error");
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setText("");
      setFile(null);
      setGradedScript({ text: data.scriptText, id: data.id ?? null });
      await runGradeLive(data.scriptText, data.id ?? null);
    } catch {
      setStatus("submission-error");
      setErrorMessage("Couldn't reach the server. Check your connection and try again.");
    }
  }

  async function runGradeLive(scriptText: string, submissionId: string | null) {
    setStatus("grading");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptText, submissionId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        graded?: boolean;
        result?: GradeResult;
        openingMessage?: string;
      };

      if (!res.ok || data.graded === undefined) {
        setStatus("grade-error");
        setErrorMessage(data.error ?? "Grading failed.");
        return;
      }

      if (data.graded && data.result) {
        setGradeResult(data.result);
        setOnboarding(false);
        setMessages([{ role: "assistant", content: data.result.openingMessage }]);
      } else {
        setGradeResult(null);
        setOnboarding(true);
        setMessages([{ role: "assistant", content: data.openingMessage ?? "" }]);
      }
      setStatus("chatting");
    } catch {
      setStatus("grade-error");
      setErrorMessage("Couldn't reach the server. Check your connection and try again.");
    }
  }

  async function handleSendMessageLive(userText: string) {
    if (!gradedScript) return;

    const nextMessages = [...messages, { role: "user" as const, content: userText }];
    setMessages(nextMessages);
    setChatSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptText: gradedScript.text,
          grade: gradeResult,
          // The opening line is UI-seeded, never a real prior turn — drop it
          // so the first request to the model starts with a user message.
          messages: nextMessages.slice(1),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        graded?: boolean;
        result?: GradeResult;
      };

      if (res.ok && data.reply) {
        setMessages((m) => [...m, { role: "assistant", content: data.reply as string }]);
        // Onboarding chat can surface enough detail to auto-grade mid-conversation.
        if (data.graded && data.result) {
          setGradeResult(data.result);
          setOnboarding(false);
        }
      } else {
        setMessages((m) => [...m, { role: "assistant", content: "That didn't land. Try again?" }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "That didn't land. Try again?" }]);
    } finally {
      setChatSending(false);
    }
  }

  // Demo mode: same state transitions, zero network calls. isLowInfo() is
  // the same pure/zero-token heuristic the real grading route uses, so the
  // branch a given input takes here matches what would really happen.
  function handleSubmitDemo() {
    setPanelOpen(true);
    setStatus("submitting");
    setErrorMessage(null);
    const scriptText = text.trim() || (file ? file.name : "");

    setTimeout(() => {
      setStatus("grading");
      setTimeout(() => {
        setText("");
        setFile(null);
        setGradedScript({ text: scriptText, id: null });

        if (isLowInfo(scriptText)) {
          setGradeResult(null);
          setOnboarding(true);
          setMessages(LOW_INFO_FIRST_MESSAGES);
        } else {
          const key = DEMO_GRADE_ORDER[scriptText.length % DEMO_GRADE_ORDER.length];
          const result = GRADE_FIXTURES[key];
          setGradeResult(result);
          setOnboarding(false);
          setMessages([{ role: "assistant", content: result.openingMessage }]);
        }
        setStatus("chatting");
      }, 700);
    }, 400);
  }

  function handleSendMessageDemo(userText: string) {
    const nextMessages = [...messages, { role: "user" as const, content: userText }];
    setMessages(nextMessages);
    setChatSending(true);

    const reply = DEMO_REPLIES[nextMessages.length % DEMO_REPLIES.length];
    setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      setChatSending(false);
    }, 500);
  }

  function handleRetryGrade() {
    if (mode === "demo") {
      handleSubmitDemo();
      return;
    }
    if (gradedScript) runGradeLive(gradedScript.text, gradedScript.id);
  }

  function handleReset() {
    setPanelOpen(false);
    setStatus("submitting");
    setErrorMessage(null);
    setGradedScript(null);
    setGradeResult(null);
    setOnboarding(false);
    setMessages([]);
  }

  // Jumps straight to a canned state — used by the preview panel in both
  // modes, never calls /api/grade or /api/chat.
  function applyPreview(kind: PreviewKind) {
    setPanelOpen(true);
    setStatus("chatting");
    setErrorMessage(null);
    setGradedScript({ text: PREVIEW_SCRIPT_TEXT, id: null });

    if (kind === "low-info-first" || kind === "low-info-long") {
      setGradeResult(null);
      setOnboarding(true);
      setMessages(kind === "low-info-first" ? LOW_INFO_FIRST_MESSAGES : LOW_INFO_LONG_MESSAGES);
      return;
    }

    const result = GRADE_FIXTURES[kind];
    setGradeResult(result);
    setOnboarding(false);
    setMessages([{ role: "assistant", content: result.openingMessage }]);
  }

  return {
    text,
    setText,
    file,
    setFile,
    panelOpen,
    status,
    errorMessage,
    gradeResult,
    onboarding,
    messages,
    chatSending,
    handleSubmit: mode === "demo" ? handleSubmitDemo : handleSubmitLive,
    handleSendMessage: mode === "demo" ? handleSendMessageDemo : handleSendMessageLive,
    handleRetryGrade,
    handleReset,
    applyPreview,
  };
}

export type PokeController = ReturnType<typeof usePokeController>;
