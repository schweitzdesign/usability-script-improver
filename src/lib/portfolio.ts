import { NextResponse } from "next/server";
import { PORTFOLIO_CLOSED_CODE, PORTFOLIO_CLOSED_MESSAGE } from "@/lib/portfolio-constants";

/**
 * Portfolio mode: the alpha is closed, so nothing that costs money may run. It is a plain
 * server-side setting in Vercel, read per request (never at import time), and only the exact
 * value "1" turns it on, so a typo leaves the app working rather than half closed.
 */
export function isPortfolioMode() {
  return process.env.PORTFOLIO_MODE === "1";
}

export function portfolioClosedResponse() {
  return NextResponse.json(
    { error: PORTFOLIO_CLOSED_MESSAGE, code: PORTFOLIO_CLOSED_CODE },
    { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "86400" } }
  );
}

/** Returns the "closed" response while portfolio mode is on, or null when the route may run. */
export function requirePortfolioOpen() {
  return isPortfolioMode() ? portfolioClosedResponse() : null;
}
