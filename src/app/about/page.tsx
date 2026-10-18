import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/utils";
import { IMAGES, type ImageKey } from "./images";

const TITLE = "I built an app. Then I built the team to run it.";
const DESCRIPTION =
  "A case study from my capstone: AI agents that triage feedback, design the fix, and ship it to a live product, with one human tap in the middle.";

export const metadata: Metadata = {
  metadataBase: new URL("https://usability-script-improver.vercel.app"),
  title: `${TITLE} | POKE`,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/about",
    siteName: "POKE",
    type: "article",
    images: [{ url: "/about/og.jpg", width: 1200, height: 630, alt: "The POKE home page and its three moves." }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/about/og.jpg"] },
};

type Tone = "forest" | "vermilion" | "chartreuse";

const DOT: Record<Tone, string> = {
  forest: "bg-forest",
  vermilion: "bg-vermilion",
  chartreuse: "bg-chartreuse",
};

const BADGE: Record<Tone, string> = {
  forest: "bg-forest text-bone -rotate-3",
  vermilion: "bg-vermilion text-ink rotate-2",
  chartreuse: "bg-chartreuse text-ink -rotate-2",
};

const TONES: Tone[] = ["forest", "vermilion", "chartreuse"];

/** A chapter. The heading is the visual key for the talk, so it stays big and plain. */
function Chapter({
  id,
  tone,
  title,
  children,
}: {
  id: string;
  tone: Tone;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="scroll-mt-8 space-y-5 border-t pt-12">
      <h2 id={id} className="font-display flex items-baseline gap-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        <span aria-hidden="true" className={cn("border-ink relative top-[0.05em] inline-block size-[0.7em] shrink-0 rounded-full border-[3px]", DOT[tone])} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-lg leading-relaxed">{children}</p>;
}

/** One screenshot with its caption. Tall, narrow phone shots are kept narrow and centered. */
function Fig({
  name,
  alt,
  caption,
  narrow = false,
  priority = false,
}: {
  name: ImageKey;
  alt: string;
  caption: React.ReactNode;
  narrow?: boolean;
  priority?: boolean;
}) {
  const img = IMAGES[name];
  return (
    <figure className="mb-8 space-y-3">
      <div className={cn("overflow-hidden rounded-xl ring-1 ring-foreground/15", narrow && "mx-auto max-w-sm")}>
        <Image
          src={img.src}
          width={img.width}
          height={img.height}
          alt={alt}
          priority={priority}
          sizes={narrow ? "(min-width: 640px) 384px, 100vw" : "(min-width: 768px) 720px, 100vw"}
          className="h-auto w-full"
        />
      </div>
      <figcaption className="text-muted-foreground text-sm leading-relaxed">{caption}</figcaption>
    </figure>
  );
}

/**
 * The overview video that sits at the top of the page. Paste the embed link (for example a Loom
 * or YouTube "embed" URL) between the quotes. While it is empty, nothing is shown.
 */
const OVERVIEW_VIDEO_URL = "";
const OVERVIEW_VIDEO_TITLE = "Overview of the POKE agent team, from a user’s report to a live fix";
const OVERVIEW_VIDEO_CAPTION =
  "The whole project in one video: a user reports a problem, the team triages it, I tap Yes, and the fix goes live.";

function OverviewVideo() {
  return (
    <figure className="mb-8 space-y-3">
      <div className="aspect-video overflow-hidden rounded-xl ring-1 ring-foreground/15">
        <iframe
          src={OVERVIEW_VIDEO_URL}
          title={OVERVIEW_VIDEO_TITLE}
          loading="lazy"
          allow="fullscreen; picture-in-picture"
          allowFullScreen
          className="size-full"
        />
      </div>
      <figcaption className="text-muted-foreground text-sm leading-relaxed">{OVERVIEW_VIDEO_CAPTION}</figcaption>
    </figure>
  );
}

const STATS = [
  { value: "3", label: "bots on the team: Support, PM, and Design-Engineer" },
  { value: "1", label: "human tap, mine, is the only approval" },
  { value: "1m 48s", label: "from my tap on Yes to the change being live in production" },
];

type Step = { title: string; body: React.ReactNode; fig: React.ReactNode };

const STEPS: Step[] = [
  {
    title: "Plan it backwards from the demo",
    body: "I asked a different question this time: what small, real problem could I show getting fixed on the live site? Then I planned everything needed to make that one demo work.",
    fig: (
      <Fig
        name="ship-plan"
        narrow
        alt="The plan for shipping a change automatically, listing the decisions I made and the demo set."
        caption="The plan, written before any code. It named the problem I would use: a button on phones that is shorter than it should be."
      />
    ),
  },
  {
    title: "Measure the problem",
    body: "Before I touched anything, I measured it. On a phone, the Feedback button is 36 pixels tall and the POKE logo link is 32. Most touch guidelines say 44.",
    fig: (
      <Fig
        name="ship-before"
        alt="The browser console showing two heights: the POKE logo link at 32 and the Feedback button at 36."
        caption="Before: 32 and 36. The red errors are from a browser extension, not the site."
      />
    ),
  },
  {
    title: "File the ticket",
    body: "I sent it through the real Feedback form, the way any user would. The Support bot answered in POKE’s voice and triaged it.",
    fig: (
      <Fig
        name="ship-support-card"
        narrow
        alt="A Telegram card showing the ticket text, the Support bot’s reply, and its triage notes."
        caption="One card per ticket: what the user said, what the bot replied, and why it triaged it that way."
      />
    ),
  },
  {
    title: "The PM picks it up",
    body: "The PM bot told me it had started a backlog item and what it planned to do next. That message is on purpose: it is how I keep the employee honest.",
    fig: (
      <Fig
        name="ship-pm-status"
        narrow
        alt="A Telegram message from the PM bot saying it started item B-022 and would send it to the Design-Engineer."
        caption="A status message the PM cannot forget to send, because code sends it, not the model."
      />
    ),
  },
  {
    title: "The recommendation arrives",
    body: "The Design-Engineer read the code, worked out the fix, and the PM wrote it up: what would change for people, why, what could go wrong, how much work it is, and what it costs.",
    fig: (
      <Fig
        name="ship-recommendation"
        narrow
        alt="A Telegram card with a recommendation to make both targets easier to tap, with the reasoning, risk, work, and cost. The decision link is blacked out."
        caption="The decision link is blacked out on purpose: anyone holding it could make the decision."
      />
    ),
  },
  {
    title: "One tap",
    body: "The link opens a plain page with the verdict up top and the detail folded away. I chose Yes.",
    fig: (
      <Fig
        name="ship-decision-page"
        narrow
        alt="The decision page for the Feedback button item, with the recommendation, reasons, and three choices."
        caption="The same recommendation as a page, with Yes, No, or Ask more. This is the whole approval process."
      />
    ),
  },
  {
    title: "Approved, then live",
    body: "Telegram said it was building it. About two minutes later it said the change was live in production. Nobody opened an editor.",
    fig: (
      <Fig
        name="ship-approved-live"
        narrow
        alt="Two Telegram messages: Approved, building it now, and then, two minutes later, live in production with a link to the pull request."
        caption="3:54 PM: approved. 3:56 PM: live. The message links to exactly what changed."
      />
    ),
  },
  {
    title: "The change, in public",
    body: "Behind that message, a bot wrote a three-line change, checked it, opened a pull request, merged it, and Vercel deployed it. Claude’s part of the work cost 7 cents.",
    fig: (
      <Fig
        name="ship-pull-request"
        alt="A merged GitHub pull request by the GitHub Actions bot titled Feedback button and POKE logo too small to tap reliably on mobile, with 2 files changed."
        caption="Two files, three lines added and three removed. The pull request is the receipt."
      />
    ),
  },
  {
    title: "Measure it again",
    body: "I hard-refreshed the live site and ran the same measurement. Both now read 44. The bug was reported, fixed, and verified, and I never wrote a line.",
    fig: (
      <Fig
        name="ship-after"
        alt="The browser console showing both the POKE logo link and the Feedback button at 44 pixels tall."
        caption="After: 44 and 44, on the live site."
      />
    ),
  },
];

const SAFETY = [
  {
    title: "No bot has a shell.",
    body: "They read text from the public, so I assume someone will try to trick them. Each bot gets a short list of tools and nothing else. There is no command line to abuse.",
  },
  {
    title: "Rules live in code, not in prompts.",
    body: "My bots kept using em dashes after I told them not to. So now the API rejects them. Lengths, required fields, and one-use links are enforced the same way.",
  },
  {
    title: "Only small, safe changes ship by themselves.",
    body: "The work has to be Small, the engineer has to flag nothing risky, and the change has to stay inside the visible interface. Anything bigger becomes a pull request for me.",
  },
  {
    title: "The builder does not grade its own work.",
    body: "After Claude edits, a separate script checks what changed, then lint, types, and the build run in steps that do not have the API key.",
  },
  {
    title: "I can stop it in one line.",
    body: "There is a switch to stop new builds, one to stop the build job, and one to pause every bot. Each AI account has a monthly spending cap.",
  },
];

const WRONG = [
  "Claude and I guessed the agents would cost about a third of what they did. The estimate was off by about 3x, so we found the cause (extra tool-loading steps) and cut the PM’s cost by about 39 percent.",
  "We assumed a locked-down shell was safe enough. A real test showed it wasn’t, so we removed the shell entirely.",
  "The agent platform would not let a running bot create tasks. We could have sidestepped that rule. Instead we redesigned the hand-off so a plain script does it.",
  "A fresh copy of the code failed a type check that passed on my machine. The automatic checks caught it before it could break every automatic build.",
  "One card said “make this change later,” and the change shipped immediately. The label promised a delay the system doesn’t deliver, so we changed the wording to “lower priority.”",
];

const LEARNED = [
  {
    title: "I got a real sense of time.",
    body: "About a day or two for the first web app, half a day to spin up the first agent, and another day to get the other agents working together. That is what a proof of concept costs. How good it is, and how many bugs are left, is a separate question.",
  },
  {
    title: "Running the whole stack makes cost tangible.",
    body: "In enterprise product design, the numbers are abstracted away. They are big, someone else manages them, and they carry a lot of complexity. Here I watched real numbers on my own screen, and my estimate for what each ticket would cost was off by about 3x. At this scale it is pennies, but now I can see how wrong a 3x miss would be in a real product.",
  },

  {
    title: "Everything is a trade-off.",
    body: "Do I polish the experience, or finish the plumbing first? Do I make the Telegram messages easier for my support team to read, or fix the bugs so those tickets never reach them? Those are the calls you make when you manage the whole business, and here I was managing a team of agent employees: estimating time, watching cost, and choosing what to leave undone.",
  },
  {
    title: "Specificity is the greatest accelerator.",
    body: "The more exactly I said what I wanted, why I wanted it, and what I did not want, the better the result.",
  },
  {
    title: "Demo-driven design keeps a proof of concept honest.",
    body: "At one point the build felt stretchy, so I picked a small, real, visible bug and made everything serve that demo. The goal was to prove the idea, not to ship it, live with it, and maintain it. It is the same situation as convincing a board, or answering a stakeholder request without pulling the team off their work.",
  },
  {
    title: "Going end to end once tells you the real effort.",
    body: "A rough proof of concept shows you what it would take to do it well, and what it would take to improve it, turn it into a product, and sell it. It matches what I see in class. A 40 minute demo can make something work, but most things take about half a day to really work, and a dedicated sprint to work pretty well. That is a useful way to estimate.",
  },

  {
    title: "The technical lessons, in one line.",
    body: "Plan first, verify by running it, make the bots’ work readable, keep a human tap on every decision, and treat cost as a feature.",
  },
];

export default function AboutPage() {
  return (
    <>
      <header className="border-border border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md outline-none focus-visible:ring-2">
            <Wordmark size="sm" />
          </Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium outline-none focus-visible:ring-2">
            Try POKE
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:py-16">
        <article className="space-y-12">
          <header className="space-y-5">
            <p className="text-forest font-display text-sm font-semibold">A capstone case study</p>
            <h1 className="font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">{TITLE}</h1>
            <p className="text-muted-foreground text-xl leading-relaxed text-pretty">
              A feedback loop where AI agents triage reports, design the fix, and ship it to a live product, with one human tap in the middle.
            </p>
            <p className="text-muted-foreground text-sm">Zach Schweitzer · October 2026</p>
            {OVERVIEW_VIDEO_URL && <OverviewVideo />}
            <Fig
              name="poke-home"
              priority
              alt="The POKE home page, with the headline Poke your users, learn what’s real, next to the section that reads Most usability tests are designed to validate. POKE helps you discover."
              caption="POKE, the app this whole story is about."
            />
          </header>

          <Chapter id="short-version" tone="forest" title="The short version">
            <P>
              POKE is a web app that grades usability test scripts. I built it with an AI coding assistant. For my capstone, the
              assignment was to put AI agents to work running a website, so I built a small team to run POKE: a Support bot, a PM
              bot, and a Design-Engineer bot. I’m the Director of Product. I make one decision, with one tap.
            </P>
            <dl className="grid gap-6 py-2 sm:grid-cols-3">
              {STATS.map((s, i) => (
                <div key={s.value} className="space-y-1">
                  <dt className={cn("border-ink font-display inline-flex min-w-14 items-center justify-center rounded-full border-[3px] px-4 py-1 text-3xl font-semibold shadow-[4px_4px_0_var(--ink)]", BADGE[TONES[i]])}>
                    {s.value}
                  </dt>
                  <dd className="text-muted-foreground pt-3 text-sm leading-snug">{s.label}</dd>
                </div>
              ))}
            </dl>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The time is from one real ticket on October 17: I tapped Yes at 3:54 PM, and the change was live in production at 3:56 PM.
            </p>
            <Fig
              name="poke-feedback-and-decision"
              alt="Two screens side by side: POKE’s new Feedback form, and the decision page that asks me to approve or reject a recommendation."
              caption="The two screens I added for the capstone. Users send feedback on the left. I make the decision on the right."
            />
          </Chapter>

          <Chapter id="the-app" tone="vermilion" title="First, the app">
            <P>
              Most usability tests are designed to validate. POKE helps you discover. You paste in a script, upload a .docx, or
              just describe what you’re testing, and POKE grades it from F to A+ and tells you what’s working, what’s leaky, and
              what to fix before you launch. If your script is too thin to grade, POKE interviews you first, starting with the
              question I wish more teams asked: what are you afraid is true but haven’t verified?
            </P>
            <P>
              I built it with Claude Code, and the app itself is AI-enabled: Claude does the grading. Along the way I gave it a
              Skill, my own opinionated interview method (one learning objective per test, unmoderated by default), and two tools
              it can choose to use, one that drafts a test plan and one that checks the wording of each task. That was the
              earlier part of this course. This case study is about what came next.
            </P>
            <Fig
              name="poke-grade-and-chat"
              alt="Two POKE screens: a chat where POKE asks what decision the test should inform, and a graded script with a B minus, what’s working, what’s leaky, and what to fix."
              caption="Left: POKE interviewing me about a thin script. Right: a graded script with what’s working, what’s leaky, and the fix to make before launch."
            />
          </Chapter>

          <Chapter id="the-capstone" tone="chartreuse" title="The capstone: build a team to run this website">
            <P>
              The ask was simple to say and hard to do. POKE had a gap: as an alpha, it had no way to hear from its users. So I
              decided the team should work like a tiny product company.
            </P>
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {[
                ["Support bot", "Answers users and does the first triage."],
                ["PM bot", "Decides what’s worth doing and says so plainly."],
                ["Design-Engineer bot", "Reads the real code and designs the fix."],
                ["Me", "The human. I make the final call."],
              ].map(([name, job]) => (
                <div key={name}>
                  <dt className="font-display text-xl font-semibold">{name}</dt>
                  <dd className="text-muted-foreground">{job}</dd>
                </div>
              ))}
            </dl>
            <Fig
              name="agent-team-idea"
              narrow
              alt="A page from the project’s read-this-first document, describing the idea in one paragraph."
              caption="The idea in one paragraph, from the project’s own documentation."
            />
          </Chapter>

          <Chapter id="sketch-and-plan" tone="forest" title="Sketch it, then plan it">
            <P>
              I started on paper. I sketched the whole flow, described the sketch out loud to Claude Code in plan mode, and asked
              for a PRD with diagrams. A rule I held to for the whole project: plan first, get my approval, then build.
            </P>
            <Fig
              name="sketch"
              alt="A hand-drawn sketch: the POKE web app captures feedback and sends it to an agent team of a support bot, a PM bot, and a design bot, then an engineering bot, ending at me, the director of product, with a question mark about rules."
              caption="The napkin version. Note the question marks. They turned into the guardrails."
            />
            <Fig
              name="prd-and-plan"
              alt="Claude Code’s plan on the left and the PRD it produced on the right."
              caption="Plan mode on the left, the PRD it became on the right. I wrote down the goal: something future me could read in five minutes."
            />
          </Chapter>

          <Chapter id="front-door" tone="vermilion" title="Build the front door first">
            <P>
              Agents need something to manage. So before any bot existed, I added a Feedback button to POKE that saves reports to a
              database and emails a confirmation. Three screenshots, three proofs: the form works, the data lands, and the
              confirmation arrives.
            </P>
            <Fig
              name="feedback-form-local"
              alt="The POKE home page with the Feedback form open: choose Bug, Idea, or Something else, describe what happened, and optionally leave an email."
              caption="The form, running locally."
            />
            <Fig
              name="feedback-in-database"
              alt="A database query result showing the first feedback ticket saved with a status of new. The email address and web address are blacked out."
              caption="The report landing in the database. The email address and project address are blacked out."
            />
            <Fig
              name="confirmation-email"
              alt="A confirmation email titled We got it: POKE-0001, with the ticket number and a promised response time."
              caption="The confirmation email, with a ticket number and a response window."
            />
          </Chapter>

          <Chapter id="a-home-for-the-team" tone="chartreuse" title="Give the team a home">
            <P>
              The team lives on a small server running Hermes, an open agent runtime, and talks to me through Telegram. This was
              the least glamorous part of the project: keys, configs, consoles, and spending limits. I capped each AI account with
              a monthly limit before any bot ran. If you’ve ever wondered what DevOps looks like when an AI works through it with
              you, it’s a lot of browser tabs.
            </P>
            <Fig
              name="phase-2-plan"
              narrow
              alt="Claude’s plan for the Support bot, listing what it found on the server in a read-only look: the agent runtime, its profiles, and its kanban board."
              caption="Claude looked at the server read-only first, then wrote the plan around what was really there."
            />
            <Fig
              name="so-many-consoles"
              alt="Four windows open at once: the Claude Console workspaces page, a server terminal, and the Vercel environment variables page. Addresses, workspace IDs, and the credit balance are blacked out."
              caption="Four consoles, one afternoon. Addresses, workspace IDs, and my credit balance are blacked out."
            />
          </Chapter>

          <Chapter id="support-bot" tone="forest" title="Bot one: Support">
            <P>
              The Support bot reads each new report, replies to the user in POKE’s voice, and does the first triage: is this a
              bug, a usability issue, or a question? The first version worked. Telegram looked like this.
            </P>
            <Fig
              name="support-first-draft"
              narrow
              alt="Telegram messages from the first version of the Support bot, mixing new-ticket pings, truncated task titles, and error notices."
              caption="Technically correct. Humanly unreadable: truncated titles, mixed senders, no story of one ticket."
            />
            <P>
              My instructor’s advice was to get the first bot about 90 percent of the way before starting the next. So Claude
              grilled me on the dials: the voice (direct and a little playful), the length (one or two sentences), what to do with
              vague reports, and what it’s allowed to know. Then it rebuilt the output as one clean card per ticket. Every reply opens
              with “Hey there, Poker,” and closes with a next step. That part is added by code, so it can’t be forgotten.
            </P>
            <Fig
              name="support-dials-plan"
              narrow
              alt="Claude’s plan for refining the Support bot, listing the decisions from my grill-me session: voice, length, autonomy, vague reports, knowledge, and the card layout."
              caption="The dials, decided in a grill-me session where Claude asked and I chose."
            />
            <Fig
              name="support-card"
              narrow
              alt="Two Telegram cards, each showing the ticket, the Support bot’s reply, and its triage notes. An email address is blacked out."
              caption="The result: what the user said, what the bot told them, and why. An email address is blacked out."
            />
          </Chapter>

          <Chapter id="pm-and-design-engineer" tone="vermilion" title="Bots two and three: PM and Design-Engineer">
            <P>
              Before building, I planned how all three would work together. My requirements: the PM sends me a full recommendation
              and I decide, I get a status message so I can keep the employee honest, the PM and the Design-Engineer talk before
              recommending, and when I approve, the next thing I hear is that it’s live.
            </P>
            <Fig
              name="trio-planning"
              narrow
              alt="Claude’s plan for the PM and Design-Engineer bots, listing my direction for how the three agents work together."
              caption="The direction I gave, written down before building."
            />
            <P>
              The PM groups duplicate reports into one backlog item, scores it, and recommends. The Design-Engineer reads the actual
              code and designs the fix. I told Claude the PM’s output had to be written for a human, and that sent the decision
              page back for a rewrite.
            </P>
            <Fig
              name="decision-page-first-draft"
              narrow
              alt="The first draft of the decision page, with shorthand like Effort S and a risk that describes not fixing the problem."
              caption="First draft: accurate, but written like a spec. “Effort: S.” And a “risk” that was really the cost of doing nothing."
            />
            <Fig
              name="decision-page-rewritten"
              narrow
              alt="The rewritten decision page, with a plain recommendation, a sentence about what changes for people, why, what could go wrong, and how much work it is."
              caption="After my feedback: plain language about what changes for the person using POKE, and the risk of doing it, not skipping it. Sometimes the answer is “make no change.”"
            />
          </Chapter>

          <Chapter id="first-production-test" tone="chartreuse" title="The first test in production">
            <P>
              Then I ran it for real. I filed a ticket on the live site. Within minutes the PM had noticed it was a duplicate of another
              report and grouped them, the Support bot had replied, and a recommendation was in Telegram. The Design-Engineer had read
              the code and found something I loved: the button people described as “greyed out” wasn’t actually disabled. Its only
              hint appeared after you clicked. The bots don’t just obey a bug report. They check it against the code.
            </P>
            <Fig
              name="test-pm-and-support"
              narrow
              alt="Telegram showing the PM bot adding a new report to an existing item, then the Support bot’s card marking the ticket as a duplicate."
              caption="The PM grouped two reports of the same problem into one item."
            />
            <Fig
              name="test-decision-page"
              narrow
              alt="The decision page for a recommendation to add a quiet hint under the Poke it button."
              caption="The recommendation, written for a human."
            />
            <Fig
              name="test-engineer-detail"
              alt="The folded technical detail from the Design-Engineer: the file it would touch, the existing pieces it would reuse, and an accessibility note."
              caption="The Design-Engineer’s technical detail, folded away until you want it."
            />
            <P>
              I read it and decided I didn’t think it was a real bug, so I didn’t approve it. The system recommends. I decide.
            </P>
          </Chapter>

          <Chapter id="make-it-real" tone="forest" title="Make it real: tap, and it ships">
            <P>
              Recommending isn’t shipping. The last piece was the one that makes this feel like magic, and the one that deserves the
              most care: when I tap Yes on a small, safe change, the system builds it, checks it, and puts it on the live site. Here is
              one real run, step by step.
            </P>
            <ol className="space-y-12 pt-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="space-y-4">
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden="true"
                      className={cn("border-ink flex size-10 shrink-0 items-center justify-center rounded-full border-[3px] text-sm font-semibold shadow-[3px_3px_0_var(--ink)]", BADGE[TONES[i % 3]])}
                    >
                      {i + 1}
                    </span>
                    <div className="space-y-2">
                      <h3 className="font-display text-xl font-semibold">
                        <span className="sr-only">Step {i + 1}: </span>
                        {step.title}
                      </h3>
                      <p className="text-lg leading-relaxed">{step.body}</p>
                    </div>
                  </div>
                  {step.fig}
                </li>
              ))}
            </ol>
          </Chapter>

          <Chapter id="staying-safe" tone="vermilion" title="How I kept it safe">
            <P>An agent that can change a live website deserves a little suspicion. Here is what stands between a bad idea and production.</P>
            <ul className="space-y-4">
              {SAFETY.map((s) => (
                <li key={s.title}>
                  <span className="font-display text-xl font-semibold">{s.title}</span>{" "}
                  <span className="text-muted-foreground text-lg leading-relaxed">{s.body}</span>
                </li>
              ))}
            </ul>
            <P>
              I also tried to break it. I wrote a fake report that told the builder to steal keys and sabotage the checks. Claude
              spotted the attack itself and refused, and nothing shipped. I haven’t yet tested the permission rules against a model
              that actually tries to break out, and I’d rather say so than pretend.
            </P>
          </Chapter>

          <Chapter id="what-went-wrong" tone="chartreuse" title="What went wrong">
            <ul className="list-disc space-y-3 pl-6 text-lg leading-relaxed">
              {WRONG.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Chapter>

          <Chapter id="what-i-learned" tone="forest" title="What I learned">
            <ul className="space-y-4">
              {LEARNED.map((l) => (
                <li key={l.title}>
                  <span className="font-display text-xl font-semibold">{l.title}</span>{" "}
                  <span className="text-muted-foreground text-lg leading-relaxed">{l.body}</span>
                </li>
              ))}
            </ul>
          </Chapter>

          <Chapter id="whats-next" tone="vermilion" title="What’s next">
            <ul className="space-y-4">
              <li>
                <span className="font-display text-xl font-semibold">Validate the app with real users.</span>{" "}
                <span className="text-muted-foreground text-lg leading-relaxed">
                  I haven’t spent much time on the quality of the results yet, and that matters most. I need real feedback on what it is
                  like to use POKE, then I need to tune the guidance it gives. If this were a real product, the core app comes first.
                </span>
              </li>
              <li>
                <span className="font-display text-xl font-semibold">Harden the agent team.</span>{" "}
                <span className="text-muted-foreground text-lg leading-relaxed">
                  The agents are a proof of concept. For the demo, I narrowed how changes reach production: a known, straightforward bug
                  can be fixed, but real feedback is rarely that clear. It might be a bug, a feature request, a problem with what the AI
                  says, or a problem with how it is presented. It might be about speed, browsers, or screen sizes. Next, I want the team
                  to triage realistic feedback better, make better decisions, and choose safer ways to ship, including testing the
                  builder’s guardrails against a model that is actively trying to get around them.
                </span>
              </li>
              <li>
                <span className="font-display text-xl font-semibold">The blue sky.</span>{" "}
                <span className="text-muted-foreground text-lg leading-relaxed">
                  Put this out in the wild with enough traffic, and see where the team takes it over a couple of months. The agents
                  could work out product market fit and usability on their own, and it could become a different product than the one I
                  started with, in directions I couldn’t have imagined.
                </span>
              </li>
            </ul>
          </Chapter>

          <Chapter id="credits" tone="chartreuse" title="Credits">
            <P>
              The PM bot’s instructions borrow ideas from Dean Peters’ Product Manager Skills, and the Design-Engineer’s from the
              open design-engineer skill by ddruids. Both were written from scratch, with credit. The agents run on Hermes, from Nous
              Research, and everything was built with Claude Code and Claude models from Anthropic. The stack is Next.js and
              Vercel, Supabase, Resend, DigitalOcean, Telegram, and GitHub Actions.
            </P>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Built by Zach Schweitzer.{" "}
              <Link href="/" className="text-forest font-medium underline underline-offset-4">
                Try POKE
              </Link>
              .
            </p>
          </Chapter>
        </article>
      </main>
    </>
  );
}
