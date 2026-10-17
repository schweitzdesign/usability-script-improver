# POKE agent team: PRD

Plain-language spec for the team of agents that runs POKE's feedback loop from alpha to beta.
Written so future-you can read it in five minutes and know what is going on. It started as a plan
and is now updated to describe what was built, with the places where the build departed from the
plan called out. Diagrams are in [architecture.md](architecture.md). Operating steps are in
[runbook.md](runbook.md). The story and the lessons are in [README.md](README.md).

## What this is

POKE is live as an alpha. It had no way to hear from users and nobody triaging what they said. This
project adds that loop: users send feedback, a small team of AI agents handles it like a tiny product
company would, and Zach (Director of Product) makes the one decision that matters with a single tap. A
yes to a small, safe change is built and deployed automatically.

The agents run on one Hermes instance on a DigitalOcean box, with Telegram as the channel to Zach. POKE
itself (Vercel and Supabase) is the front door and the record of truth.

## Goals

1. Anyone using POKE can send a bug, idea, or note in under a minute. **Done.**
2. Every message gets a human-sounding confirmation and a clear response window. **Done.**
3. Feedback is triaged, grouped, sized, and prioritized without Zach doing it by hand. **Done.**
4. Zach gets one short page per decision and answers yes, no, or ask more. **Done.**
5. A yes becomes a change that ships once checks pass. **Done for small, safe changes** (see the guardrails).
6. We always know what this costs, and it stays inside an alpha-sized budget. **Done.** See Cost.

## Non-goals (for now)

- Accounts, ratings, in-app screenshots, or a public roadmap.
- Multiple humans in the loop. It is Zach and the bots.
- Optimizing cost beyond what the numbers justify. At alpha volume most of it is pennies.
- Any bot taking an irreversible action beyond the narrow, guarded case Zach approved: a Small change
  with no second-approval flag, after his tap.
- Support emailing reporters when their issue ships, a rollback button, and batching several changes.

## The team

Three bots with deliberately separate jobs. The boundaries matter more than the prompts. **No bot has a
shell.** Each gets exactly the tools its role needs from `pokectl mcp --role <name>`, plus the board tools
to finish its own task.

### Support bot

- **Job:** be the voice to the customer and do first-round triage.
- **Model:** Claude Haiku 4.5 (cheap, sees every ticket).
- **Tools:** policy, ticket_get, ticket_recent, ticket_reply, ticket_classify.
- **Outputs:** a reply (one or two sentences, with a fixed greeting and closing added by code), a
  classification (bug, usability issue, feature request, user error, question, or not actionable for
  jokes and spam), a severity, a link to the earlier ticket for duplicates, and triage notes in a fixed
  shape (What, Where, Missing, Duplicates, FAQ proposal).
- **Answers only from facts:** the shared policy in `src/lib/support-policy.ts`. When the facts do not
  cover a question it says so and escalates. It may propose a new FAQ entry for Zach to approve.
- **Never does:** score or prioritize, promise dates beyond the SLA, promise a fix, or ask the user a
  follow-up question (there is no way to receive an answer yet).

### Product Manager bot

- **Job:** decide whether a thing is worth doing, and say so plainly.
- **Model:** Claude Sonnet 5 (scoring and writing are judgment).
- **Tools:** ticket_get, backlog_list, backlog_get, backlog_create, backlog_attach, backlog_update,
  request_assessment, request_followup, budget_get, submit_recommendation.
- **How it works:** it groups reports of the same underlying problem into one backlog **item** (B-005),
  separates the literal ask from the underlying job, writes a problem and a user story, and scores with
  **ICE** (Impact, Confidence, Ease, each 1 to 10, multiplied then divided by 100, computed by the
  database). The plan said RICE; ICE was chosen because Confidence is explicit, so thin evidence honestly
  lowers the rank. It tells Zach in Telegram what it is doing, then hands the item to the engineer, and
  finalizes once the engineer has answered.
- **Outputs:** one **recommendation** per item: make a change (high or lower priority), make no change, or find out
  more first, with why, cost, and a priority score.
- **Never does:** talk to customers, design the fix, estimate the build once the engineer has, or close,
  defer, or drop an item on its own. It recommends. Zach decides.
- **Knowledge:** a map of POKE's real screens and labels, POKE's house style for user-facing text, and
  ideas from Dean Peters' Product Manager Skills (written from scratch, see [credits.md](credits.md)).

### Design-Engineer bot

