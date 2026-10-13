"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { MessageSquare, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatTicketNumber } from "@/lib/support-policy";

type Kind = "bug" | "idea" | "other";

const KINDS: { value: Kind; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "other", label: "Something else" },
];

type Sent = { ticketNumber: number | null; emailed: boolean };

export function FeedbackDialog({ demo = false }: { demo?: boolean }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageMissing, setMessageMissing] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);

  const ids = useId();
  const messageId = `${ids}-message`;
  const emailId = `${ids}-email`;
  const errorId = `${ids}-error`;

  const messageRef = useRef<HTMLTextAreaElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // The focused Send button unmounts when the form is replaced by the
  // success state; without this, focus falls to the page behind the dialog
  // and a screen reader user hears nothing.
  useEffect(() => {
    if (sent) successRef.current?.focus();
  }, [sent]);

  useEffect(() => {
    if (messageMissing) messageRef.current?.focus();
  }, [messageMissing]);

  function reset() {
    setKind("bug");
    setMessage("");
    setEmail("");
    setWebsite("");
    setError(null);
    setMessageMissing(false);
    setSent(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (sending) return;

    if (!message.trim()) {
      setError("Tell us what happened first.");
      setMessageMissing(true);
      return;
    }

    setSending(true);
    setError(null);
    setMessageMissing(false);

    if (demo) {
      await new Promise((r) => setTimeout(r, 400));
      setSent({ ticketNumber: null, emailed: false });
      setSending(false);
      return;
    }

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          message,
          email,
          website,
          pageUrl: window.location.href,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          appMode: "live",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        ticketNumber?: number | null;
      };

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again?");
        return;
      }
      setSent({ ticketNumber: data.ticketNumber ?? null, emailed: Boolean(email.trim()) });
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) reset();
      }}
    >
      <Dialog.Trigger className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium outline-none focus-visible:ring-2">
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        Feedback
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:data-[ending-style]:opacity-0 motion-safe:data-[starting-style]:opacity-0" />
        <Dialog.Popup initialFocus={messageRef} className="border-ink bg-bone text-foreground fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border-2 p-6 shadow-[6px_6px_0_var(--ink)] outline-none motion-safe:transition-[opacity,scale] motion-safe:duration-200 motion-safe:ease-[var(--ease-brand)] motion-safe:data-[ending-style]:scale-95 motion-safe:data-[ending-style]:opacity-0 motion-safe:data-[starting-style]:scale-95 motion-safe:data-[starting-style]:opacity-0">
          <Dialog.Close
            aria-label="Close feedback"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-3 right-3 rounded-md p-1.5 outline-none focus-visible:ring-2"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Dialog.Close>

          {sent ? (
            <div
              ref={successRef}
              tabIndex={-1}
              role="status"
              className="flex flex-col gap-3 pt-2 outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200"
            >
              <Dialog.Title className="text-2xl font-bold">Got it.</Dialog.Title>
              <Dialog.Description className="text-base leading-relaxed">
                {demo
                  ? "Demo mode: nothing was actually sent."
                  : sent.emailed
                    ? "Thanks for poking at POKE. We just emailed you a confirmation."
                    : "Thanks for poking at POKE. We read everything."}
              </Dialog.Description>
              {sent.ticketNumber !== null && (
                <p className="text-sm">
                  Ticket <span className="font-bold">{formatTicketNumber(sent.ticketNumber)}</span>
                </p>
              )}
              <Dialog.Close render={<Button className="mt-2 self-start" />}>Close</Dialog.Close>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 pr-8">
                <Dialog.Title className="text-2xl font-bold">Tell us what&apos;s off.</Dialog.Title>
                <Dialog.Description className="text-muted-foreground text-sm">
                  A bug, an idea, or a hunch. Short is fine.
                </Dialog.Description>
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">What kind?</legend>
                <div className="flex flex-wrap gap-2">
                  {KINDS.map((k) => (
                    <div key={k.value} className="relative">
                      <input
                        type="radio"
                        name={`${ids}-kind`}
                        id={`${ids}-kind-${k.value}`}
                        value={k.value}
                        checked={kind === k.value}
                        onChange={() => setKind(k.value)}
                        className="peer sr-only"
                      />
                      <label
                        htmlFor={`${ids}-kind-${k.value}`}
                        className={cn(
                          "border-ink peer-focus-visible:ring-ring cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium select-none peer-focus-visible:ring-2",
                          kind === k.value ? "bg-forest text-bone" : "bg-background"
                        )}
                      >
                        {k.label}
                      </label>
                    </div>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={messageId}>What happened?</Label>
                <Textarea
                  ref={messageRef}
                  id={messageId}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  aria-invalid={messageMissing ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  className="bg-background min-h-24"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={emailId}>Email (only if you want a reply)</Label>
                <Input
                  id={emailId}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background"
                />
              </div>

              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Leave this empty
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </label>
              </div>

              <p className="text-muted-foreground text-xs">
                We attach the page you&apos;re on, your browser, and your screen size so we can
                reproduce things.
              </p>

              {error && (
                <Alert variant="destructive" id={errorId}>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={sending} className="self-start">
                {sending ? "Sending..." : "Send it"}
              </Button>
            </form>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
