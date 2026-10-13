# POKE agent team: runbook

Step by step. Phase 1 is complete and tested in these steps. Later phases are stubs
that get filled in as we reach them, because they depend on what is actually on the
Hermes box.

## Phase 1: feedback front door

### One-time setup

1. **Database.** In Supabase, open SQL Editor, paste
   [`supabase/migrations/0003_feedback_and_usage.sql`](../../supabase/migrations/0003_feedback_and_usage.sql),
   and run it. It creates `feedback` and `usage_events`. Local and production share one
   project today, so run it once, and before deploying.
2. **Resend.** Create an account at resend.com, create an API key.
3. **Sender.** Verify a sending domain in Resend. Until then, `onboarding@resend.dev` works
   but can only email your own Resend account address.
4. **Env vars.** Add to `.env.local` and to Vercel (Project Settings, Environment Variables):
   - `RESEND_API_KEY`
   - `FEEDBACK_FROM_EMAIL`
5. **Remove Slack.** Delete `SLACK_WEBHOOK_URL` from Vercel. The code no longer reads it.
6. **SLA wording.** Check `src/lib/support-policy.ts`. The email promises what is written there.

### Try it locally

```bash
npm run dev
```

1. Open http://localhost:3000, click **Feedback** in the header.
2. Send one with your own email. You should see a ticket number, then get an email.
3. In Supabase, open the `feedback` table: the row should be there with status `new`.
4. Run a grade or a chat. In `usage_events` you should see rows with token counts and a
   small dollar estimate.

### Where things live

| Thing | Where |
|---|---|
| Feedback form | `src/components/feedback-dialog.tsx`, opened from the header in `poke-shell.tsx` |
| Feedback endpoint | `src/app/api/feedback/route.ts` |
| Confirmation email | `src/lib/email.ts` |
| SLA and ticket format | `src/lib/support-policy.ts` |
| Cost ledger | `src/lib/usage.ts`, prices in `src/lib/pricing.ts` |
| Schema | `supabase/migrations/0003_feedback_and_usage.sql` |

### Before every deploy that touches UI

Run once, right before deploying (not on every iteration):

- **Accessibility:** keyboard-only pass through the feedback dialog (Tab order, Esc closes,
  focus returns to the Feedback button), labels and error text, live-region announcements,
  contrast in light and dark, touch targets on a phone width, a VoiceOver spot check.
- **Motion:** add the dialog and success-state motion with the tokens in `src/lib/motion.ts`,
  every animation behind reduced-motion, then emulate reduced motion and confirm nothing moves.
- Re-run `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Phase 2: agent API and the Support bot (stub)

First step is a read-only look at the Hermes box over SSH: version, where config lives,
how role profiles and skills are defined, how the Telegram bot is wired, how it is scheduled.
This section gets rewritten from what is actually there.

Planned shape:

1. POKE gets `/api/agent/*` routes protected by a bearer token (new env var). Endpoints to
   list new tickets, read one, and write back classification and replies.
2. Hermes gets a Support profile that calls those routes. It never holds the Supabase key.
3. Create a separate Anthropic API key for Hermes and set a monthly spend limit in the Console.
4. Telegram becomes the ping for new feedback and new script submissions.
5. The Support bot reports its token usage into `usage_events`.

## Phase 3: PM and Design-Engineer bots (stub)

Add classification and scoring columns, a backlog table, the PM profile (RICE plus the cost
lens, reading `usage_events` and the monthly budget), and the Design-Engineer profile.

## Phase 4: one-pager and shipping (stub)

Prerequisites: a GitHub Actions workflow running lint, typecheck, and build; branch
protection requiring it; GitHub auto-merge enabled. Then the Telegram Yes/No/Ask-more flow
and the pull-request step. Decide what writes the code (open question in the PRD).

## Phase 5: hardening (stub)

Evals for each bot, a cost review against budget, an audit-trail review, and the
alpha-to-beta scorecard.
