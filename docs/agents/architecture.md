# POKE agent team: architecture

Four diagrams. They render on GitHub. Roles and rules are in [PRD.md](PRD.md), commands are in
[runbook.md](runbook.md). Everything shown with a solid arrow exists and has run in production.

## 1. The big picture

```mermaid
flowchart LR
    user([User]) -->|feedback form| poke[POKE on Vercel]
    poke -->|insert| db[(Supabase)]
    poke -->|confirmation email| resend[Resend]
    poke -->|every Anthropic call| ledger[(usage_events)]
    ledger --- db

    subgraph droplet[DigitalOcean droplet]
        sync[pokectl sync, every 2 min, no tokens]
        kanban[Hermes kanban and dispatcher]
        support[Support bot, Haiku]
        pm[PM bot, Sonnet]
        de[Design-Engineer bot, Sonnet]
        repo[(read-only copy of the code)]
        sync --> kanban
        kanban --> support
        kanban --> pm
        kanban --> de
        de --- repo
    end

    api[/api/agent, agent token/]
    poke --- api
    sync <-->|poll, claim, report| api
    support -->|triage, reply| api
    pm -->|backlog, recommendation| api
    de -->|assessment| api
    api --> db
    droplet -->|usage report| api
    droplet <-->|plain cards| zach([Zach, Director of Product])

    zach -->|tap Yes on the decision page| decide[/decide/token/]
    decide --> db
    sync -->|workflow_dispatch, item number only| gh

    subgraph gh[GitHub]
        ship[ship.yml: Claude edits, guard, lint, types, build]
        live[live.yml]
        ship -->|small and clean: merge| main[main branch]
        ship -->|anything unusual: pull request| prr[pull request]
    end

    shipapi[/api/ship, build token/]
    poke --- shipapi
    ship -->|read brief, report result| shipapi
    main -->|push| vercel[Vercel deploy]
    vercel --> poke
    vercel -->|Production success| live
    live -->|live| shipapi
```

## 2. Three state machines

A feedback **ticket** belongs to Support. It becomes a backlog **item** once the PM takes it. An
approved item then has a **ship** state.

```mermaid
stateDiagram-v2
    direction LR
    state "Ticket" as T {
        [*] --> new: user submits
        new --> queued: sync claims it
        queued --> triaged: Support, a real issue
        queued --> resolved_by_support: user error, question, or not actionable
    }
```

```mermaid
stateDiagram-v2
    direction LR
    state "Backlog item" as I {
        [*] --> new: PM creates it from a ticket
        new --> assessing: PM asks for an assessment
        assessing --> recommended: PM finalizes
        recommended --> approved: Yes, make the change
        recommended --> rejected: No, or Yes to drop
        recommended --> needs_info: Ask more, or Yes to investigate
        needs_info --> assessing: PM asks again
        approved --> shipped: live in production
    }
```

```mermaid
stateDiagram-v2
    direction LR
    state "Ship state of an approved item" as S {
        [*] --> building: sync starts the build job
        building --> merged: small and clean, merged by the job
        building --> needs_review: unusual, a person reviews the pull request
        building --> failed: guard, checks, or the job failed
        merged --> live: Vercel finished the Production deploy
        needs_review --> live: a person merged it and it deployed
    }
```

## 3. From feedback to live, with the real hops

Each arrow between agents waits for the next 2 minute sync, which is why the whole trip takes minutes.

```mermaid
sequenceDiagram
    actor U as User
    participant P as POKE and Supabase
    participant Y as Sync, every 2 min
    participant S as Support bot
    participant M as PM bot
    participant D as Design-Engineer
    actor Z as Zach

    U->>P: Submit feedback
    P-->>U: Confirmation email
    Y->>S: New ticket becomes a Support task
    S->>P: Reply drafted, ticket classified
    Y->>Z: Support card, once finished
    Y->>M: Triaged bug, usability issue, or feature request
    M->>P: Create or extend an item, request an assessment
    M-->>Z: "PM on POKE-0042: started B-004"
    Y->>D: Assess task, and the PM finalize task waits behind it
    D->>P: Read the code, submit the assessment
    Y->>M: Finalize task is released
    M->>P: One recommendation (may ask the engineer once)
    Y->>Z: Recommendation card with a Decide link
    Z->>P: Tap Yes, No, or Ask more
    opt Yes, make a change
        Y->>Z: Approved, building it now
        Y->>P: Start the ship state
        Note over Y,P: Sync dispatches the ship workflow on GitHub
        P-->>Z: (via sync) live in production, or needs review, or could not be built
    end
```

## 4. Inside the build job

```mermaid
flowchart TD
    start[workflow_dispatch: item number] --> fetch[Fetch the brief from POKE with the build token]
    fetch --> claude[Claude Code edits: no shell, no network, interface folders only]
    claude --> guard{Guard script}
    guard -->|reject: forbidden path, delete, rename, or empty| fail[Report failed, push nothing]
    guard -->|review or ok| checks[lint, types, build: no secrets in these steps]
    checks -->|failed| fail
    checks -->|passed| pr[Commit, push a branch, open a pull request]
    pr --> eligible{Small, no second-approval flag, and guard ok?}
    eligible -->|yes| merge[Squash merge to main]
    eligible -->|no| review[Report needs_review with the reasons]
    merge --> reportmerged[Report merged]
    reportmerged --> deploy[Vercel deploys Production]
    deploy --> livejob[live.yml reads POKE-SHIP B-n from the commit and reports live]
```
