"use client";

import { usePokeController } from "@/hooks/use-poke-controller";
import { PokeShell } from "@/components/poke-shell";

export function LiveApp({ closed }: { closed: boolean }) {
  const controller = usePokeController("live");

  return (
    <PokeShell
      controller={controller}
      showPreviewPanel={process.env.NODE_ENV !== "production"}
      closed={closed}
    />
  );
}
