"use client";

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PanelStatus = "submitting" | "success" | "error";

export function OutputPanel({
  status,
  errorMessage,
  onReset,
}: {
  status: PanelStatus;
  errorMessage?: string | null;
  onReset: () => void;
}) {
  return (
    <div
      role="status"
      className="border-border bg-card animate-in fade-in slide-in-from-right-4 flex min-h-[22rem] flex-1 flex-col items-center justify-center rounded-3xl border-2 p-8 text-center duration-300"
    >
      {status === "submitting" && (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-forest h-8 w-8 animate-spin" aria-hidden="true" />
          <p className="text-lg font-medium">Poking around…</p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-3">
          <CheckCircle2 className="text-forest h-10 w-10" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Got it.</h2>
            <p className="text-muted-foreground max-w-xs text-sm">
              Your script is with our team. We&rsquo;ll follow up if we have questions.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onReset}>
            Poke another one
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="text-destructive h-10 w-10" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">That didn&rsquo;t land.</h2>
            <p className="text-muted-foreground max-w-xs text-sm">
              {errorMessage ?? "Something went wrong. Please try again."}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onReset}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
