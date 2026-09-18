import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "POKE demo",
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
