import { connection } from "next/server";
import { isPortfolioMode } from "@/lib/portfolio";
import { LiveApp } from "./live-app";

export default async function Home() {
  // Read the setting on every request, so flipping PORTFOLIO_MODE in Vercel takes effect
  // without a rebuild. Without this the page would be prerendered and the value baked in.
  await connection();

  return <LiveApp closed={isPortfolioMode()} />;
}
