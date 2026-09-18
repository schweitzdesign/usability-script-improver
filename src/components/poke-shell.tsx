"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Wordmark } from "@/components/wordmark";
import { MegaInput } from "@/components/mega-input";
import { OutputPanel } from "@/components/output-panel";
import { BrandCluster } from "@/components/brand-cluster";
import { MarketingSections } from "@/components/marketing-sections";
import { DevPreviewPanel } from "@/components/dev-preview-panel";
import { DURATION_BASE, EASE_OUT, STAGGER_CONTAINER, FADE_UP, POP_IN } from "@/lib/motion";
import type { PokeController } from "@/hooks/use-poke-controller";

/**
 * All the visual chrome for the POKE app — shared between the real page
 * (/, live API calls) and the demo page (/demo, canned data only) so the
 * two can never visually drift apart. Behavior differences live entirely
 * in the controller (see use-poke-controller.ts), not here.
 */
export function PokeShell({
  controller,
  showPreviewPanel,
  demoBadge,
}: {
  controller: PokeController;
  showPreviewPanel: boolean;
  demoBadge?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const {
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
    handleSubmit,
    handleRetryGrade,
    handleSendMessage,
    handleReset,
    applyPreview,
  } = controller;

  return (
    <div className="flex flex-1 flex-col">
      <a
        href="#mega-input"
        className="bg-background text-foreground focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:ring-2 focus:outline-none"
      >
        Skip to input
      </a>

      <header className="border-border border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          {/* Real <a>, not next/link: a hard reload is the reset mechanism for now
              (this page holds all its state client-side; a same-route Link wouldn't remount it). */}
          <a href={demoBadge ? "/demo" : "/"} className="focus-visible:ring-ring rounded-md outline-none focus-visible:ring-2">
            <Wordmark size="sm" />
          </a>
          {demoBadge && (
            <span className="rounded-full border border-neutral-300 bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">
              Demo — canned data, no API calls
            </span>
          )}
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

      {showPreviewPanel && <DevPreviewPanel onApply={applyPreview} onClear={handleReset} />}
    </div>
  );
}
