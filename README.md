# Usability Script Improver

Submit a usability test script — paste it or upload a Word document — and get expert
review and AI-powered guidance. Built with Next.js (App Router), TypeScript, Tailwind
CSS, and shadcn/ui.

## Status: Phase 1 (MVP)

The current scope is intentionally small: one intake form, two ways to submit a script
(paste text or upload a `.docx`), a Supabase row for every submission, and a Slack
notification when one comes in. No accounts yet — see [Roadmap](#roadmap) for what's
next.

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

### Database (Supabase)

1. Create a project at <https://supabase.com>.
2. In the SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql) to create the
   `submissions` table (RLS is enabled with no policies — only the service role key
   can read or write it).
3. In **Settings → API**, copy the **Project URL** and the **service_role** secret key
   into `.env.local` as `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

The service role key is server-only — it's never sent to the browser and must not be
prefixed with `NEXT_PUBLIC_`. If it isn't configured, submissions still succeed
locally (with a console warning) so development isn't blocked on it.

## Tech notes

- **Next.js App Router + TypeScript** for the app itself.
- **Tailwind CSS v4 + shadcn/ui** (Radix primitives) for accessible, themeable UI
  components — Tabs, form controls, and alerts all come with keyboard and screen-reader
  support out of the box.
- **mammoth** extracts plain text from uploaded `.docx` files server-side.
- **zod** validates the submission payload on the server.
- **Supabase** (Postgres) persists every submission; the service role key is used
  server-side only, in the API route.
- Accessibility target: WCAG 2.2 AA (labeled fields, visible focus states, skip link,
  live-region status updates, `role="alert"` on errors).

## Roadmap

- **Phase 1 (this)**: intake form (paste or upload) → saved to Supabase → Slack
  notification.
- **Phase 2**: conversational intake that drafts a first-pass script from a
  designer's learning objectives; AI-powered review/guidance on submitted scripts.
- **Phase 3**: accounts and a history of submissions/feedback per user.

Visual design and branding are still placeholder and will be developed iteratively.

## Deploy

Deploys cleanly to [Vercel](https://vercel.com/new). Set `SLACK_WEBHOOK_URL`,
`SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` as environment variables in the
project settings.
