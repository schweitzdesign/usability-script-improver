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

## Phase 2: agent API and the Support bot (built and tested)

### How it works

1. A user sends feedback. A `feedback` row lands with status `new`.
2. Every 2 minutes a systemd timer on the droplet runs `pokectl sync` (a plain script, zero
   model tokens). For each new ticket it claims it (`queued`), creates a Hermes kanban task
   for the `support` profile, subscribes Telegram to that task, and posts
   `[Support] New ticket POKE-00NN` to Telegram.
3. The Hermes dispatcher (inside the gateway, ticks every 60 seconds) starts one `support`
   worker at a time. The worker runs only `pokectl` commands: read the policy, read the
   ticket, list recent tickets, classify, draft a reply, then complete the task with a
   `[Support]` summary that Telegram announces.
4. POKE stores classification, severity, notes, the draft reply, and an audit event for each
   step. Replies stay drafts unless `AGENT_REPLY_MODE=send`.
5. Every 30 minutes `pokectl usage-sync` reports the bot's token usage into `usage_events`.

### Where things live

| Thing | Where |
|---|---|
| Agent API (POKE side) | `src/app/api/agent/*`, auth in `src/lib/agent-auth.ts`, rules in `src/lib/tickets.ts` |
| The agents' command line | `ops/hermes/pokectl`, installed at `/usr/local/bin/pokectl` on the droplet |
| Its config and token | `/etc/pokectl.env` on the droplet (mode 600) |
| Timers | `ops/hermes/systemd/*`, installed in `/etc/systemd/system/` |
| The bot's instructions | `/root/.hermes/profiles/support/SOUL.md` on the droplet |
| The bot's settings | `/root/.hermes/profiles/support/config.yaml` (model, tools, approvals) |
| Shared facts and tone | `src/lib/support-policy.ts` (the bot reads it through `pokectl policy`) |

### Operating it (run these in the DigitalOcean console)

```bash
pokectl ticket recent          # newest tickets and their state
pokectl ticket get 12          # one ticket, with its history
hermes kanban list             # what the bots are working on
hermes kanban watch            # live view
hermes pause                   # emergency stop: no new work starts
hermes resume                  # undo the stop
hermes -p support insights     # support bot token usage
```

### When something goes wrong

- **A task shows `blocked`:** read why with `hermes kanban show <task id>`. Fix the cause
  (for example a bad token), then `hermes kanban unblock <task id>` and it reruns. The ticket
  stays `queued` in the meantime and nothing is replied twice.
- **A worker crashed:** Hermes notices within about a minute, blocks the task, and Telegram
  says so. Same recovery as above.
- **Stop everything:** `hermes pause`. In-flight work finishes, nothing new starts.
- **Rotate the agent token:** generate a new value, update `AGENT_API_TOKEN` in Vercel
  (then redeploy) and in `/etc/pokectl.env` on the droplet.

### Safety design

The support bot reads text from members of the public, so it is treated as exposed to prompt
injection. Layers, all verified with `hermes -p support approvals test` (nothing executes):

- Terminal approvals are `manual`, so anything not allowlisted is refused when no human answers.
- Only `pokectl *` is allowlisted. Deny rules block secret paths, network tools, scripting
  languages, and shell chaining or substitution (`; | && $ ` > <` and newlines).
- The API refuses replies with em or en dashes, duplicate links to later tickets, and invalid
  status changes. Customer email addresses are never returned to the bot.
- The agent token only reaches the narrow `/api/agent/*` routes, never the database.

Residual risk, stated plainly: deny rules are policy, not a sandbox. Real containment would be
Docker as the terminal backend, which is too heavy for this 1 GB droplet. Acceptable while the
only traffic is the maintainer's; revisit before real users reach the bot.

### Cost (measured)

| What | Measured |
|---|---|
| Support bot, per ticket | about 2 cents (1.5 to 3 cents; the first call of a run writes the prompt cache) |
| 14 sessions including every failure test | $0.28 |
| Bot prompt size | about 38 KB: 31 KB of tool schemas (kanban alone is 24 KB) plus instructions |
| Memory | peaked near 680 MB on the 1 GB droplet with 2 GB swap, swap barely used |

Caps in place: `POKE Production` $10 per month and `Hermes agent` $30 per month, set per
workspace in the Anthropic Console.

### Things the first live runs taught us (all fixed)

- The bot used an em dash despite instructions, so the reply endpoint now rejects them.
- Two reports of one bug were marked duplicates of each other, so a duplicate link must now
  point to an earlier ticket.
- The bot invented a product capability ("you can come back to your grade") when the facts
  were silent. It now has a never-guess rule, and the true answer is in the shared FAQ.
- `pokectl ticket recent` returned the oldest tickets, which hid recent duplicates.

### Known gaps

- A blocked or crashed task leaves its ticket `queued` until someone unblocks it. Telegram
  announces the block, but there is no automatic reminder.
- Replies are drafts only until `AGENT_REPLY_MODE=send` is set in Vercel.
- Hermes is 11k commits behind and pinned on purpose; do not run `hermes update` mid-project.

### Removing access when finished

On the droplet: `sed -i '/claude-code-temp-access/d' ~/.ssh/authorized_keys`. Delete the
`.env.bak*` files in `/root/.hermes/`, and delete the `before-poke-agents` snapshot once you no
longer need to roll back.

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
