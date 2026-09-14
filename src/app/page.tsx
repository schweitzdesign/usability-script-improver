"use client";

import { useState } from "react";
import { Wordmark } from "@/components/wordmark";
import { MegaInput } from "@/components/mega-input";
import { OutputPanel, type PanelStatus } from "@/components/output-panel";
import { cn } from "@/lib/utils";

export default function Home() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [status, setStatus] = useState<PanelStatus>("submitting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setText("");
      setFile(null);
    } catch {
      setStatus("error");
      setErrorMessage("Couldn't reach the server. Check your connection and try again.");
    }
  }

  function handleReset() {
    setPanelOpen(false);
    setStatus("submitting");
    setErrorMessage(null);
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
        <div className="mx-auto w-full max-w-6xl px-6 py-5">
          <Wordmark size="sm" />
        </div>
      </header>

      <main className="mx-auto flex w-full flex-1 flex-col px-6 py-10 sm:py-14">
        <div
          className={cn(
            "mx-auto flex w-full flex-1 flex-col gap-8",
            panelOpen ? "max-w-6xl" : "max-w-3xl"
          )}
        >
          {!panelOpen && (
            <div className="space-y-3 text-center sm:text-left">
              <p className="text-forest font-display text-sm font-semibold tracking-wide uppercase">
                Poke at reality.
              </p>
              <h1 className="font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
                Your test could be better. Let&rsquo;s poke at it.
              </h1>
              <p className="text-muted-foreground mx-auto max-w-xl text-lg text-balance sm:mx-0">
                Ask better questions than &ldquo;would you use this?&rdquo;
              </p>
            </div>
          )}

          <div
            id="mega-input"
            className={cn("grid flex-1 gap-6", panelOpen && "lg:grid-cols-2")}
          >
            <MegaInput
              text={text}
              onTextChange={setText}
              file={file}
              onFileChange={setFile}
              onSubmit={handleSubmit}
              submitting={panelOpen && status === "submitting"}
            />
            {panelOpen && (
              <OutputPanel status={status} errorMessage={errorMessage} onReset={handleReset} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
