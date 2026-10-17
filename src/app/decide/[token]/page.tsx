import type { Metadata } from "next";
import { DecisionForm } from "./decision-form";
import { Wordmark } from "@/components/wordmark";
import {
  EFFORT_LABELS,
  KIND_LABELS,
  RECOMMENDATION_LABELS,
  STANCE_LABELS,
  allowsNo,
  describeCost,
  formatItemNumber,
  lookupDecisionLink,
  riskFlags,
  stanceOf,
  type Recommendation,
} from "@/lib/backlog";
import { getSupabaseServerClient } from "@/lib/supabase";
import { formatTicketNumber } from "@/lib/support-policy";

// A decision link is a credential in a URL: keep it out of search results and out of
// the Referer header, and never cache the page.
export const metadata: Metadata = {
  title: "Decision",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const STATE_COPY = {
  invalid: "This link isn't valid.",
  expired: "This link has expired. Ask the product manager bot for a fresh one.",
  used: "A decision was already made with this link.",
  not_open: "This item isn't waiting on a decision anymore.",
} as const;

const CHOICE_WORDS = { yes: "Yes", no: "No", more: "Ask more" } as const;

type Lookup = Exclude<Awaited<ReturnType<typeof lookupDecisionLink>>, { state: "invalid" }>;

export default async function DecidePage(props: PageProps<"/decide/[token]">) {
  const { token } = await props.params;
  const supabase = getSupabaseServerClient();
  const lookup = supabase ? await lookupDecisionLink(supabase, token) : ({ state: "invalid" } as const);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <Wordmark size="sm" />
      {lookup.state === "invalid" ? <Notice>{STATE_COPY.invalid}</Notice> : <Brief lookup={lookup} token={token} />}
    </main>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="font-medium">{children}</p>
    </div>
  );
}

