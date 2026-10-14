# POKE agent team: PRD

Plain-language spec for the team of agents that will run POKE from alpha to beta.
Written so future-you can read it in five minutes and know what is going on.
Diagrams are in [architecture.md](architecture.md). Setup steps are in [runbook.md](runbook.md).

## What this is

POKE is live as an alpha. It has no way to hear from users and nobody triaging what
they say. This project adds that loop: users send feedback, a small team of AI agents
handles it like a tiny product company would, and Zach (Director of Product) makes
the one decision that matters: ship it, yes or no.

The agents run on one Hermes instance on a DigitalOcean box, reachable through
Telegram. POKE itself (Vercel + Supabase) is the front door and the record of truth.

## Goals

1. Anyone using POKE can send a bug, idea, or note in under a minute.
2. Every message gets a human-sounding confirmation and a clear response window.
3. Feedback is triaged, sized, and prioritized without Zach doing it by hand.
4. Zach gets one short page per decision and answers yes, no, or ask more.
5. A yes becomes a pull request that ships once checks pass.
6. We always know what this costs, and it stays inside an alpha-sized budget.

## Non-goals (for now)

- Accounts, ratings, in-app screenshots, or a public roadmap.
- Multiple humans in the loop. It is Zach and the bots.
- Optimizing cost beyond what the numbers justify. At alpha volume most of it is pennies.
- Any bot taking an irreversible action without Zach's yes.

## The team

Three bots with deliberately separate jobs. The boundaries matter more than the prompts.

### Support bot

- **Job:** be the voice to the customer and do first-round triage.
- **Inputs:** new rows in `feedback`.
- **Outputs:** replies to the customer, a classification (bug, usability issue, feature
  request, user error, question, or not actionable for jokes and spam), a severity, a link
  to the earlier ticket when it is a duplicate, and an internal handoff note.
- **Answers only from facts:** it may only say what the shared policy facts support, and
  escalates honestly ("not sure, a person will follow up") when they do not cover a question.
- **When it is user error or a question:** answers directly, closes the ticket as
  `resolved_by_support`, and does not escalate.
- **Knowledge it needs:** how POKE works, the SLA in `src/lib/support-policy.ts`, a short
  FAQ, tone of voice (POKE is direct and a little provocative, never corporate).
- **Never does:** score or prioritize, promise dates beyond the SLA, promise a fix.
- **Model and budget:** small, cheap model. It sees every ticket, so cheap matters most here.

### Product Manager bot

- **Job:** decide whether a thing is worth doing, and say so with numbers.
- **Inputs:** escalated tickets from Support, plus an effort estimate from the Design-Engineer.
- **Outputs:** a RICE score, a backlog rank, the cost of living with the problem versus the
  cost of fixing it, opportunity cost, a recommendation, and the money side (run-cost
  delta, build cost, share of the monthly budget).
- **Knowledge it needs:** what alpha-to-beta means (the exit criteria below), the backlog,
  the monthly budget, per-user run cost from `usage_events`.
- **Never does:** talk to customers, design the fix, estimate the build.
- **Model and budget:** stronger model, because scoring is judgment. It only sees escalated
  tickets. Starts per ticket; moves to batching only if the cost ledger says it pays.

### Design-Engineer bot

- **Job:** answer "how would we do this and how hard is it".
- **Inputs:** a ticket plus a question from the PM.
- **Outputs:** a design proposal, a technical approach, an effort estimate (S, M, L), risks,
  and the files likely touched. Later, the implementation on approval.
- **Knowledge it needs:** the codebase, the design language (sticker chrome, brand colors,
  motion tokens), the house rules (accessibility, no em dashes in copy).
- **Never does:** prioritize, or ship without the approval gate.
- **Model and budget:** stronger model, used only when the PM asks.

### Director of Product (Zach)

Receives the one-pager in Telegram and replies **Yes**, **No**, or **Ask more**. Also owns
the monthly budget number, the SLA wording, and the alpha-to-beta exit criteria.

## How a ticket moves

1. User submits feedback in the app. A row lands in `feedback` with status `new`. If they
   left an email, they get the confirmation instantly (Phase 1).
2. Support picks it up (`triaged`). User error or question: answered, closed. Otherwise escalated.
3. PM asks Design-Engineer for an estimate, then scores it (`scored`, then `proposed`).
4. The one-pager goes to Zach (`awaiting_approval`).
5. Yes: the bots open a pull request, it merges when checks pass, Vercel deploys (`shipped`).
   No: `wont_do`, and Support tells the customer kindly.

