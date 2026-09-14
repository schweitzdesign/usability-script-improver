"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Mode = "paste" | "upload";
type Status = "idle" | "submitting" | "success" | "error";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function IntakeForm() {
  const [mode, setMode] = useState<Mode>("paste");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const scriptRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setFieldError(null);

    const name = nameRef.current?.value.trim() ?? "";
    const email = emailRef.current?.value.trim() ?? "";

    if (!name) {
      setFieldError("Enter your name.");
      nameRef.current?.focus();
      return;
    }
    if (!email || !EMAIL_PATTERN.test(email)) {
      setFieldError("Enter a valid email address.");
      emailRef.current?.focus();
      return;
    }
    if (mode === "paste" && !scriptRef.current?.value.trim()) {
      setFieldError("Paste your script before submitting.");
      scriptRef.current?.focus();
      return;
    }
    if (mode === "upload" && !fileRef.current?.files?.length) {
      setFieldError("Choose a .docx file to upload.");
      fileRef.current?.focus();
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("mode", mode);

    setStatus("submitting");
    try {
      const res = await fetch("/api/submissions", { method: "POST", body: formData });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("Couldn't reach the server. Check your connection and try again.");
    }
  }

  function resetForm() {
    formRef.current?.reset();
    setMode("paste");
    setFileName(null);
    setStatus("idle");
    setErrorMessage(null);
    setFieldError(null);
  }

  if (status === "success") {
    return (
      <Card role="status" tabIndex={-1} className="border-primary/20">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Got it.</h2>
            <p className="text-muted-foreground text-sm">
              Your script is on its way to our team. We&rsquo;ll follow up by email if we have
              questions.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={resetForm}>
            Poke another one
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl font-semibold">
          Give us what you&rsquo;ve got.
        </CardTitle>
        <CardDescription>
          Paste your script, or upload a document. We&rsquo;ll help make it sharper.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" name="name" ref={nameRef} autoComplete="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                ref={emailRef}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              Script title <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input id="title" name="title" placeholder="e.g. Onboarding flow, round 2" />
          </div>

          <div className="space-y-2">
            <Label id="mode-label">How are you sharing your script?</Label>
            <Tabs
              value={mode}
              onValueChange={(value) => setMode(value as Mode)}
              aria-labelledby="mode-label"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paste">Paste script</TabsTrigger>
                <TabsTrigger value="upload">Upload document</TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-2 pt-4">
                <Label htmlFor="scriptText">Script text</Label>
                <Textarea
                  id="scriptText"
                  name="scriptText"
                  ref={scriptRef}
                  rows={12}
                  placeholder="Paste your usability test script here…"
                  aria-describedby="scriptText-hint"
                />
                <p id="scriptText-hint" className="text-muted-foreground text-sm">
                  Include your intro, tasks, and any follow-up questions.
                </p>
              </TabsContent>

              <TabsContent value="upload" className="space-y-2 pt-4">
                <Label htmlFor="file">Word document</Label>
                <div className="border-input hover:bg-accent/50 flex flex-col items-center gap-2 rounded-md border border-dashed px-6 py-8 text-center transition-colors">
                  <UploadCloud className="text-muted-foreground h-8 w-8" aria-hidden="true" />
                  <Input
                    id="file"
                    name="file"
                    type="file"
                    ref={fileRef}
                    accept=".docx"
                    className="max-w-xs"
                    aria-describedby="file-hint"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                  />
                  <p id="file-hint" className="text-muted-foreground text-sm">
                    .docx only, up to 5MB{fileName ? ` — selected: ${fileName}` : ""}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {fieldError ? (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Check the form</AlertTitle>
              <AlertDescription>{fieldError}</AlertDescription>
            </Alert>
          ) : null}

          {status === "error" && errorMessage ? (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Submission failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" disabled={status === "submitting"} className="w-full sm:w-auto">
            {status === "submitting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Sending…
              </>
            ) : (
              "Poke it."
            )}
          </Button>

          <p aria-live="polite" className="sr-only">
            {status === "submitting" ? "Submitting your script." : ""}
            {status === "error" ? `Error: ${errorMessage ?? fieldError}` : ""}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
