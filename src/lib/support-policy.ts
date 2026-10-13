// One source of truth for what POKE promises people who send feedback.
// The confirmation email imports this today; the Support bot's instructions
// will import it too, so what we promise and what the bot enforces can't drift.
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

export const SUPPORT_TONE =
  "Direct, warm, and a little provocative, like POKE itself. Short sentences, plain words, no corporate hedging. Say what you know and what you don't. Never promise a fix or a date beyond the response windows above. Never use em dashes or en dashes.";

// Facts about POKE the Support bot may rely on when answering users. Keep these
// accurate: if the product changes, change them here.
export const SUPPORT_FAQ = [
  {
    q: "What can I submit?",
    a: "Paste a usability test script, describe what you are testing, or drop a .docx file. Only .docx is supported, up to 5 MB.",
  },
  {
    q: "Do I need an account?",
    a: "No. There are no accounts. An email address is only used if you want a reply to feedback.",
  },
  {
    q: "What does the grade mean?",
    a: "POKE grades a script from F to A+ and lists up to 3 strengths, 3 weaknesses, and 3 critical changes to make before launch.",
  },
  {
    q: "Why did POKE ask me questions instead of grading?",
    a: "If a submission is too thin to grade, POKE walks you through what you want to learn, then drafts tasks and grades those. It never fakes a grade.",
  },
  {
    q: "Can I keep talking after the grade?",
    a: "Yes. After a grade you can chat with POKE about the script to go deeper on what to fix.",
  },
  {
    q: "Is my script saved?",
    a: "Yes. Submissions are stored so POKE can be improved. Do not paste anything confidential.",
  },
] as const;

export function formatTicketNumber(n: number) {
  return `POKE-${String(n).padStart(4, "0")}`;
}

export function firstUpdateWindow(kind: keyof typeof FEEDBACK_KIND_LABEL) {
  return kind === "bug" ? SUPPORT_SLA.bugFirstUpdate : SUPPORT_SLA.otherFirstUpdate;
}
