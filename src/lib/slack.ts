type SlackNotificationInput = {
  title: string;
  name: string;
  email: string;
  mode: "paste" | "upload";
  fileName?: string;
  scriptText: string;
};

const SLACK_TEXT_PREVIEW_LIMIT = 2800;

export async function notifySlack(input: SlackNotificationInput) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn(
      "[slack] SLACK_WEBHOOK_URL is not set — skipping notification. See .env.local.example."
    );
    return { delivered: false as const };
  }

  const truncated = input.scriptText.length > SLACK_TEXT_PREVIEW_LIMIT;
  const preview = truncated
    ? `${input.scriptText.slice(0, SLACK_TEXT_PREVIEW_LIMIT)}…`
    : input.scriptText;

  const sourceLine =
    input.mode === "upload"
      ? `Uploaded document: *${input.fileName ?? "untitled.docx"}*`
      : "Pasted directly into the form";

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: "New usability script submitted", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Title*\n${input.title || "(untitled)"}` },
        { type: "mrkdwn", text: `*From*\n${input.name} <${input.email}>` },
      ],
    },
    { type: "section", text: { type: "mrkdwn", text: sourceLine } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `\`\`\`${preview}\`\`\`${
          truncated
            ? `\n_Truncated — ${input.scriptText.length.toLocaleString()} characters total._`
            : ""
        }`,
      },
    },
  ];

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "New usability script submitted", blocks }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Slack webhook responded with ${res.status}: ${body}`);
  }

  return { delivered: true as const };
}
