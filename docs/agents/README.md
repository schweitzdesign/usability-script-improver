# POKE agent team: read this first

The plain-language story of how the agent system works, why it is built this way, what
actually happened while building it, and where it stands. Written for a human coming back
cold and for an AI picking up the work. Deeper detail: [PRD.md](PRD.md) (the plan),
[architecture.md](architecture.md) (diagrams), [runbook.md](runbook.md) (how to operate it).

## The idea in one paragraph

POKE is a web app that grades usability test scripts. As an alpha it had no way to hear from
users. So we added a feedback form, and behind it a small team of AI agents that behave like a
tiny product company: a **Support bot** who answers users and does first-round triage, a **PM
bot** who decides what is worth doing, and a **Design-Engineer bot** who proposes how. A human
(Zach, the Director of Product) makes the one decision that matters: ship it or not. Only the
Support bot exists so far. Telegram is where the agents talk to Zach.

## Who and what is in the system

| Piece | What it is | Where it lives |
|---|---|---|
| **POKE** | The web app. Also the front door for feedback and the system of record. | Vercel (code in this repo) |
| **Supabase** | The database: scripts, feedback tickets, an audit trail, a cost ledger. | supabase.com project |
| **Agent API** | A small, token-protected door into POKE for the bots. They never touch the database. | `src/app/api/agent/*` |
| **`pokectl`** | The only command the Support bot may run. A thin script around the Agent API. | `ops/hermes/pokectl` |
| **Hermes** | The agent runtime ("Hermes Agent" by Nous Research). Runs agents as **profiles** and hands them work through a **kanban board**. | A DigitalOcean droplet |
| **Support bot** | A Hermes profile: Haiku 4.5, a written personality and workflow, only `pokectl` and kanban tools. | Droplet, reference copy in `ops/hermes/support/` |
| **Telegram** | The channel where agents report to Zach. One bot, messages tagged like `[Support]`. | Telegram |
| **Cost ledger** | Every model call (the app's and the bots') is recorded with tokens and dollars. | `usage_events` table |
| **Zach** | Director of Product. Approves the things bots must not decide alone. | Telegram, eventually |

## The life of one ticket

1. A user clicks **Feedback** in the app and sends a bug, idea, or note. A row is saved as
   status `new`, and if they left an email they get an automatic "we got it" message with a
   ticket number and a response window.
2. Every 2 minutes a timer on the droplet runs `pokectl sync`. It uses **no AI**: it just asks
   POKE for new tickets, claims each one (`queued`), creates a task for the Support bot on the
   kanban board, and pings Telegram.
3. Hermes starts the Support bot on that task, one task at a time.
4. The bot reads the facts and tone ("policy"), the ticket, and a list of recent tickets.
   It decides what kind of ticket this is and how serious, writes a short reply, and records
   everything through `pokectl`.
5. If the facts answer the question (a user error, a known limit), the ticket is **resolved by
   support**. If it is a real bug, idea, or something the facts do not cover, it is **triaged**
   for a human or, later, the PM bot.
6. The reply is saved as a **draft**. It is only emailed if the system is switched to send mode.
7. The bot finishes the task with a one-line `[Support]` summary, which Telegram announces.
8. Every half hour another timer reports what the bots spent into the cost ledger.

## The Support bot: goals, tone, agenda, skills, resources

This is the as-built description. It is the thing Zach wants to understand and refine next.

**Goals.** Be the voice to the customer. Do honest first-round triage. Resolve what the known
facts can resolve. Escalate everything else without pretending. Never promise a fix, never
guess, never be the one who prioritizes.

**Tone.** Defined once, in `src/lib/support-policy.ts`, and read by the bot every ticket:
direct, warm, a little provocative like POKE itself; short sentences, plain words, no corporate
hedging; say what you know and what you do not; no em or en dashes. Replies are one or two
sentences.

**Agenda (what it does, in order).** Read policy, read the ticket, look at recent tickets for
duplicates, classify (bug, usability, feature request, user error, question, or not
actionable), set severity, then either answer and resolve, or acknowledge with the response
window and escalate. Always finish with a `[Support]` summary line. The exact wording of these
instructions is [`ops/hermes/support/SOUL.md`](../../ops/hermes/support/SOUL.md).

**Skills (what it can do).** In Hermes terms it has no installed "skills". Its abilities are:
`pokectl policy`, `pokectl ticket get`, `pokectl ticket recent`, `pokectl ticket classify`,
`pokectl ticket reply`, plus the kanban tools to complete or block its own task. That is all.

**Resources (what it knows).**
- The policy: response windows, tone, and a short FAQ of true facts about POKE
  (`src/lib/support-policy.ts`).
- The ticket: message, kind, page, browser, screen size, and whether the user left an email
  (never the address itself).
- A one-line list of recent tickets.
- Nothing else: not the product code, not users' scripts or grades, not the web. It has no
  memory between tickets.

**Limits, by design.** Answers only from the policy facts. Treats ticket text as data, never
instructions. Has no shell: its only abilities are five tools served by `pokectl mcp` plus the
board tools to finish its own task (see the runbook). The API rejects em dashes in replies,
greetings or closings of their own, replies over 300 characters, duplicate links to later tickets,
and impossible status changes.

**Where it is thin (honest).** Replies are short and generic. It cannot ask the user a follow-up
question because inbound email is not built, only outbound. It sees little context, so triage
is shallow. The FAQ is small, so many real questions will escalate.

## Current status

**Works, tested live:** the form and confirmation email, ticket storage, the sync, the Support
bot's triage and drafts, the kill switch (`hermes pause`), recovery from a bad token and from a
crashed worker, prompt-injection resistance, and cost tracking at about **2 cents per ticket**.

