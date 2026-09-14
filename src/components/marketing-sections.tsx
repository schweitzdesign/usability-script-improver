import { BrandCluster } from "@/components/brand-cluster";
import { ShapeDivider } from "@/components/shape-divider";

const STEPS = [
  {
    color: "bg-forest",
    textColor: "text-bone",
    title: "Drop it.",
    body: "Paste a script, upload a .docx, or just describe what you're testing.",
  },
  {
    color: "bg-vermilion",
    textColor: "text-ink",
    title: "Poke it.",
    body: "We ask the annoying question you skipped — is this a task, or are you fishing for a compliment?",
  },
  {
    color: "bg-chartreuse",
    textColor: "text-ink",
    title: "Discover something.",
    body: "Leave with a test built to find out what's true, not confirm what you hoped.",
  },
];

const ENEMY_LINES = [
  "Please stop leading the witness.",
  "“Would you use this?” is not a research plan.",
  "You already know what you want them to say. That's the problem.",
];

// Section background is chartreuse — bullet colors are picked to stay
// visible against it (no chartreuse dots here).
const PRINCIPLES = [
  ["Play creates discovery.", "bg-forest"],
  ["Don't decorate when you can communicate.", "bg-ink"],
  ["Challenge assumptions.", "bg-vermilion"],
  ["Preserve usability. Always.", "bg-forest"],
] as const;

export function MarketingSections() {
  return (
    <>
      <div className="mx-auto w-full max-w-5xl px-6">
        <ShapeDivider />
      </div>

      {/* How it works */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
        <h2 className="font-display mb-10 text-3xl font-semibold tracking-tight sm:text-4xl">
          Three moves.
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="space-y-3">
              <div
                className={`${step.color} ${step.textColor} flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold`}
              >
                {i + 1}
              </div>
              <h3 className="font-display text-xl font-semibold">{step.title}</h3>
              <p className="text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Forest pull-quote band */}
      <section aria-label="POKE's philosophy" className="bg-forest w-full">
        <blockquote className="text-bone mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <p className="font-display text-3xl leading-tight font-semibold text-balance sm:text-5xl">
            Most usability tests are designed to validate.
            <br />
            POKE helps you discover.
          </p>
          <p className="mt-6 text-lg text-balance opacity-80">
            Designers already have plenty of tools for making things. This one&rsquo;s for
            thinking harder about whether they work.
          </p>
        </blockquote>
      </section>

      {/* Who it's for */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
        <div className="grid gap-10 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="space-y-4">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Built for people who already know how to ask.
            </h2>
            <p className="text-muted-foreground max-w-xl text-lg">
              And want to ask better. POKE is for UX and product designers turning a rough
              idea, an existing script, or a test plan into something rigorous enough to
              trust.
            </p>
          </div>
          <BrandCluster className="hidden w-40 shrink-0 sm:block" />
        </div>

        <dl className="mt-10 grid gap-8 border-t pt-10 sm:grid-cols-3">
          <div>
            <dt className="font-medium">Solo designers</dt>
            <dd className="text-muted-foreground mt-1 text-sm">
              Shipping without a research team, who still want evidence over instinct.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Researchers</dt>
            <dd className="text-muted-foreground mt-1 text-sm">
              Tired of writing tests that just rubber-stamp a decision already made.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Teams</dt>
            <dd className="text-muted-foreground mt-1 text-sm">
              Who want to walk into a review with what actually happened, not opinions.
            </dd>
          </div>
        </dl>
      </section>

      {/* The enemy: validation theater */}
      <section className="bg-vermilion w-full">
        <div className="text-ink mx-auto max-w-4xl px-6 py-16 sm:py-20">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            POKE isn&rsquo;t fighting research. It&rsquo;s fighting validation theater.
          </h2>
          <p className="mt-4 max-w-2xl text-lg opacity-90">
            The moments research becomes a ritual performed to justify a decision that was
            already made. We&rsquo;re willing to call that out.
          </p>
          <ul className="mt-8 space-y-3 border-t border-black/15 pt-8">
            {ENEMY_LINES.map((line) => (
              <li key={line} className="font-display text-xl font-medium sm:text-2xl">
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Principles */}
      <section className="bg-chartreuse w-full">
        <div className="text-ink mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            How POKE thinks.
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {PRINCIPLES.map(([line, dot]) => (
              <li key={line} className="flex items-start gap-3 text-lg">
                <span className={`${dot} mt-2 h-2.5 w-2.5 shrink-0 rounded-full`} />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
