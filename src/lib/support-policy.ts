// One source of truth for what POKE promises people who send feedback.
// The confirmation email imports this today; the Support bot reads it through
// `pokectl policy`, so what we promise and what the bot enforces can't drift.
export const SUPPORT_SLA = {
  acknowledge: "right away",
  bugFirstUpdate: "1 business day",
  otherFirstUpdate: "3 business days",
} as const;

export const FEEDBACK_KIND_LABEL = {
  bug: "bug report",
  idea: "idea",
  other: "note",
} as const;

// ---- The shape of every reply ----------------------------------------------
// The bot writes only the body. The greeting and the closing are added by code
// so they are identical every time and can't be forgotten or doubled.
export const REPLY_GREETING = "Hey there, Poker,";
export const REPLY_CLOSING =
  "If that doesn't answer it or misses the mark, just reply to this email and a person will take a look.";
export const REPLY_BODY_MAX_CHARS = 300;

/** Returns a message the bot can act on if the body breaks a reply rule, or null if it's fine. */
export function validateReplyBody(body: string): string | null {
  if (/[–—]/.test(body)) {
    return "Replies can't contain em dashes or en dashes. Rewrite using commas, periods, or colons, then try again.";
  }
  if (body.length > REPLY_BODY_MAX_CHARS) {
    return `Keep the reply to one or two sentences, under ${REPLY_BODY_MAX_CHARS} characters. The greeting and closing are added for you.`;
  }
  if (/^\s*(hey|hi|hello|dear)\b/i.test(body)) {
    return `Don't write a greeting. "${REPLY_GREETING}" is added for you. Start with the answer.`;
  }
  if (/reply to this email/i.test(body)) {
    return "Don't write the closing line about replying. It is added for you.";
  }
  return null;
}

/** The full text a user receives (and the card shows). */
export function composeSupportReply(body: string) {
  return `${REPLY_GREETING}\n\n${body.trim()}\n\n${REPLY_CLOSING}`;
}

// ---- Voice -----------------------------------------------------------------
export const SUPPORT_TONE =
  "Direct and a little playful, like POKE itself: plain words, a light touch of attitude, never corporate or stiff. Say what you know and what you don't. Write one or two short sentences, under 300 characters, and start with the answer or the acknowledgment, not a greeting: the greeting and a closing line inviting a reply are added for you, so never write them. Never promise a fix or a date beyond the response windows above. Never use em dashes or en dashes.";

// Examples steer tone better than adjectives do. "good" is the target; "bad" is what to avoid.
export const SUPPORT_EXAMPLES = [
  {
    situation: "A clear bug report",
    good: "Good catch, that overlap is a real bug and it's logged. Expect an update within 1 business day.",
    bad: "Thank you for contacting support. Your ticket has been received and will be reviewed in due course.",
  },
  {
    situation: "A question the facts answer",
    good: "Not yet. There are no accounts or saved history, so copy what you need before you leave.",
    bad: "Yes, absolutely! You can come back to your grade anytime.",
  },
  {
    situation: "A question the facts do not cover",
    good: "Honest answer: I'm not sure, so I've passed it to a person who will follow up.",
    bad: "I believe that's probably supported, but I can't say for certain.",
  },
  {
    situation: "An angry user",
    good: "Fair frustration, a grade with no explanation isn't much use. I've flagged it so a person can look at it.",
    bad: "We apologize for any inconvenience this may have caused.",
  },
  {
    situation: "Praise",
    good: "Glad it landed. Brutally honest grades are the whole point.",
    bad: "Thank you so much for your kind feedback! We appreciate you!",
  },
] as const;

// ---- Facts the bot may rely on ---------------------------------------------
// Keep these accurate: a wrong fact becomes a wrong promise. Anything not listed
// here (pricing, training on submitted scripts, languages, security details) is
// deliberately absent so the bot escalates instead of guessing.
export const SUPPORT_FAQ = [
  {
    q: "What is POKE?",
    a: "POKE grades usability test scripts and helps you sharpen them before you run them with real participants. It reviews the script, not your product or design.",
  },
  {
    q: "What can I submit?",
    a: "Paste a script, describe what you are testing, or drop a .docx file.",
  },
  {
    q: "Which file types work?",
    a: "Only .docx, up to 5 MB. For anything else, such as a PDF or a Google Doc, copy the text and paste it in.",
  },
  {
    q: "How long can a script be?",
    a: "POKE reviews the first 6,000 characters. If yours is longer, the rest is cut off and the grade says so.",
  },
  {
    q: "What if I only have a rough idea?",
    a: "If a submission is too thin to grade (under about 25 words), POKE asks guiding questions about what you want to learn, drafts tasks, and grades those. It never fakes a grade.",
  },
  {
    q: "What does the grade mean?",
    a: "F to A+. An A+ is ready to run today. A D means the script mostly exists to confirm a decision already made. It comes with up to 3 strengths, 3 weaknesses, and 3 critical changes.",
  },
  {
    q: "What is a critical change?",
    a: "Something that would make your results misleading or unusable if you ran the test as is, like leading questions, no clear learning objective, or tasks that hand the participant the answer.",
  },
  {
    q: "Who or what grades it?",
    a: "An AI model (Claude) reviews the script against a rubric: a clear learning objective, behavioral tasks that don't lead, and questions that probe reasoning instead of asking for opinions. It is a sharp second opinion, not a verdict.",
  },
  {
    q: "Can I keep talking after the grade?",
    a: "Yes. After a grade you can chat with POKE about the script to go deeper on what to fix.",
  },
  {
    q: "Do I need an account?",
    a: "No. There are no accounts. An email address is only used if you want a reply to feedback.",
  },
  {
    q: "Can I save my graded script and come back to it later?",
    a: "Not yet. There are no accounts or saved history, so a grade only lives on the page while it is open. Copy what you need before you leave.",
  },
  {
    q: "Is my script saved or shared?",
    a: "Submissions are stored so POKE can be improved, and the text is sent to an AI service to be graded. Do not paste anything confidential.",
  },
  {
    q: "Does POKE recruit participants or run the test sessions?",
    a: "No. POKE helps you write and sharpen the test. You run it yourself.",
  },
  {
    q: "Moderated or unmoderated?",
    a: "POKE leans toward unmoderated, task-based tests, because a moderator can unintentionally bias what participants do.",
  },
  {
    q: "What happens after I send feedback?",
    a: "You get a ticket number and, if you left an email, a confirmation. First update within 1 business day for bugs and 3 business days for anything else.",
  },
  {
    q: "How do I reach a person?",
    a: "Reply to any email from POKE support and a person will take a look.",
  },
] as const;

export function formatTicketNumber(n: number) {
  return `POKE-${String(n).padStart(4, "0")}`;
}

export function firstUpdateWindow(kind: keyof typeof FEEDBACK_KIND_LABEL) {
  return kind === "bug" ? SUPPORT_SLA.bugFirstUpdate : SUPPORT_SLA.otherFirstUpdate;
}
