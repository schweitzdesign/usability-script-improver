"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Choice = "yes" | "no" | "more";

const DONE_COPY: Record<Choice, string> = {
  yes: "Recorded. You will hear back in Telegram.",
  no: "Recorded. This item is closed and nothing will be changed.",
  more: "Recorded. The product manager bot will pick up your note and come back with more.",
};

export function DecisionForm({
  token,
  options,
}: {
  token: string;
  options: { value: Choice; label: string; hint: string }[];
}) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Choice | null>(null);
  const ids = useId();
  const doneRef = useRef<HTMLDivElement>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!choice || sending) return;
    if (choice === "more" && !note.trim()) {
      setError("Tell the product manager bot what you want to know.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, choice, note: note.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again?");
        return;
      }
      setDone(choice);
      // The form unmounts; send focus to the confirmation so it is announced.
      requestAnimationFrame(() => doneRef.current?.focus());
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div ref={doneRef} tabIndex={-1} role="status" className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 outline-none">
        <p className="font-medium">{DONE_COPY[done]}</p>
        <p className="mt-1 text-sm text-muted-foreground">This link is now used up. You can close this page.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Your decision</legend>
        {options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 has-[:checked]:border-forest has-[:checked]:ring-2 has-[:checked]:ring-forest/30 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
          >
            <input
              type="radio"
              name="choice"
              value={o.value}
              checked={choice === o.value}
              onChange={() => {
                setChoice(o.value);
                setError(null);
              }}
              className="mt-1 size-4 accent-[var(--forest)]"
            />
            <span>
              <span className="block font-medium">{o.label}</span>
              <span className="block text-sm text-muted-foreground">{o.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${ids}-note`}>
          {choice === "more" ? "What do you want to know?" : "Note for the product manager bot (optional)"}
        </Label>
        <Textarea
          id={`${ids}-note`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={3}
          aria-describedby={error ? `${ids}-error` : undefined}
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription id={`${ids}-error`}>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" disabled={!choice || sending} className="h-11 text-base">
        {sending ? "Sending..." : "Send decision"}
      </Button>
    </form>
  );
}
