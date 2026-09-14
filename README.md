# Usability Script Improver

Submit a usability test script — paste it or upload a Word document — and get expert
review and AI-powered guidance. Built with Next.js (App Router), TypeScript, Tailwind
CSS, and shadcn/ui.

## Status: Phase 1 (MVP)

The current scope is intentionally small: one intake form, two ways to submit a script
(paste text or upload a `.docx`), and a Slack notification when a submission comes in.
No accounts, no database yet — see [Roadmap](#roadmap) for what's next.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # add your Slack webhook URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Slack notifications

Submissions are posted to Slack via an [Incoming Webhook](https://api.slack.com/messaging/webhooks):

1. Create a Slack app (or reuse one) at <https://api.slack.com/apps>.
2. Enable **Incoming Webhooks** and add one for the channel you want submissions in.
3. Copy the webhook URL into `.env.local` as `SLACK_WEBHOOK_URL`.

If the webhook isn't configured, submissions still succeed locally but a warning is
logged to the server console instead of posting to Slack.

## Tech notes

- **Next.js App Router + TypeScript** for the app itself.
- **Tailwind CSS v4 + shadcn/ui** (Radix primitives) for accessible, themeable UI
  components — Tabs, form controls, and alerts all come with keyboard and screen-reader
  support out of the box.
- **mammoth** extracts plain text from uploaded `.docx` files server-side.
- **zod** validates the submission payload on the server.
- Accessibility target: WCAG 2.2 AA (labeled fields, visible focus states, skip link,
  live-region status updates, `role="alert"` on errors).

## Roadmap

- **Phase 1 (this)**: intake form (paste or upload) → Slack notification.
- **Phase 2**: conversational intake that drafts a first-pass script from a
  designer's learning objectives; AI-powered review/guidance on submitted scripts.
- **Phase 3**: accounts, persistence, and a history of submissions/feedback.

Visual design and branding are still placeholder and will be developed iteratively.

## Deploy

Deploys cleanly to [Vercel](https://vercel.com/new). Set `SLACK_WEBHOOK_URL` as an
environment variable in the project settings.
