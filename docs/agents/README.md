# POKE agent team: read this first

The plain-language story of how the agent system works, why it is built this way, what
actually happened while building it, and where it stands. Written for a human coming back
cold and for an AI picking up the work. Deeper detail: [PRD.md](PRD.md) (the plan),
[architecture.md](architecture.md) (diagrams), [runbook.md](runbook.md) (how to operate it),
[demo-bank.md](demo-bank.md) (real problems kept for demos), [credits.md](credits.md).

## The idea in one paragraph

POKE is a web app that grades usability test scripts. As an alpha it had no way to hear from
users. So we built a feedback form, and behind it a small team of AI agents that behave like a tiny
product company: a **Support bot** who answers users and does first-round triage, a **PM bot** who
decides what is worth doing, and a **Design-Engineer bot** who reads the real code and designs the
fix. A human (Zach, the Director of Product) makes the one decision that matters, with one tap on
a plain-language page. If he says yes to a small, safe change, it is built, checked, merged, and
deployed to production on its own, and Telegram tells him when it is live. All three bots and the
shipping pipeline exist and have run in production.

## Who and what is in the system

| Piece | What it is | Where it lives |
|---|---|---|
| **POKE** | The web app. Also the front door for feedback and the system of record. | Vercel (code in this repo) |
| **Supabase** | The database: scripts, tickets, backlog, assessments, an audit trail, a cost ledger. | supabase.com project |
| **Agent API** | A token-protected door into POKE for the bots. They never touch the database. | `src/app/api/agent/*` |
| **Ship API** | A separate, narrower door for the build job: read one brief, report how it went. | `src/app/api/ship/*` |
| **`pokectl`** | One Python script that is the bots' only window into POKE, and also does the timer-run sync. | `ops/hermes/pokectl` |
| **Hermes** | The agent runtime (Nous Research). Runs agents as **profiles**, hands them work through a **kanban board**. Pinned at v0.21.4 on purpose. | A DigitalOcean droplet |
| **Support bot** | Hermes profile, Claude Haiku 4.5. Five tools, no shell. | Droplet, reference copy in `ops/hermes/support/` |
| **PM bot** | Hermes profile, Claude Sonnet 5. Backlog, ICE scoring, recommendations. No shell. | Droplet, reference copy in `ops/hermes/pm/` |
| **Design-Engineer bot** | Hermes profile, Claude Sonnet 5. Reads a read-only copy of the code, proposes the fix. No shell. | Droplet, reference copy in `ops/hermes/eng/` |
| **Decision page** | One page per recommendation with the verdict, the plan, and three choices. | `src/app/decide/[token]/` |
| **Build job** | A GitHub Actions workflow where Claude Code writes the change with no shell, then plain code checks it. | `.github/workflows/ship.yml` |
| **Telegram** | Where the agents talk to Zach, as plain, code-composed cards. | Telegram |
| **Cost ledger** | Every model call (the app's and the bots') with tokens and dollars. | `usage_events` table |
| **Zach** | Director of Product. Decides with one tap. | Telegram and the decision page |

## The life of one piece of feedback

Every hop between agents runs on a 2 minute timer, so the whole trip takes minutes, not seconds.

1. A user clicks **Feedback** in the app and sends a bug, idea, or note. A row lands as `new`, and
   if they left an email they get an automatic "we got it" message.
2. **Sync** (`pokectl sync`, every 2 minutes, no AI) claims it and creates a board task for Support.
3. **Support** reads the policy and the ticket, writes a short reply in POKE's voice, classifies it,
   and either resolves it (user error or question) or marks it **triaged**. About 3 to 5 minutes
   after the user sent it, Zach gets one finished card in Telegram (the user's words, the reply,
   the triage notes).
4. Sync hands every triaged bug, usability issue, or feature request to the **PM**.
5. The **PM** clusters it with similar reports into a backlog **item** (or starts a new one), writes
   the problem and a user story, scores it with ICE, and tells Zach in Telegram what it is doing.
   Then it asks for an assessment and its own task waits.
6. Sync creates the **Design-Engineer's** task. It reads the actual code, decides what the experience
   of the fix should be, sizes the work (Small, Medium, Large), answers four risk flags (database,
   dependencies, environment, AI grading), and lists the files, which are checked to exist.