**Not yet a minimum viable experience (Zach's verdict, 2026-10-14):** the **Telegram messages are
not meaningful**. Their body and formatting do not tell Zach what happened or what to do. Gaps
behind that:
- Zach cannot see the bot's draft reply in Telegram, only a one-line summary.
- There is no way to approve, edit, or reject a reply from Telegram.
- A blocked task leaves its ticket stuck with no reminder.
- There is no in-app view of tickets; only Supabase or the command line.
- The Support bot's goals, tone, and agenda have not been reviewed by Zach as a product
  decision; they were set quickly to get the loop working.

**Next session:** redesign the Support experience: what the bot is for, how it sounds, what it
says to Zach, and the approve-from-Telegram flow. Bring a screenshot of the actual Telegram
messages. PM and Design-Engineer bots (Phase 3) and the shipping pipeline (Phase 4) wait.

## Why it is built this way (decisions)

- **Use Hermes' own profiles and kanban** instead of building an agent framework. It already
  has isolated agents, a shared task board, a dispatcher, crash handling, and Telegram delivery.
- **A script, not an AI, watches for new tickets.** Polling costs nothing. The model only runs
  when there is a ticket.
- **Bots go through a narrow API, never the database.** A leaked agent token can read and
  triage tickets, not read or wipe the database.
- **Replies start as drafts.** Trust is earned; one setting flips it to real emails.
- **The bot has no shell.** It reads text from the public, so it is treated as injectable. Instead of locking a shell down (Hermes allows most commands by default, so that was only policy), the Support bot gets five tools from a `pokectl` MCP server and the terminal is switched off. The PM and Design-Engineer will be built the same way.
- **Cost is a first-class feature.** Separate Anthropic workspaces with spend caps (`POKE
  Production` $10/month, `Hermes agent` $30/month), a ledger, a cheap model for the high-volume
  bot, and no optimization beyond what the numbers justify.
- **One Telegram bot, role-tagged messages**, because the droplet has 1 GB of memory.
- **Telegram is only for the agents talking to Zach.** All building happens over SSH or the web
  console.
- **Accessibility and motion passes run once, right before deploy**, not on every iteration.
- **Slack was an early proof of concept and was removed** in favor of Telegram.

## What we learned the hard way

- The bot used an em dash despite clear instructions, so rules that matter are enforced in the
  API, not only written in the prompt.
- Two reports of one bug each got marked a duplicate of the other, so duplicate links must point
  to an earlier ticket.
- The bot confidently told a user their grade could be revisited later, which is false. It now
  has a never-guess rule and the true answer in the shared facts.
- A "recent tickets" list returned the oldest tickets, hiding new duplicates.
- Hermes held a dead OAuth login, not a real API key, so we created a proper capped key.
- A test script of mine let a shell run attack strings for real and printed a secrets file into
  a local log. Nothing left the machine, the file was deleted, and the exposed Telegram token and
  agent token were rotated. Lesson: test dangerous commands as data, never inline.
- A Supabase free-tier project auto-pauses when idle and took the app down once.
- Deleting a token file does not revoke the token; revoke it at the provider too.
- I wrongly believed the bot's terminal was allowlist-only. A test showed Hermes allows most
  commands by default and only the deny rules were protecting us. Test a security claim with a
  real battery of commands before writing it down.
- Word-based deny rules block innocent reply text ("Google Doc", "sync"), so program names are
  anchored to the start of the command.

## Timeline

- **2026-10-13** Phase 1 shipped: feedback form, tickets, confirmation email, cost ledger,
  Slack removed, docs written. Supabase project had paused and was resumed. POKE's expiring API
  key replaced and moved into its own capped workspace.
- **2026-10-13 evening** Hermes droplet inspected read-only. Found a dead credential, a
  1 GB machine with no swap, and a wide-open terminal. Swap added, `support` profile built and
  locked down, Google credentials from an earlier proof of concept deleted. Secrets-exposure
  slip, then rotation of the Telegram and agent tokens. Gateway restarted.
- **2026-10-13 night** First live runs: 14 tickets across the happy path, prompt injection,
  pause and resume, a deliberate bad token, a killed worker, a duplicate loop, and an invented
  claim. Each issue found was fixed and re-tested.
- **2026-10-14** Docs and cleanup: backups shredded, SSH access removed, this document written.
  Telegram experience judged not yet minimum viable.

## Resuming this work

For a human: read this file, then [runbook.md](runbook.md) for the commands. For an AI: also
read the project memory notes, then ask Zach which gap to attack before building. To work on the
droplet again, a fresh SSH key must be authorized (access was removed on purpose); see the
runbook's "Removing access" section for how it was done and undone.

House rules that apply everywhere: no em or en dashes in anything users read, plain succinct
language, secrets never pasted into chat (use a hidden prompt on the droplet), plan and get
approval before building, do not commit before Zach has tried it, run the accessibility and
motion pass once right before deploy, and keep cost visible without over-optimizing.

## Glossary

- **Hermes / Hermes Agent:** the open agent runtime on the droplet.
- **Profile:** an isolated Hermes agent with its own personality, settings, model, and tools.
- **Gateway:** the Hermes process that connects to Telegram and runs the dispatcher.
- **Kanban board / dispatcher:** Hermes' shared task list and the loop that starts one profile
  per task. Our tickets become tasks on it.
- **`SOUL.md`:** a profile's written personality and instructions.
- **`pokectl`:** our script; the agents' only way to touch POKE.
- **Draft mode:** replies are stored, not emailed (`AGENT_REPLY_MODE=draft`).
- **Policy:** the shared response windows, tone, and facts the bot reads on every ticket.
- **Ledger:** the `usage_events` table recording tokens and dollars per model call.
