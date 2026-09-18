"use client";

import { usePokeController } from "@/hooks/use-poke-controller";
import { PokeShell } from "@/components/poke-shell";

// Public visual/layout sandbox: identical UI to the real app, but every
// state transition is simulated locally (see use-poke-controller.ts's
// "demo" mode) — no /api/submissions, /api/grade, or /api/chat calls, so
// this is safe to leave reachable in production without spending on the
// Anthropic API. Intentionally not linked from the real site; kept out of
// search results via the metadata below.
export default function DemoPage() {
  const controller = usePokeController("demo");

  return <PokeShell controller={controller} showPreviewPanel demoBadge />;
}
