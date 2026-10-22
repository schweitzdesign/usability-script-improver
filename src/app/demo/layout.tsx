import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "POKE demo",
  description:
    "Try POKE with canned data: paste a usability script, get a grade, and chat with the interviewer. Nothing is sent anywhere.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