7. The PM's **finalize** step reads that, sets Ease inside the engineer's band, prices it, and writes
   one **recommendation**: make a change, make no change, or find out more first. Zach gets one
   card with a **Decide:** link.
8. Zach opens the **decision page** and taps Yes, No, or Ask more. The link works once and expires in
   14 days.
9. **Yes to a change:** if it is Small and has no second-approval flag, sync starts the **build job**.
   Claude writes the change, a guard script and lint, types, and the build check it, and it merges
   and deploys by itself. Telegram says "live in production". Anything bigger or flagged becomes a
   pull request for Zach to review. **Ask more** goes back to the PM and the engineer for a new
   recommendation. **No** closes it.

## The bots, in short

**Support.** The voice to the customer. Direct and a little playful, one or two sentences, a fixed
greeting ("Hey there, Poker,") and closing added by code, never guesses, answers only from the shared
facts in `src/lib/support-policy.ts`. Tools: policy, ticket_get, ticket_recent, ticket_reply,
ticket_classify. As-built details are in [runbook.md](runbook.md).

**PM.** Decides whether something is worth doing. ICE scoring (Impact, Confidence, Ease), where thin
evidence honestly lowers the rank. Clusters duplicates. Prices the cost. Never closes or defers on
its own: it recommends, Zach decides. Its instructions borrow ideas from Dean Peters' Product Manager
Skills library, written from scratch (see [credits.md](credits.md)).

**Design-Engineer.** A full-stack product designer: it owns what the fix *feels like* to the person
using POKE and has the engineering skill to size it honestly. Read-only access to the code through three
path-locked tools. It can disagree with the PM, and the card and the page say so when it does.

## What the system enforces in code (not just in prompts)

Bots drift, so the rules that matter are checked by code:

- No em or en dashes, and length limits, on everything a bot writes (the API rejects it).
- A recommendation needs every field. For a change, the engineer's wording, risk, and sizing are the ones
  used. The PM's Ease score must sit inside the band for the engineer's size (Small 8 to 10, Medium
  5 to 7, Large 1 to 4). The PM gets one follow-up question per item, and only one.
- The decision link is stored hashed, works once, and expires.
- A change may auto-merge only if it is Small, the engineer flagged no second approval, the guard says
  ok, and lint, types, and the build pass. The guard (`scripts/ship-guard.mjs`, 10 tests) rejects edits
  outside the visible-interface folders, deletions, and renames, and sends large, shared-building-block,
  or risky-code changes to a human.
- Claude in the build job has no shell, no network, and edit access only to the interface folders. The
  checks run in separate steps that do not have the API key.

## Current status

**Works, tested live:** the form and confirmation email, Support's cards and replies (drafts by default),
the PM's clustering and status messages, the Design-Engineer's code reading (it caught a report whose
premise was false by reading the code), the decision page, the whole path from a tap to "live in
production" (about 3 minutes from the tap, 5 cents of Claude time), and the failure drills (see the
runbook).

**Still manual or open:**
- Support replies are **drafts**. `AGENT_REPLY_MODE=send` in Vercel turns on real emails, and it has not
  been flipped.
- Support does not yet tell the original reporters when their issue ships.
- There is no rollback button. Undo is Vercel Instant Rollback, or revert the pull request.
- No automated tests exist for the app itself, so the engineer says so in its risk when it matters.
- The adversarial test of the build job's permission rules is not done (only the model's own refusal and
  the guard were exercised).
- Hermes' board will not let a running bot create tasks, so the bots *record intent* and the sync creates
  the tasks. This adds up to 2 minutes per hop.

## Why it is built this way (decisions)

- **Use Hermes' own profiles and kanban** instead of building an agent framework.
- **A script, not an AI, moves work between bots and sends messages.** Polling and message layout cost zero
  tokens, and the layout cannot be mangled by a model.
- **Bots go through a narrow API, never the database.** A leaked agent token can read and triage tickets,
  not read or wipe the database. The build job gets an even narrower token.
- **No bot has a shell.** They read text from the public, so they are treated as injectable. Each gets a
  small set of tools from `pokectl mcp --role <name>` and nothing else.
- **One human tap.** Zach's Yes is the only approval, and the system only acts on it automatically for small,
  safe changes.
- **Claude never gets to grade its own work.** A guard script and the build check the result, with no API key
  in those steps.
- **Cost is a first-class feature.** Separate Anthropic workspaces with caps, a ledger, and cheap models for the
  high-volume bot.
