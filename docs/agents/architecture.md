# POKE agent team: architecture

Three diagrams. They render on GitHub. Roles and rules are in [PRD.md](PRD.md).

## 1. The big picture

Solid arrows exist today (Phases 1 and 2). Dashed arrows are planned.

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
        support[Support bot, Haiku, pokectl only]
        pm[PM bot]
        de[Design-Engineer bot]
        sync --> kanban --> support
        kanban -.-> pm
        kanban -.-> de
    end

    api[/api/agent, bearer token/]
    poke --- api
    sync -->|poll new tickets| api
    support -->|triage, draft reply| api
    api --> db
    droplet -->|usage report| api
    droplet <-->|Telegram| zach([Zach, Director of Product])
    zach -.->|Yes| gh[GitHub PR]
    gh -.->|checks pass, auto-merge| vercel[Vercel deploy]
    vercel -.-> poke
```

## 2. Life of a ticket

```mermaid
stateDiagram-v2
    [*] --> new: user submits
    new --> triaged: Support classifies
    triaged --> resolved_by_support: user error or question
    triaged --> scored: escalated, PM scores with an estimate
    scored --> proposed: Design-Engineer proposal attached
    proposed --> awaiting_approval: one-pager sent to Zach
    awaiting_approval --> approved: Yes
    awaiting_approval --> wont_do: No
    awaiting_approval --> proposed: Ask more
    approved --> shipped: PR merged and deployed
    resolved_by_support --> [*]
    wont_do --> [*]
    shipped --> [*]
```

## 3. From feedback to shipped

```mermaid
sequenceDiagram
    actor U as User
    participant P as POKE
    participant S as Support bot
    participant M as PM bot
    participant D as Design-Engineer bot
    actor Z as Zach

    U->>P: Submit feedback
    P-->>U: Confirmation email with ticket number and response window
    S->>P: Read new ticket
    S->>S: Classify, check for duplicates
    alt user error or question
        S-->>U: Answer directly
        S->>P: Mark resolved_by_support
    else real issue
        S->>M: Escalate with triage notes
        M->>D: Ask for approach and effort
        D-->>M: Proposal, size, risks
        M->>M: RICE score plus cost box
        M->>Z: One-pager in Telegram
        Z-->>M: Yes, No, or Ask more
        opt Yes
            M->>D: Implement
            D->>P: Open pull request
            Note over P: Checks pass, auto-merge, Vercel deploys
            S-->>U: Tell the user it shipped
        end
    end
```
