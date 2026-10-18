# Demo bank

Real, verified, small problems in the live app, kept for demonstrating the whole loop: a person
reports it, the agents triage and recommend, the Director taps Yes, the change is built and
deployed automatically, and a refresh shows it fixed.

**The rule that makes this work: do not fix anything in the "bank" by hand.** Each item below is
only a good demo while the problem is still live. If you fix one yourself, retire it from this list.
Verified against production on 2026-10-17.

## How long a demo takes

Every hop between agents runs on a 2 minute timer, so plan for these rough timings:

| Stage | Typical time after the previous one |
|---|---|
| Support card in Telegram | 3 to 5 minutes after you send the ticket |
| PM status message | 2 to 4 minutes |
| Recommendation card with the Decide link | 6 to 10 minutes (the Design-Engineer reads the code in between) |
| After you tap Yes: "Building it now" | up to 2 minutes |
| Build, merge, and deploy | 4 to 8 minutes |
| "It is live in production" | up to 2 minutes |

So send the ticket early and narrate. For a live class demo, submit the ticket and let the
recommendation card arrive before you present, then do the tap and the wait on stage (about 8 to
12 minutes), or record it and speed up the waiting.

## If the recommendation is not "make a change"

The PM and the Design-Engineer decide for themselves, and that is the point of the demo. If one of
these comes back as "make no change" or "find out more first", use **Ask more** on the decision
page with a short note (for example "this breaks our written style rule, so please recommend the
fix"). That exercises the reopen path, produces a fresh assessment, and a new card with a new link.

## Today's first test: the Feedback button is short on phones

- **Where:** top right of every page, on a phone-sized screen. The Feedback button is 36px tall and
  the POKE logo link 32px. Common touch guidance is 44px. (The strict WCAG 2.2 minimum is 24px, so
  this is a judgment call, which makes it a good test of whether the Design-Engineer pushes back.)
- **Ticket wording to send in production:**
  "On my phone the Feedback button in the top right is short, about 36px tall, and the POKE logo
  next to it is about 32px. That is under the 44px touch size most guidelines recommend, so it is
  easy to miss when tapping. Could both be at least 44px tall?"
- **Verify before and after** (browser developer tools console on the home page):

  ```js
  [...document.querySelectorAll('button,a')].filter(e => /Feedback|POKE/.test(e.textContent)).map(e => [e.textContent.trim().slice(0, 12), Math.round(e.getBoundingClientRect().height)])
  ```

  Before: `Feedback` 36 and `POKEPKE` 32. After: both 44 or more.

## Recorded demo: a double tab stop on "Poke it."

> **Used 2026-10-18.** This demo was recorded as B-023 and shipped automatically in about 2 minutes
> (pull request 4, `tabIndex={-1}` on the wrapper). The bug no longer exists on the live site, so this
> item cannot be repeated. The copy nitpicks above are still unfixed for the live class demo.

- **Where:** home page, keyboard only. After the script box, the first Tab lands on an invisible
  wrapper (a square outline), and the second lands on the real button (a rounded outline).
- **Cause (found 2026-10-17):** in `src/components/mega-input.tsx` the wrapper around the button
  carries a press animation, and the animation library makes such wrappers focusable.
- **Ticket wording:**
  "When I tab through the home page with my keyboard I land on the Poke it button twice. First a
  square outline appears around it, then a second rounded outline on the actual button. It takes two
  Tab presses to get past one button."
- **Verify before and after** (console on the home page):

  ```js
  [...document.querySelectorAll('a[href],button,input,textarea,select,[tabindex]')].filter(e => e.tabIndex >= 0).map(e => e.tagName + ':' + e.textContent.trim().slice(0, 12))
  ```

  Before the list contains `SPAN:Poke it.` followed by `BUTTON:Poke it.`. After only the `BUTTON`.
  Then press Tab with the keyboard to see one rounded outline.

## The bank for the live class demo (keep these unfixed)

All three are copy only: Small, no database, dependency, environment, or AI change, and the PM and
Design-Engineer are taught the house style that makes them worth fixing (no em dashes or en dashes,
curly apostrophes, a real ellipsis).

### 1. An em dash in the demo badge

- **Where:** the `/demo` page, top right badge. `src/components/poke-shell.tsx`, about line 68.
- **Before:** "Demo — canned data, no API calls" (an em dash).
- **After:** a comma or a colon instead.
- **Ticket wording:**
  "On the demo page the badge at the top right reads Demo, then a long dash, then canned data, no
  API calls. We are not supposed to use long dashes in anything users read. Could it use a colon or a
  comma?"
- **Verify:** open `/demo` and read the badge.

### 2. Straight apostrophes in the Feedback form

- **Where:** the Feedback window. `src/components/feedback-dialog.tsx`: the title "Tell us what's
  off." (about line 164) and "the page you're on" (about line 239).
- **Before:** straight apostrophes, while the rest of the app uses curly ones ("That didn't land.",
  "Learn what's real.").
- **After:** curly apostrophes.
- **Ticket wording:**
  "The title of the Feedback window says Tell us what's off, but the apostrophe is a straight one,
  while the headline on the home page uses a curly apostrophe. Could the Feedback window use the
  curly ones too?"
- **Verify:** click Feedback and compare the apostrophe in the title with the one in the home page
  headline.

### 3. Three dots instead of an ellipsis on the Feedback button

- **Where:** the Feedback window's send button while it is sending. `src/components/feedback-dialog.tsx`,
  about line 250.
- **Before:** "Sending..." with three periods, while the rest of the app uses a real ellipsis
  ("Poking…", "Reply…").
- **After:** "Sending…" with the real ellipsis character.
- **Ticket wording:**
  "When I send feedback the button says Sending with three periods, but the rest of the site uses the
  proper ellipsis character, like Poking… on the main button. Could this match?"
- **Verify:** send a feedback message and watch the button text (it shows for a moment), or check
  the string in the page source.

## Retired or rejected

- The hint under the empty script box (B-018): not a real bug, so it was not shipped.
- "The Feedback button label is hard to read" (B-008): measured at 6.7 to 1 contrast, which is fine.
