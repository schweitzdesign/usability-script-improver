import Link from "next/link";

/**
 * A slim, always-visible notice for the closed alpha. It is plain content, not a live region: it is
 * the first thing in the reading order after the skip link, so screen reader users meet it without
 * it interrupting anything, and it keeps the demo and case study one tap away for everyone.
 */
export function PortfolioBanner() {
  return (
    <section aria-label="Alpha status" className="bg-ink text-bone">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-6 py-1 text-sm">
        <p className="font-medium">The POKE alpha has closed.</p>
        <div className="flex flex-wrap items-center justify-center gap-x-4">
          <Link
            href="/demo"
            className="bg-chartreuse text-ink focus-visible:ring-bone inline-flex min-h-11 items-center rounded-full px-4 font-display font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            Try the demo
          </Link>
          <Link
            href="/about"
            className="focus-visible:ring-bone inline-flex min-h-11 items-center rounded-md font-medium underline underline-offset-4 outline-none focus-visible:ring-2"
          >
            Read the case study
          </Link>
        </div>
      </div>
    </section>
  );
}