## The one-pager

One screen, same shape every time:

1. **Feedback:** what was reported, how many times, a real quote.
2. **Classification:** bug or usability or feature, severity, who it affects.
3. **Proposal:** the design-engineer's recommended fix in two or three sentences.
4. **RICE:** the four numbers and the total, with one line on each assumption.
5. **Effort and risk:** size, files touched, what could go wrong.
6. **Cost box:** build cost, run-cost change per month, share of monthly budget used and
   what this adds.
7. **Recommendation:** ship, defer, or drop, with a reason.
8. **Buttons:** Yes, No, Ask more.

## Guardrails

- A ticket is only processed when its status says it is that bot's turn (so nothing runs twice).
- Every tool loop has an iteration cap.
- Bots reach POKE data only through a narrow, token-protected agent API (Phase 2). The Hermes
  box never holds the database key.
- Every bot action is written to an audit trail.
- Changes that touch database migrations, dependencies, or environment variables need a
  second approval, even after a yes.
- Shipping rails (Phase 4): required CI checks, a cap on diff size, a preview link in the
  one-pager, and Vercel instant rollback as the undo.

## Cost

Two bills, both measured:

1. **What POKE costs to run:** Anthropic calls per grade and chat turn, plus hosting.
2. **What the agent team costs to run:** tokens per ticket, plus the droplet.

Rules, kept simple on purpose:

- **Measure first.** Every Anthropic call writes a row to `usage_events` (source, model,
  tokens, estimated dollars). Prices live in one file: `src/lib/pricing.ts`.
- **Cap at the source.** Use a separate Anthropic API key for POKE and for Hermes, and set a
  monthly spend limit on each in the Anthropic Console. Confirm the exact control there.
- **Cheap model by default.** Strong models only where judgment is the job (PM, Design-Engineer).
- **The funnel is the savings.** Support resolves what it can, so the pricier bots only see
  tickets that matter.
- **Cost is part of the decision.** The PM includes it in every score and every one-pager.
- **Do not over-optimize.** No caching layers, model routers, or batching until the ledger
  shows a line item worth the time. Flag cost, do not gold-plate savings.

Fixed costs to track (fill in real numbers):

| Item | Today | Note |
|---|---|---|
| DigitalOcean droplet (Hermes) | TBD | Size and monthly price |
| Supabase | Free tier | Pauses after about a week idle. Paid tier avoids it; a scheduled ping is the free workaround |
| Vercel | TBD | Hobby or Pro |
| Resend | Free tier | Check current limits |
| Anthropic | Variable | Measured in `usage_events`; `claude-haiku-4-5` is $1 in and $5 out per million tokens |

**Monthly alpha budget:** TBD (Zach sets this; the PM bot reads it).

## Alpha to beta: exit criteria (Zach to fill in)

Placeholders so the PM has a target to prioritize against:

- [ ] Number of real users who have run a grade: ___
- [ ] Share of grades that users rate as useful (needs a rating feature): ___
- [ ] Open critical bugs: 0
- [ ] Median time from feedback to first reply inside the SLA: ___
- [ ] Monthly run cost under budget for ___ months in a row

## Open questions

- What actually writes the code on a yes: Hermes itself, a headless Claude Code run on the
  droplet, or a GitHub Action? (Decide at Phase 4.)
- Which Hermes features can we lean on: role profiles, skills, scheduling, Telegram buttons?
  (Phase 2 starts by looking at the box.)
- Real SLA numbers. The email currently promises a first update within 1 business day for
  bugs and 3 for everything else. Edit `src/lib/support-policy.ts` to change it everywhere.
- Supabase pause: pay or ping?

## Phases

| Phase | What | Status |
|---|---|---|
| 0 | These docs | Done |
| 1 | Feedback form, `feedback` table, confirmation email, cost ledger, Slack retired | Shipped |
| 2 | Agent API, Support bot, Telegram as the comms gateway, bots report usage, separate API keys with spend limits | Built and tested. Measured cost about 2 cents per ticket. See [runbook.md](runbook.md) |
| 3 | PM bot and Design-Engineer bot | |
| 4 | One-pager, Yes/No/Ask-more in Telegram, ship pipeline with CI | |
| 5 | Evals per bot, cost review, alpha-to-beta metrics | |
