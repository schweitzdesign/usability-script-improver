# Demo 2 script: the double tab stop on "Poke it."

What it shows: a keyboard bug you can see and measure, reported in plain language, fixed and live with
one tap. About 20 minutes of wall-clock time and about 6 minutes of clicking. The rest is waiting, which is
where you narrate or cut when recording. Background on the bug and the other demo items:
[demo-bank.md](demo-bank.md).

## Before you start (2 minutes)

1. Open **Telegram**, the **live site** (https://usability-script-improver.vercel.app), and optionally GitHub's
   Actions page for the repository.
2. Ask Claude for a health check ("ready"). It checks the droplet and the pipeline first.
3. **Only ever tap the Decide link from the newest card.** Older cards from earlier tests are still open, and
   one of them (B-018) would build if you tapped Yes.

## Part 1: show the bug (1 minute, before)

1. Reload the live home page.
2. Press **Tab** five times, slowly. Tab 3 is Feedback, tab 4 is the script box, **tab 5 draws a square outline
   around the Poke it button**, and **tab 6 draws a second, rounded outline** on the real button. One button, two
   tab stops.
3. Prove it in the browser console (Mac Chrome: Cmd+Option+J):

   ```js
   [...document.querySelectorAll('a[href],button,input,textarea,select,[tabindex]')].filter(e => e.tabIndex >= 0).map(e => e.tagName + ':' + e.textContent.trim().slice(0, 12))
   ```

   Expected before: `["A:Skip to inpu","A:POKEPKE","BUTTON:Feedback","TEXTAREA:","SPAN:Poke it.","BUTTON:Poke it."]`.
   The `SPAN` is the bug.

## Part 2: send the ticket (1 minute)

Click **Feedback**, choose **Bug**, use your own email, and send:

> "When I tab through the home page with my keyboard I land on the Poke it button twice. First a square outline
> appears around it, then a second rounded outline on the actual button. It takes two Tab presses to get past one
> button."

Note the ticket number (POKE-00NN).

## Part 3: wait and narrate (8 to 15 minutes)

| What arrives in Telegram | When |
|---|---|
| Support card (your words, the reply, the triage) | 3 to 5 minutes after sending |
| "PM on POKE-00NN: Started B-0NN..." | 2 to 4 minutes later |
| Recommendation card with a **Decide:** link | 8 to 15 minutes after sending |

Talking points while you wait: Support answered in POKE's voice, the PM grouped it into a backlog item, and the
Design-Engineer is reading the real code right now.

What the card should say: "Make this change", Small, **no** red second-approval flag, a headline that names the
Poke it button and the home page, and `mega-input.tsx` among the files.

## Part 4: decide (1 minute)

1. Tap **Decide:**. Read the headline. Open **Technical detail** and check that the files are real.
2. Choose **Yes, make this change**, then **Send decision**.
3. If it says "make no change" or "find out more", choose **Ask more** with this note: "A hidden wrapper around
   the Poke it button is a keyboard tab stop. Its press animation adds tabindex 0. Please recommend removing that
   extra stop." A new card comes back in a few minutes.

## Part 5: watch it ship (about 2 minutes)

1. Telegram: "Approved... building it now" within about 2 minutes.
2. Optional, good on camera: open the Actions page and show the `ship` run (about 70 seconds).
3. Telegram: "...is live in production" about 2 minutes after your tap. The first real run took 1 minute 48 seconds.

## Part 6: verify the fix (1 minute, after)

1. **Hard-refresh** the live site (Cmd+Shift+R).
2. Re-run the console snippet from Part 1. Expected after:
   `["A:Skip to inpu","A:POKEPKE","BUTTON:Feedback","TEXTAREA:","BUTTON:Poke it."]`, with no `SPAN`.
3. Press **Tab** five times again: tab 5 now lands on the button with one rounded outline.
4. Regression check: click **Poke it** with the box empty. It should still shake and say "Give it something to poke
   first." Press and hold it too. If the squish effect changed, that is the engineer's trade-off, and worth pointing
   out honestly.
5. Open the pull request link from the "live" message to show the small diff.

## If something goes wrong

| Symptom | What to do |
|---|---|
| No Support card after 8 minutes | Tell Claude. A stuck bot also sends its own alert. |
| No recommendation card after 20 minutes | Tell Claude. |
| Decide link says "used" or "expired" | You tapped an old link. Use the newest card. |
| "Needs your review" instead of "live" | Merge the pull request on GitHub. The live message still follows. |
| "Could not be built" | The message says why. Nothing changed on the live site. |
| You want it stopped | Ask Claude to pause shipping, or run the one-line switch in the runbook. |

Recording tip: record two clips, "before and submit", then "recommendation to live to verify", and cut or speed up
the waiting between them. About 50 cents of agent cost per run.