- **Job:** a full-stack product designer: own what the fix feels like to the person using POKE, and size
  it honestly with real engineering judgment.
- **Model:** Claude Sonnet 5.
- **Tools:** backlog_get, repo_tree, repo_read, repo_search, submit_assessment, answer_followup. The three
  repo tools read a read-only copy of the code at `/opt/poke-repo`, locked to that folder (they refuse
  paths outside it, `.git`, and anything named `.env*`).
- **Outputs (the assessment):** its own stance (change, no change, or investigate), the experience it would
  build in plain language naming real screens and elements, why, risk, size (Small, Medium, Large, meaning
  work only), why that is the right amount of work, four yes or no risk flags (database, dependencies,
  environment, AI grading), optional notes on loading, empty, error, and success states, accessibility, and
  reuse of existing components, and the exact files, each checked to exist.
- **Never does:** write or change code in the assessment stage, invent screens or files, or hide a risk
  flag. It can disagree with the PM, and Zach sees the disagreement.
- **Knowledge:** the code itself, the same screen map and house style, and ideas from the MIT design-engineer
  skill (see [credits.md](credits.md)).

### Director of Product (Zach)

Receives a recommendation card in Telegram with a one-time **Decide** link, opens the decision page, and
taps **Yes**, **No**, or **Ask more**. Also owns the monthly budget number, the SLA wording, and the
alpha-to-beta exit criteria.

## How a piece of feedback moves

1. User submits feedback. A `feedback` row lands as `new`. If they left an email they get the confirmation.
2. Sync claims it (`queued`). Support replies and classifies it: `resolved_by_support`, or `triaged` for a real
   issue. Zach gets one finished card.
3. Sync hands triaged bugs, usability issues, and feature requests to the PM, exactly once.
4. The PM creates or extends a backlog item, scores it, and requests an assessment (item `assessing`).
5. Sync creates the engineer's task, with the PM's finalize task waiting behind it. The engineer reads the
   code and submits the assessment. The PM may ask it one follow-up question per item.
6. The PM submits the recommendation (item `recommended`). Zach gets a card with a Decide link.
7. Yes to a change: item `approved`, and sync starts the build job. Yes to a no-change recommendation
   closes it. Yes to "find out more" keeps the item open for the discovery. No closes it. Ask more reopens it
   for a fresh assessment and recommendation.
8. The build job reports `merged`, `needs_review`, or `failed`. Vercel finishing the Production deploy marks the
   item `shipped`, and Zach is told it is live.

## The decision page and the card

The plan called this "the one-pager". It became a single plain card, written top-down like a news story so
Zach can decide at a glance, with the detail folded away.

1. **The recommendation:** make a change (high or lower priority), make no change, or find out more first. Either priority builds the change as soon as Zach taps Yes; nothing is scheduled for later.
2. **What changes for people:** one sentence beginning "Because...", naming real screens and elements. For a
   change it is the Design-Engineer's wording.
3. **Why we recommend this, what could go wrong with this recommendation, how much work this is, and cost.**
   Everything spelled out, no shorthand.
4. **Flags:** "Needs your second approval" when the change touches the database, dependencies, environment, or
   how the AI grades, and a note when the Design-Engineer saw it differently.
5. **The decision:** Yes, No (when it applies), or Ask more with a note.
6. **Folded detail:** the problem and who it affects, what users said, the technical detail from the engineer
   (files, reuse, states, accessibility, follow-up), and how it was scored.

The same structure is sent to Telegram, composed by code, never by the model.

## Guardrails

- A ticket or item is only processed when its status says it is that bot's turn, so nothing runs twice. Claims
  are conditional updates.
- No bot has a shell. Bots reach POKE data only through the narrow agent API and never hold the database key.
  The build job holds its own narrower token.
- Every bot action is written to an audit trail (`ticket_events`, `backlog_events`).
- Rules enforced in the API, not only in prompts: no em or en dashes, length limits, every recommendation field
  present, the engineer's wording and size used for changes, the PM's Ease inside the band for the engineer's
  size, one follow-up question per item, and single-use, expiring decision links.
- **Automatic shipping happens only when all of these hold:** Zach tapped Yes on a make-a-change recommendation;
  the work is **Small**; the engineer raised **no** second-approval flag and recommended a change; the **guard**
  finds the diff inside the visible-interface folders, under 60 changed lines and 3 files, with no risky code,
  deletion, or rename; and lint, types, and the build pass. Anything else opens a pull request and waits for him.