// Written top-down like a news story: the verdict and what changes for people come first,
// then the reasoning, then the decision, and the supporting evidence last, folded away.
function Brief({ lookup, token }: { lookup: Lookup; token: string }) {
  const { item, state, assessment } = lookup;
  const rec = item.recommendation as Recommendation | null;
  const flags = assessment ? riskFlags(assessment) : [];
  const ownStance = stanceOf(rec);
  const disagrees = Boolean(assessment && ownStance && assessment.stance !== ownStance);
  const reports = item.tickets.length;
  const kind = KIND_LABELS[item.kind];
  const open = state === "open";

  return (
    <article className="flex flex-col gap-6 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          {formatItemNumber(item.item_number)} · {kind} · {reports} user report{reports === 1 ? "" : "s"}
        </p>
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{item.title}</h1>
      </header>

      {rec ? (
        <section aria-labelledby="rec-heading" className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 id="rec-heading" className="text-sm font-medium text-muted-foreground">
              Our recommendation
            </h2>
            <p className="font-display text-lg font-semibold">{RECOMMENDATION_LABELS[rec]}</p>
            {item.change_summary ? <p className="text-base leading-relaxed">{item.change_summary}</p> : null}
            {flags.length > 0 ? (
              <p role="note" className="mt-1 rounded-lg border border-vermilion-ink/40 bg-vermilion/10 p-3 text-sm">
                <strong>Needs your second approval:</strong> this {flags.join(", and this ")}.
              </p>
            ) : null}
          </div>

          <dl className="flex flex-col gap-4 border-t pt-5">
            <Row label="Why we recommend this" value={item.why} />
            <Row label="What could go wrong with this recommendation" value={item.risk} />
            <Row
              label="How much work this is"
              value={
                item.effort_size
                  ? `${EFFORT_LABELS[item.effort_size]}. ${item.effort_why ?? ""}`.trim()
                  : null
              }
              note={
                item.ease_source === "pm_guess"
                  ? "An engineer has not looked at this yet, so this is the product manager bot's estimate."
                  : "Assessed by the Design-Engineer, who reviewed the code."
              }
            />
            <Row label="Cost" value={capitalize(describeCost(item))} />
            {disagrees && assessment ? (
              <Row
                label="The Design-Engineer saw this differently"
                value={`It leaned toward: ${STANCE_LABELS[assessment.stance]}. ${assessment.why}`}
              />
            ) : null}
          </dl>
        </section>
      ) : null}

      <div className="border-t pt-5">
        {open ? (
          <DecisionForm token={token} options={optionsFor(rec)} />
        ) : state === "used" ? (
          <Notice>
            {lookup.choice ? `You chose ${CHOICE_WORDS[lookup.choice]}. ` : ""}
            {STATE_COPY.used}
          </Notice>
        ) : (
          <Notice>{STATE_COPY[state]}</Notice>
        )}
      </div>

      <div className="flex flex-col border-t">
        <Fold title="The problem and who it affects">
          <dl className="flex flex-col gap-3">
            <Row label="The problem" value={item.problem} />
            <Row label="The person we are solving it for" value={item.user_story} />
          </dl>
        </Fold>
        <Fold title={`What ${reports === 1 ? "the user" : "users"} said`}>
          <ul className="flex flex-col gap-3">
            {item.tickets.map((t) => (
              <li key={t.ticket_number}>
                <p className="text-sm text-muted-foreground">
                  {formatTicketNumber(t.ticket_number)}
                  {t.severity ? ` · ${capitalize(t.severity)} priority from support` : ""}
                </p>
                <p className="mt-0.5 leading-relaxed">&ldquo;{t.message}&rdquo;</p>
              </li>
            ))}
          </ul>
        </Fold>
        {assessment ? (
          <Fold title="Technical detail from the Design-Engineer">
            <dl className="flex flex-col gap-3">
              <Row label="Files this would touch" value={assessment.files_likely_touched.join(", ") || null} />
              <Row label="Existing pieces we would reuse" value={assessment.reuse_note} />
              <Row label="Loading, empty, error, and success states" value={assessment.states_note} />
              <Row label="Accessibility" value={assessment.accessibility_note} />
              <Row label="Follow-up question from the product manager bot" value={item.followup_question} />
              <Row label="The Design-Engineer's answer" value={item.followup_answer} />
            </dl>
          </Fold>
        ) : null}
        <Fold title={`How we scored it${item.ice_score !== null ? `: ${Number(item.ice_score).toFixed(1)} out of 10` : ""}`}>
          {item.ice_score !== null ? (
            <dl className="flex flex-col gap-3">
              <Row label={`Impact: ${item.impact} out of 10`} value="How much this hurts the people who run into it." />
              <Row label={`Confidence: ${item.confidence} out of 10`} value="How sure we are, given the evidence so far. Thin evidence scores low." />
              <Row
                label={`Ease: ${item.ease} out of 10`}
                value="How little work and risk it should take. Higher means easier."
              />
              <p className="text-sm text-muted-foreground">
                The priority score multiplies impact, confidence, and ease, then divides by 100.
              </p>
            </dl>
          ) : (
            <p>This item has not been scored.</p>
          )}
        </Fold>
      </div>
    </article>
  );
}

function optionsFor(rec: Recommendation | null) {
  const noOption = {
    value: "no" as const,
    label: rec === "investigate" || rec === "needs_info" ? "No, not worth investigating" : "No, don't make this change",
    hint: "Close this item. Nothing gets changed.",
  };
  const yesLabel =
    rec === "drop"
      ? "Yes, leave it as it is"
      : rec === "investigate" || rec === "needs_info"
        ? "Yes, find out more first"
        : rec === "build_later"
          ? "Yes, make this change later"
          : "Yes, make this change";
  return [
    { value: "yes" as const, label: yesLabel, hint: "Go with the recommendation." },
    ...(allowsNo(rec) ? [noOption] : []),
    {
      value: "more" as const,
      label: "Ask more",
      hint:
        rec === "drop"
          ? "Send it back with a question, or say you want this changed after all."
          : "Send it back to the product manager bot with a question.",
    },
  ];
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Fold({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b last:border-b-0">
      {/* The padding sits on the summary so the whole row is the tap target (44px tall). */}
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium outline-none marker:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring">
        {title}
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

function Row({ label, value, note }: { label: string; value: string | null; note?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 leading-relaxed">
        {value}
        {note ? <span className="mt-1 block text-sm text-muted-foreground">{note}</span> : null}
      </dd>
    </div>
  );
}
