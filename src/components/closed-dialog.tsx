"use client";

import { useRef } from "react";
import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { BrandCluster } from "@/components/brand-cluster";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shown when someone tries to use the real app after the alpha has closed. The parent opens it
 * only from a deliberate action (a click, a keystroke, a paste, a drop, the Poke it button),
 * never on focus or on load. Same dialog parts and brand styling as the Feedback window, so it
 * gets a focus trap, Escape, an inert background, and focus returning to where the person was.
 */
export function ClosedDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const demoLinkRef = useRef<HTMLAnchorElement>(null);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:data-[ending-style]:opacity-0 motion-safe:data-[starting-style]:opacity-0" />
        <Dialog.Popup
          initialFocus={demoLinkRef}
          className="border-ink bg-bone text-foreground fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border-2 p-6 shadow-[6px_6px_0_var(--ink)] outline-none motion-safe:transition-[opacity,scale] motion-safe:duration-300 motion-safe:ease-[var(--ease-brand)] motion-safe:data-[ending-style]:scale-95 motion-safe:data-[ending-style]:opacity-0 motion-safe:data-[starting-style]:scale-90 motion-safe:data-[starting-style]:opacity-0 sm:p-8"
        >
          <Dialog.Close
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-2 right-2 inline-flex size-11 items-center justify-center rounded-md outline-none focus-visible:ring-2"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Dialog.Close>

          <div className="flex flex-col gap-5">
            <BrandCluster className="w-24" />

            <div className="flex flex-col gap-3 pr-6">
              <Dialog.Title className="font-display text-3xl leading-tight font-semibold tracking-tight">
                The POKE alpha has closed.
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-base leading-relaxed">
                Thanks to everyone who took part. POKE was built as a proof of concept, and the alpha period is
                over, so grading and chat are switched off. You can still see how it works in the demo, or read
                how it was built in the case study.
              </Dialog.Description>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                ref={demoLinkRef}
                href="/demo"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "border-ink min-h-11 justify-center rounded-full border-2 font-display text-lg font-semibold shadow-[4px_4px_0_var(--ink)]"
                )}
              >
                Try the demo
              </Link>
              <Link
                href="/about"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "border-ink min-h-11 justify-center rounded-full border-2 font-display text-lg font-semibold"
                )}
              >
                Read the case study
              </Link>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
