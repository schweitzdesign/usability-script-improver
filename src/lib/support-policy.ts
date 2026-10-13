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

export function formatTicketNumber(n: number) {
  return `POKE-${String(n).padStart(4, "0")}`;
}

export function firstUpdateWindow(kind: keyof typeof FEEDBACK_KIND_LABEL) {
  return kind === "bug" ? SUPPORT_SLA.bugFirstUpdate : SUPPORT_SLA.otherFirstUpdate;
}
