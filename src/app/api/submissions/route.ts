import { NextResponse } from "next/server";
import { z } from "zod";
import mammoth from "mammoth";
import { notifySlack } from "@/lib/slack";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const metaSchema = z.object({
  name: z.string().trim().min(1, "Enter your name."),
  email: z.string().trim().email("Enter a valid email address."),
  title: z.string().trim().max(200).optional().default(""),
  mode: z.enum(["paste", "upload"]),
});

export async function POST(request: Request) {
  const formData = await request.formData();

  const parsed = metaSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    title: formData.get("title") ?? "",
    mode: formData.get("mode"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid submission." },
      { status: 400 }
    );
  }

  const { name, email, title, mode } = parsed.data;

  let scriptText = "";
  let fileName: string | undefined;

  if (mode === "paste") {
    const text = formData.get("scriptText");
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Paste your script text before submitting." },
        { status: 400 }
      );
    }
    scriptText = text.trim();
  } else {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Choose a .docx file to upload." },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "That file is larger than 5MB — trim it down and try again." },
        { status: 400 }
      );
    }
    if (!file.name.toLowerCase().endsWith(".docx")) {
      return NextResponse.json(
        { error: "Only .docx files are supported right now." },
        { status: 400 }
      );
    }

    fileName = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      const result = await mammoth.extractRawText({ buffer });
      scriptText = result.value.trim();
    } catch {
      return NextResponse.json(
        { error: "Couldn't read that document. Make sure it's a valid .docx file." },
        { status: 400 }
      );
    }

    if (!scriptText) {
      return NextResponse.json(
        { error: "That document doesn't seem to contain any text." },
        { status: 400 }
      );
    }
  }

  const supabase = getSupabaseServerClient();
  let slackNotified = false;

  try {
    await notifySlack({ title, name, email, mode, fileName, scriptText });
    slackNotified = true;
  } catch (error) {
    // Best-effort: persistence below is the source of truth, so a failed
    // notification shouldn't fail the submission.
    console.error("[submissions] Slack notification failed:", error);
  }

  if (supabase) {
    const { error } = await supabase.from("submissions").insert({
      name,
      email,
      title,
      mode,
      file_name: fileName ?? null,
      script_text: scriptText,
      slack_notified: slackNotified,
    });

    if (error) {
      console.error("[submissions] Supabase insert failed:", error);
      return NextResponse.json(
        { error: "We couldn't save your script. Please try again in a moment." },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
