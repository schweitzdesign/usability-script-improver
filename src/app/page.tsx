import { IntakeForm } from "@/components/intake-form";
import { Wordmark } from "@/components/wordmark";
import { BrandCluster } from "@/components/brand-cluster";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <a
        href="#intake-form"
        className="bg-background text-foreground focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:ring-2 focus:outline-none"
      >
        Skip to form
      </a>

      <header className="border-border border-b">
        <div className="mx-auto w-full max-w-3xl px-6 py-5">
          <Wordmark size="sm" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-12 sm:py-16">
        <div className="grid items-center gap-8 sm:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <p className="text-forest font-display text-sm font-semibold tracking-wide uppercase">
              Poke at reality.
            </p>
            <h1 className="font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
              Your test could be better.
              <br />
              Let&rsquo;s poke at it.
            </h1>
            <p className="text-muted-foreground max-w-md text-lg text-balance">
              Paste a script, upload a document, or just tell us what you&rsquo;re testing.
              We&rsquo;ll help you ask better questions than &ldquo;would you use this?&rdquo;
            </p>
          </div>
          <BrandCluster className="hidden w-40 shrink-0 sm:block" />
        </div>

        <div id="intake-form">
          <IntakeForm />
        </div>
      </main>

      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto w-full max-w-3xl px-6 py-6 text-sm">
          A guided conversation, and AI feedback that actually pushes back — coming soon.
        </div>
      </footer>
    </div>
  );
}