- In the build job, Claude has no shell and no network, can edit only the interface folders, and cannot edit
  `.github/`. A hard dollar cap applies per run. The checks run in steps that have no API key.
- Switches: `POKECTL_SHIP=off` stops new builds, `gh workflow disable ship.yml` stops the job, `hermes pause`
  stops all bot work.
- Undo: Vercel Instant Rollback, or revert the pull request. The repository's `main` branch is protected from
  force-push and deletion.

## Cost

Two bills, both measured:

1. **What POKE costs to run:** Anthropic calls per grade and chat turn, plus hosting.
2. **What the agent team costs to run:** tokens per run, plus the droplet.

Rules, kept simple on purpose:

- **Measure first.** Every Anthropic call writes a row to `usage_events` (source, model, tokens, estimated
  dollars). Prices live in one file: `src/lib/pricing.ts`.
- **Cap at the source.** Separate Anthropic workspaces with monthly limits: `POKE Production` $10, `Hermes agent`
  $30, and `POKE builder` $10 (the key stored in GitHub for the build job).
- **Cheap model by default.** Strong models only where judgment is the job (PM, Design-Engineer, the build).
- **The funnel is the savings.** Support resolves what it can, so the pricier bots only see tickets that matter.
- **Cost is part of the decision.** Every recommendation shows build cost, running-cost change, and the share of
  the monthly agent budget used.
- **Do not over-optimize.** One lever has earned its place: turning off Hermes' lazy tool loading for the PM and
  the engineer cut the PM's cost about 39 percent.

Measured on 2026-10-17 (the ledger lags real spend by up to 30 minutes):

| What | Measured |
|---|---|
| Support, per ticket | about 2.5 cents |
| PM, per run | about 8 to 13 cents after the cost cut (15 to 19 cents before) |
| Design-Engineer, per assessment | about 33 cents |
| One new item, end to end | roughly 50 cents (intake, assessment, finalize) |
| The build job's Claude step | about 5 cents (a one-comment change), capped at $2 per run |
| Agent team, month to date | $3.51 of $30 (11.7 percent) |

Fixed costs to track (fill in real numbers):

| Item | Today | Note |
|---|---|---|
| DigitalOcean droplet (Hermes) | TBD | 1 vCPU, 1 GB, with a 2 GB swap file |
| Supabase | Free tier | Pauses after about a week idle. Paid tier avoids it; a scheduled ping is the free workaround |
| Vercel | TBD | Hobby or Pro. A bot-authored merge deployed fine on the current plan |
| GitHub Actions | Free for a public repo | |
| Resend | Free tier | Test sender only reaches Zach's own address until a domain is verified |
| Anthropic | Variable | Measured in `usage_events` |

**Monthly alpha budget:** the agent team's cap is $30 (`AGENT_MONTHLY_BUDGET_USD`, default 30). Zach confirms
the number.

## Alpha to beta: exit criteria (Zach to fill in)

Placeholders so the PM has a target to prioritize against:

- [ ] Number of real users who have run a grade: ___
- [ ] Share of grades that users rate as useful (needs a rating feature): ___
- [ ] Open critical bugs: 0
- [ ] Median time from feedback to first reply inside the SLA: ___
- [ ] Monthly run cost under budget for ___ months in a row

## Open questions

- Real SLA numbers. The email promises a first update within 1 business day for bugs and 3 for everything else.
  Edit `src/lib/support-policy.ts` to change it everywhere.
- When to flip `AGENT_REPLY_MODE=send` so Support's replies are emailed for real. It needs a verified sending
  domain first.
- Supabase pause: pay or ping?
- Should Support tell reporters when their issue ships? The plan wanted it; it is not built.
- Whether to extend automatic shipping beyond Small, flag-free changes. Not without a second approval path.

## Phases

| Phase | What | Status |
|---|---|---|
| 0 | These docs | Done |
| 1 | Feedback form, `feedback` table, confirmation email, cost ledger, Slack retired | Shipped |
| 2 | Agent API, Support bot, Telegram cards, usage reporting, separate API keys with spend limits | Shipped. No-shell tool server, readable cards, FAQ, Reply-To |
| 3 | PM bot, Design-Engineer bot, backlog, ICE, decision page | Shipped. Measured costs above |
| 4 | Ship pipeline: CI, build job, guard, live notice, one-tap approval | Shipped for Small, flag-free changes. First automatic change live in about 3 minutes |
| 5 | Evals per bot, adversarial test of the build job's permissions, cost review, alpha-to-beta metrics | Not started |