- **Accessibility and motion passes run once, right before deploy,** not on every iteration.
- **Slack was an early proof of concept and was removed** in favor of Telegram.

## What we learned the hard way

- Rules that matter are enforced in the API, not only written in the prompt: the bot used an em dash
  despite clear instructions.
- A locked-down shell is only policy. Hermes allows most commands by default, so a test found `curl` allowed
  once word rules were pruned. The fix was removing the shell, not tightening it.
- Hermes will not let a running bot mutate the board ("delegate_task child contexts cannot mutate Kanban
  tasks via the CLI"). We respected that: bots record a request in POKE and the sync, which runs outside any
  bot, creates the tasks.
- Test the wiring, not just the parts: a sync step was written and unit-tested but never called. There is now a
  test (`ops/hermes/test_pokectl.py`) that confirms every pass is wired in.
- A fresh checkout fails `tsc` until Next has generated `PageProps` and `LayoutProps`. CI caught it, and it would
  have failed every automatic build.
- Hermes' lazy tool loading made the PM cost about 39 percent more. Turning it off for the PM and the engineer
  fixed that with the same output quality.
- A reported bug can be wrong. The Design-Engineer read the code and showed the button was not greyed out, so
  the right answer was "make no change".
- Uncommitted work can disappear: something external ran `git reset` to `origin/main` and wiped an edit. Commit
  immediately after each change.
- Pasting SQL into a server terminal runs it as shell commands. SQL goes in the Supabase SQL Editor.
- Deleting a token file does not revoke the token. Revoke it at the provider too.
- Never print or paste secrets: use hidden prompts on the droplet, and pipe secrets from a file into the tool
  that stores them.

## Timeline

- **2026-10-13** Phase 1 shipped: feedback form, tickets, confirmation email, cost ledger, Slack removed.
  Support bot built and locked down on the droplet; first live runs.
- **2026-10-14** Docs and cleanup. Telegram judged not yet useful.
- **2026-10-17 morning** Support made readable: one finished card per ticket, a fixed greeting and closing, a
  16 item FAQ, Reply-To, and the Support bot moved onto a no-shell tool server.
- **2026-10-17 afternoon** PM bot, backlog, ICE scoring, decision page, and the Design-Engineer with one
  follow-up round. Cost cut about 39 percent. A real production test clustered two duplicate tickets and the
  engineer correctly pushed back on a false premise.
- **2026-10-17 evening** The ship pipeline: CI, the build job, the guard, the live notice, and the Ship API. The
  first automatic change went from approval to live in production in about 3 minutes. Two safety drills passed
  (an injection attempt, and a change that must not auto-merge).

## Resuming this work

For a human: read this file, then [runbook.md](runbook.md) for commands and the kill switches. For an AI:
also read the project memory notes. Before touching the droplet, diff the live files against the repo (the
runbook has the command), and note that access to the droplet was removed on purpose. A fresh key must be
authorized (see "Removing access" in the runbook).

House rules that apply everywhere: no em or en dashes in anything users read, plain succinct language, secrets
never pasted into chat, plan and get approval before building, do not commit user-facing changes before Zach has
tried them, run the accessibility and motion pass once right before deploy, and keep cost visible without
over-optimizing.

## Glossary

- **Hermes / Hermes Agent:** the open agent runtime on the droplet.
- **Profile:** an isolated Hermes agent with its own instructions, model, and tools.
- **Gateway:** the Hermes process that connects to Telegram and runs the dispatcher.
- **Kanban board / dispatcher:** Hermes' shared task list and the loop that starts one profile per task.
- **`SOUL.md`:** a profile's written instructions.
- **`pokectl`:** our script: the agents' only window into POKE, and the timer-run sync.
- **MCP:** the protocol that lets `pokectl` hand a bot exactly the tools its role needs.
- **Item (B-005):** a backlog entry that groups reports of the same problem.
- **ICE:** Impact, Confidence, Ease, each 1 to 10, multiplied then divided by 100.
- **Assessment:** the Design-Engineer's structured answer for one item.
- **Stance:** the engineer's own view: change, no change, or investigate.
- **Decision link:** the one-time link on a recommendation card.
- **Ship job:** the GitHub workflow that builds one approved change.
- **Guard:** the script that checks the change before anything is pushed.
- **Ledger:** the `usage_events` table recording tokens and dollars per model call.
