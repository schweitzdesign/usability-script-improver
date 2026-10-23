---
title: "The Agentic Product Team"
slug: poke-agentic-product-team
date: 2026-10-23
summary: "I built a small team of AI agents to run the feedback loop of a live product, with me making one decision, with one tap. A proof of concept for what design leadership looks like when agents do the legwork."
tags: [AI, Product Design, Agents, Accessibility, Design Leadership]
cover: poke-home-page-with-the-three-moves-section.webp
links:
  caseStudy: https://usability-script-improver.vercel.app/about
  demo: https://usability-script-improver.vercel.app/demo
  video: https://www.youtube.com/watch?v=CqLC7IxQvrY
  code: https://github.com/schweitzdesign/usability-script-improver
carousel:
  - image: poke-home-page-with-the-three-moves-section.webp
    alt: "The POKE home page, with the headline Poke your users, learn what's real, and a green section that reads Most usability tests are designed to validate. POKE helps you discover, above a row called Three moves."
    caption: "POKE, a usability script grader I built with Claude Code."
  - image: poke-feedback-form-and-decision-page-recommending-no-change.webp
    alt: "Two screens side by side: POKE's Feedback form, and the decision page where the agent team recommends making no change to a feature request, with the reasons, the risk, and a choice to accept or ask more."
    caption: "The two screens I added: users send feedback on the left, and I make the decision on the right. Sometimes the answer is no change."
---

# I Built the Team to Run My Product

Agents can now triage feedback, design a fix, and ship it. So what is left for a design leader to do? I built a proof of concept to find out: a small team of AI agents that runs the feedback loop of a live product, with one human decision in the middle.

---

## The Setup

POKE is a web app that grades usability test scripts. I built it with Claude Code. Then I built the team to run it: a **Support** bot, a **PM** bot, and a **Design-Engineer** bot. I'm the Director of Product, and I make one decision, with one tap.

---

## How It Works

1. A user reports a problem through the Feedback form.
2. **Support** replies in the product's voice and triages it.
3. **PM** groups duplicates, scores the item, and writes a recommendation in plain language.
4. **Design-Engineer** reads the real code, designs the fix, and flags the risk.
5. I get one card and one tap: Yes, No, or Ask more.
6. If the change is small and safe, a Yes ships it. It is built, checked, merged, and deployed, and Telegram tells me when it is live.

---

## What I Designed

The agents write the code. My work was everything around it.

- **Roles and decision rights.** Who recommends, who decides, and what a bot may never do.
- **Guardrails in code, not prompts.** My bots kept using em dashes after I told them not to, so the API now rejects them. No bot has a shell. Only small, flag-free changes ship by themselves.
- **Decisions written for humans.** The first decision page read like a spec. I sent it back until it said what changes for the person using the product, and what could go wrong if we do it.
- **Cost as a feature.** My cost estimate was off by about 3x. We traced it and cut the PM bot's cost by 39 percent.
- **Accessibility as a standard.** The engineer's brief includes an accessibility note for every interface change. In a live demo, I filed a real bug: the chat Send button was disabled with no explanation. The team recommended keeping it clickable and announcing a message, and the fix went live while I was presenting.

---

## The Results

- **3** agents, **1** human tap.
- **1 minute 48 seconds** from my tap on Yes to the change live in production, on one real run.
- **7 cents** of AI cost for the build step of that change.
- About **$6** in agent spend across the whole project.

To be clear about scope, this is a proof of concept. It handled a few dozen tickets, all written by me or seeded for testing, and small changes only. It shows the loop works, not that it is ready for production traffic. I also have not yet tested its build guardrails against a model that is actively trying to break out.

---

## What I Learned

- **Specificity is the greatest accelerator.** The more exactly I said what I wanted, why, and what I did not want, the better the result.
- **Cost is tangible once you run the whole stack.** At this scale, a 3x miss is pennies. In a real product, it is not.
- **Everything is a trade-off.** Polish or plumbing, readable alerts or fewer bugs. I was managing a team of agent employees: estimating time, watching cost, and choosing what to leave undone.
- **Going end to end once tells you the real effort.** A few days got me a working proof of concept. Doing it well is a sprint, and shipping it to customers is more.

---

## Where It Is Now

I closed the alpha on purpose, because running agents costs money every month and none of it is needed to show the work. The demo and the full case study stay up, and one setting reopens the app.

---

## Go Deeper

- [Read the full case study](https://usability-script-improver.vercel.app/about), with every step and screenshot
- [Try the demo](https://usability-script-improver.vercel.app/demo), which runs on canned data
- [Watch the overview video](https://www.youtube.com/watch?v=CqLC7IxQvrY)
- [See the code](https://github.com/schweitzdesign/usability-script-improver)

---

*Built as part of the Overclock Accelerator, in a cohort with the Project Management Institute (PMI) Software and AI Products team.*
