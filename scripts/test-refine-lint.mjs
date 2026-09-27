// Isolated test of the deterministic lintTaskWording() layer.
// Run with: npx tsx scripts/test-refine-lint.mjs (or node after building)
// Not part of the app build — scratch verification only, per the plan.

const cases = [
  {
    label: "leading bias",
    text: "Easily find the export button and download your report.",
    expect: ["leading"],
  },
  {
    label: "opinion-framed",
    text: "What do you think of the new dashboard layout?",
    expect: ["opinion"],
  },
  {
    label: "hand-holding",
    text: "Click the menu, then select settings, then go to billing, then click update.",
    expect: ["hand-holding"],
  },
  {
    label: "colloquial",
    text: "Go find that cool new feature we added, it's awesome!",
    expect: ["colloquial"],
  },
  {
    label: "clean task",
    text: "Find and export last month's invoice as a PDF.",
    expect: [],
  },
  {
    label: "rambling / brevity",
    text: "So imagine you just got back from a long trip and you're checking your email inbox and you notice there are a bunch of unread messages piling up and you want to go through them one by one and figure out which ones need a reply today.",
    expect: ["brevity"],
  },
];

// Inline copy of the regex sets (kept in sync manually for this scratch
// check — the real source of truth is src/lib/tools/refine-task.ts).
const OPINION_PATTERNS = [/\bwhat do you think\b/i, /\bhow do you feel\b/i, /\bdo you like\b/i, /\bwould you use\b/i, /\brate how\b/i, /\bon a scale of\b/i, /\bhow satisfied\b/i, /\bdo you find\b/i, /\bis this (easy|hard|intuitive|confusing)\b/i, /\bwhat('s| is) your (opinion|impression|first reaction)\b/i];
const LEADING_PATTERNS = [/\beasily\b/i, /\bsimply\b/i, /\bquickly\b/i, /\bintuitively\b/i, /\bobviously\b/i, /\bclearly\b/i, /\bconveniently\b/i, /\beffortlessly\b/i, /\bseamlessly\b/i, /\binstantly\b/i, /\bjust (tap|click|find|select|hit|press)\b/i, /\bof course\b/i, /\bshould (only |just )?take (only )?(a )?(second|moment|minute)s?\b/i];
const HANDHOLD_PATTERNS = [/\bclick\b/gi, /\bthen\b/gi, /\bnext\b/gi, /\bafter that\b/gi, /\bnavigate to\b/gi, /\bgo to\b/gi, /\bselect\b/gi, /\btap on\b/gi];
const COLLOQUIAL_PATTERNS = [/\bkinda\b/i, /\bgonna\b/i, /\bwanna\b/i, /\bstuff\b/i, /\bawesome\b/i, /\bsuper\b/i, /\bcool\b/i, /\bbasically\b/i, /!/];

function firstMatch(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m;
  }
  return null;
}

function lintTaskWording(taskText) {
  const findings = [];
  if (firstMatch(taskText, OPINION_PATTERNS)) findings.push("opinion");
  if (firstMatch(taskText, LEADING_PATTERNS)) findings.push("leading");
  const handholdCount = HANDHOLD_PATTERNS.reduce((c, p) => c + (taskText.match(p)?.length ?? 0), 0);
  if (handholdCount >= 3) findings.push("hand-holding");
  if (COLLOQUIAL_PATTERNS.some((p) => p.test(taskText))) findings.push("colloquial");
  const sentenceCount = (taskText.match(/[.!?]+/g) ?? []).length;
  const wordCount = taskText.trim().split(/\s+/).filter(Boolean).length;
  if (sentenceCount > 2 || wordCount > 45) findings.push("brevity");
  return findings;
}

let pass = 0;
for (const c of cases) {
  const got = lintTaskWording(c.text);
  const ok = JSON.stringify(got.sort()) === JSON.stringify(c.expect.sort());
  console.log(`${ok ? "PASS" : "FAIL"} — ${c.label}: got [${got.join(", ")}], expected [${c.expect.join(", ")}]`);
  if (ok) pass++;
}
console.log(`\n${pass}/${cases.length} passed`);
