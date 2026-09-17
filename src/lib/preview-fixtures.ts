import { LOW_INFO_OPENING_MESSAGE, type GradeResult } from "@/lib/grading";
import type { ChatMessage } from "@/lib/chat";

// Canned data for the dev-only preview panel — lets you look at every
// visual state of the grade/chat UI without spending an Anthropic call.
// Never used in the real grading path.

export const PREVIEW_SCRIPT_TEXT =
  "Moderated usability test, 5 participants. Testing whether users can complete checkout without contacting support: log in, add an item to cart, apply a promo code, and complete checkout. Ask participants to narrate what they expect at each step and why.";

export type GradeFixtureKey = "A" | "B" | "C" | "D" | "F";

export const GRADE_FIXTURES: Record<GradeFixtureKey, GradeResult> = {
  A: {
    grade: "A",
    summary:
      "Sharp objective, clean behavioral tasks, and questions that probe reasoning instead of opinion. This is close to ready to run.",
    strengths: [
      "Learning objective is specific and falsifiable: can users complete checkout without contacting support.",
      "Tasks are behavioral, not hypothetical: real login, real cart, real payment flow.",
      "Follow-up questions ask 'why' and 'walk me through', not 'did you like it'.",
    ],
    weaknesses: ["Success criteria could be tighter: define what counts as a failed checkout attempt."],
    criticalChanges: [],
    openingMessage:
      "This is one of the cleaner scripts I've seen: real tasks, real reasoning probes. Want to talk about how you'll define a failed attempt before you run it?",
  },
  B: {
    grade: "B-",
    summary:
      "Clear goal and real tasks, but the debrief question invites opinions instead of observed behavior.",
    strengths: [
      "Learning objective is concrete: can new users find the export button unaided.",
      "Task sequence mirrors the real workflow, not a feature checklist.",
      "Moderated format lets you catch confusion live.",
    ],
    weaknesses: [
      "'What did you expect to happen' collects post-hoc stories, not real-time reasoning.",
      "No success metric defined: is it about clicks, time, or just completion.",
      "Five participants is thin for a discoverability task.",
    ],
    criticalChanges: [
      "Replace the expectation question with 'walk me through what you're doing and why' asked live.",
    ],
    openingMessage:
      "You've got a real task and a clear goal, but you're collecting opinions after the fact instead of watching people get stuck. Want to fix the debrief question first?",
  },
  C: {
    grade: "C",
    summary:
      "The tasks exist, but there's no clear learning objective tying them together, so it reads like a feature checklist.",
    strengths: ["Tasks are at least concrete actions, not vague prompts."],
    weaknesses: [
      "No stated learning objective: unclear what decision this test is meant to inform.",
      "Questions ask participants to rate features instead of narrating behavior.",
      "Tasks jump between unrelated parts of the product with no throughline.",
    ],
    criticalChanges: [
      "Write down the one decision this test needs to inform before touching the tasks.",
      "Cut or merge tasks that don't serve that decision.",
    ],
    openingMessage:
      "This reads like a list of things to click, not a test with a purpose. What's the one decision you're actually trying to make here?",
  },
  D: {
    grade: "D",
    summary: "This script is built to confirm a decision that's already been made, not to learn anything new.",
    strengths: [],
    weaknesses: [
      "Every question is phrased to invite agreement: 'don't you think this is easier?'",
      "No task asks participants to actually attempt anything unassisted.",
      "Screening criteria seem designed to only admit people who'll respond well.",
    ],
    criticalChanges: [
      "Rewrite every leading question as a neutral, observable task.",
      "Remove screening that filters out anyone likely to struggle.",
      "Decide what you'd need to see to change your mind, then test for that.",
    ],
    openingMessage:
      "I'll be direct: this is validation theater. Every question here is built to get a 'yes.' What decision are you actually willing to reverse based on what you learn?",
  },
  F: {
    grade: "F",
    summary: "There's no real task here, no objective, and nothing a participant could meaningfully fail at.",
    strengths: [],
    weaknesses: [
      "No learning objective stated anywhere in the script.",
      "Questions are all opinion-based: 'do you like this', 'is this easy'.",
      "No task a participant could actually attempt or fail.",
    ],
    criticalChanges: [
      "Start over: write down what you're trying to learn before writing a single question.",
      "Replace every opinion question with a real task.",
    ],
    openingMessage: "There's not enough here to call this a usability test yet. What's the one thing you're actually trying to find out?",
  },
};

export const LOW_INFO_FIRST_MESSAGES: ChatMessage[] = [
  { role: "assistant", content: LOW_INFO_OPENING_MESSAGE },
];

export const LOW_INFO_LONG_MESSAGES: ChatMessage[] = [
  { role: "assistant", content: LOW_INFO_OPENING_MESSAGE },
  { role: "user", content: "I guess I just want to know if people like the new design." },
  {
    role: "assistant",
    content:
      "'Like' is an opinion, not a decision. What would you actually change based on the answer: ship it, rework it, or scrap it?",
  },
  { role: "user", content: "Probably whether we ship the new onboarding flow or keep the old one." },
  {
    role: "assistant",
    content: "Good, that's a real decision. Is this moderated, or will people run through it on their own?",
  },
  { role: "user", content: "Not sure yet, we haven't decided." },
  {
    role: "assistant",
    content:
      "That's worth deciding first since it changes what you can ask. Moderated, you can probe live. Unmoderated, the tasks need to speak for themselves. Which fits your timeline?",
  },
];
