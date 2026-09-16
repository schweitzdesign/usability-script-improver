# POKE

**Poke at reality.**

An AI-powered usability research tool for UX and product designers. Paste a script,
drop a `.docx`, or describe what you're testing — POKE helps turn it into a sharper
usability test. Most usability tests are designed to validate; POKE helps you discover.

Built with Next.js (App Router), TypeScript, Tailwind CSS, and shadcn/ui.

## Status: Phase 2

One big paste-or-drop input (no accounts, no name/email required) → saved to Supabase
→ Slack notification → graded by Claude (F to A+, on-brand voice, up to 3 each of
strengths/weaknesses/critical pre-launch changes) → an ongoing chat seeded with the
grade, so the designer can go deeper. Below the input is a marketing pass introducing
the product and the brand.

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

Grading persists back onto the same row (`grade`, `grade_summary`,
`grade_strengths`, `grade_weaknesses`, `grade_critical_changes`, `graded_at`) via
[`supabase/migrations/0002_add_grading_columns.sql`](supabase/migrations/0002_add_grading_columns.sql) —
run this too, after `schema.sql`.

### AI grading & chat (Anthropic)

1. Get an API key at <https://console.anthropic.com>.
2. Add it to `.env.local` as `ANTHROPIC_API_KEY`.

Grading uses forced tool-use (`tool_choice`) against `claude-haiku-4-5` to get
schema-valid structured JSON — no separate parsing step, validated again server-side
with zod. Submissions with too little text to grade (a sentence, lorem ipsum, a
keyboard mash) are detected with a **zero-token heuristic** (`src/lib/grading.ts`,
`isLowInfo`) and handled entirely in application logic — no model call, and the
response doubles as the onboarding prompt asking for a learning objective. If
`ANTHROPIC_API_KEY` isn't configured, grading/chat soft-skip with a console warning,
same as Slack/Supabase.

## Brand

Full brand brief lives outside the repo; this is the working summary for anyone
touching UI.

**Idea.** Play is the mechanism. A small vocabulary of geometric forms — mostly
circles — collide, overlap, and combine. The composition principle is *interaction
between elements*, not decoration filling space: a strong composition can hold just a
few shapes. The brand is playful but not childish, smart but not academic, and willing
to call out "validation theater" — research performed to justify a decision that was
already made.

**Palette** (`src/app/globals.css`):

| Token | Hex | Use |
|---|---|---|
| Bone | `#F5F0E8` | Background |
| Ink | `#1A1A1A` | Text, borders |
| Forest | `#2D5A3D` | Primary actions, links |
| Chartreuse | `#E5F54D` | Accent — background for Ink text only |
| Vermilion | `#E85D3F` | Decorative accent only — fails AA as small text/button copy |

A deepened vermilion (`#B23A24`) covers destructive/error states, where the bright
brand vermilion can't. Check any new text-on-color pairing against WCAG AA (4.5:1)
before using it — see the git history for the contrast math on the current set.

**Type.** Fredoka (`font-display`) for brand moments only — wordmark, headlines,
pull-quotes. Geist Sans (`font-sans`, the default) for everything else — all product
UI and body copy. This split is deliberate: expressive typography for the brand, clear
typography for the product. Don't blur it.

**Motifs.** `Wordmark`, `BrandCluster` (the overlapping-circles mark), `ShapeDivider`
(a loose row of the brand's dot/arc/bar vocabulary), and `QuiltSwatch` (a small
pattern-tile callback) live in `src/components/`. The mega-input and its primary
button use a thick ink border + hard offset shadow + slight rotation — a tactile,
sticker-like treatment that reinforces the brand's "forms should feel physical"
language — but this treatment stays off small/dense product chrome; restraint matters
more than coverage.

## Tech notes

- **Next.js App Router + TypeScript** for the app itself.
- **Tailwind CSS v4 + shadcn/ui** (Radix primitives) for accessible, themeable UI
  components.
- **mammoth** extracts plain text from uploaded `.docx` files server-side.
- **zod** validates the submission payload on the server.
- **Supabase** (Postgres) persists every submission; the service role key is used
  server-side only, in the API route.
- **`@anthropic-ai/sdk`** (not the Vercel AI SDK — see git history for why) calls
  `claude-haiku-4-5` for grading (forced tool-use, structured output) and chat
  (plain non-streaming replies). Server-side only, in `/api/grade` and `/api/chat`.
- Accessibility target: WCAG 2.2 AA — labeled inputs, visible focus states (including
  a focusable skip-link target), keyboard-operable file selection alongside
  drag-and-drop, live-region status updates, and every brand color pairing checked for
  contrast before use.

## Roadmap

- **Phase 1**: paste-or-drop intake → saved to Supabase → Slack notification.
- **Phase 2 (this)**: AI grading (F–A+, strengths/weaknesses/critical changes) →
  ongoing chat, with a zero-token onboarding path for low-detail submissions.
- **Phase 3**: accounts and a history of submissions/feedback per user; possibly
  streaming chat replies.

## Deploy

Deploys cleanly to [Vercel](https://vercel.com/new). Set `SLACK_WEBHOOK_URL`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ANTHROPIC_API_KEY` as environment
variables in the project settings.
