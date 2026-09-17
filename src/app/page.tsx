"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Wordmark } from "@/components/wordmark";
import { MegaInput } from "@/components/mega-input";
import { OutputPanel, type PanelStatus } from "@/components/output-panel";
import { BrandCluster } from "@/components/brand-cluster";
import { MarketingSections } from "@/components/marketing-sections";
import { DURATION_BASE, EASE_OUT, STAGGER_CONTAINER, FADE_UP, POP_IN } from "@/lib/motion";
import { DevPreviewPanel, type PreviewKind } from "@/components/dev-preview-panel";
import {
  PREVIEW_SCRIPT_TEXT,
  GRADE_FIXTURES,
  LOW_INFO_FIRST_MESSAGES,
  LOW_INFO_LONG_MESSAGES,
} from "@/lib/preview-fixtures";
import type { GradeResult } from "@/lib/grading";
import type { ChatMessage } from "@/lib/chat";

export default function Home() {
  const reduceMotion = useReducedMotion();
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

  async function handleSubmit() {
    if (!text.trim() && !file) return;

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
      await runGrade(data.scriptText, data.id ?? null);
    } catch {
      setStatus("submission-error");
      setErrorMessage("Couldn't reach the server. Check your connection and try again.");
    }
  }

  async function runGrade(scriptText: string, submissionId: string | null) {
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

  function handleRetryGrade() {
    if (gradedScript) runGrade(gradedScript.text, gradedScript.id);
  }

  async function handleSendMessage(userText: string) {
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

  function handleReset() {
    setPanelOpen(false);
    setStatus("submitting");
    setErrorMessage(null);
    setGradedScript(null);
    setGradeResult(null);
    setOnboarding(false);
    setMessages([]);
  }

  // Dev-only: jumps straight to a canned state, no /api/grade or /api/chat
  // call. See src/lib/preview-fixtures.ts and dev-preview-panel.tsx.
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

  return (
    <div className="flex flex-1 flex-col">
      <a
        href="#mega-input"
        className="bg-background text-foreground focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:ring-2 focus:outline-none"
      >
        Skip to input
      </a>

      <header className="border-border border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center px-6 py-5">
          {/* Real <a>, not next/link: a hard reload is the reset mechanism for now
              (this page holds all its state client-side; a same-route Link wouldn't remount it). */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="focus-visible:ring-ring rounded-md outline-none focus-visible:ring-2">
            <Wordmark size="sm" />
          </a>
        </div>
      </header>

      <main className="mx-auto w-full flex-1 py-10 sm:py-14">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6">
          {!panelOpen && (
            <motion.div
              className="grid items-center gap-6 sm:grid-cols-[1fr_auto] sm:text-left"
              initial={reduceMotion ? "visible" : "hidden"}
              animate="visible"
              variants={STAGGER_CONTAINER}
            >
              <div className="space-y-3 text-center sm:text-left">
                <motion.p variants={FADE_UP} className="text-forest font-display text-sm font-semibold">
                  Poke at reality.
                </motion.p>
                <motion.h1
                  variants={FADE_UP}
                  className="font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl"
                >
                  Poke your users. Learn what&rsquo;s real.
                </motion.h1>
              </div>
              <motion.div variants={POP_IN}>
                <BrandCluster className="hidden w-32 shrink-0 sm:block" />
              </motion.div>
            </motion.div>
          )}

          <div
            id="mega-input"
            tabIndex={-1}
            className="focus-visible:ring-ring flex flex-1 flex-col rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
          >
            <AnimatePresence mode="wait" initial={false}>
              {panelOpen ? (
                <motion.div
                  key="panel"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: DURATION_BASE, ease: EASE_OUT }}
                  className="flex flex-1 flex-col"
                >
                  <OutputPanel
                    status={status}
                    errorMessage={errorMessage}
                    grade={gradeResult}
                    onboarding={onboarding}
                    messages={messages}
                    chatSending={chatSending}
                    onReset={handleReset}
                    onRetryGrade={handleRetryGrade}
                    onSendMessage={handleSendMessage}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: DURATION_BASE, ease: EASE_OUT }}
                  className="flex flex-1 flex-col"
                >
                  <MegaInput
                    text={text}
                    onTextChange={setText}
                    file={file}
                    onFileChange={setFile}
                    onSubmit={handleSubmit}
                    submitting={false}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <MarketingSections />
      </main>

      <footer className="border-border border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 px-6 py-10 text-center">
          <Wordmark size="sm" />
          <p className="text-muted-foreground text-sm">Poke at reality.</p>
        </div>
      </footer>

      <DevPreviewPanel onApply={applyPreview} onClear={handleReset} />
    </div>
  );
}
