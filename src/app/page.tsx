import { IntakeForm } from "@/components/intake-form";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <a
        href="#intake-form"
        className="bg-background text-foreground focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:ring-2 focus:outline-none"
      >
        Skip to form
      </a>

      <header className="border-b">
        <div className="mx-auto w-full max-w-2xl px-6 py-6">
          <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            Usability Script Improver
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Get expert eyes on your usability script
          </h1>
          <p className="text-muted-foreground text-lg text-balance">
            Paste your script or upload a document and our team will review it and follow up with
            guidance.
          </p>
        </div>

        <div id="intake-form">
          <IntakeForm />
        </div>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto w-full max-w-2xl px-6 py-6 text-sm">
          More ways to get started — a guided conversation and expert AI feedback — are coming
          soon.
        </div>
      </footer>
    </div>
  );
}
