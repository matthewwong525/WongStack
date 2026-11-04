# Proposal

## Why

A card payment through the private form could leave you waiting with no clear answer. One store saved the card on its own page and hid its card box, so the form kept saying *not confirmed*, and nobody could see whether it was a quiet decline. A store's page that changed before you typed failed with no reason, so it looked like the card was the problem. After Pay, the form also emptied the store's hidden card box, and the store's next step then asked for the card again. WongOS fixed this and used it on a real order; this brings the general part here.

## What Changes

- **When you press Pay, you see the site at once.** You still fill the card form with one tap from your password manager. The moment you press Pay, the same link shows the site itself, live, with a status line on top: *Paying Example Shop · 4 s*. If the site stops on a step, you tap through it there. When the site reaches its finish, the line says *Example Shop accepted. Done.*, and the last picture of the site stays on your screen. After a minute with no finish, the line says *Example Shop hasn't finished. Don't pay again unless it shows an error.* The agent never sees your card. Where no live view can open, such as on a Mac, the form shows the same line and counter.
  ```mermaid
  flowchart TB
    form["Form, then Pay"] --> live["Live site + status line"]
    live -->|"site finishes"| done["Done"]
    live -->|"you close it"| check["Agent reads the page"]
  ```
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><h3>Pay Example Shop</h3><span class="grow"/><span class="tag">4 s</span></div>
    <p>Paying Example Shop. This is its page, live.</p>
    <div class="skeleton"></div>
    <p class="muted">Pinch to zoom. Tap the site if it stops on a step.</p>
  </div>
  ```
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><h3>Pay Example Shop</h3><span class="grow"/><span class="tag-outline">1 min</span></div>
    <p class="danger">Example Shop hasn't finished. Don't pay again unless it shows an error.</p>
    <div class="skeleton"></div>
    <p class="muted">Say done in the chat when you're finished. I'll check the page.</p>
  </div>
  ```
- **A saved card no longer looks like "not confirmed".** The form counts a hidden card box as gone. It can also wait for words that show only once the site accepts, such as *Review your order*.
- **A page that changed before you typed tells you at once.** If the site's card boxes are gone when you open the form, or when you press Pay, the form says *Example Shop's page changed. Nothing was sent.* The agent gets the page ready again and sends you a new form, with no second question.
- **After an unclear end, the agent checks for you.** It reads the site's page as text, in which every card box shows as hidden, and tells you plainly: the site saved the card, the site declined it, or it still can't tell. It may press a next step that pays nothing, such as *Continue*. A press that pays still waits for your yes that names the purchase.
- **Logins work the same way.** When the agent sends the save-a-password page for a site that waits on its login, saving the password also signs in, and the same link shows the site live while it does. If the site asks for a code, you finish it there.
- **A stuck step gets a live view that stays open until you close it.** When the agent's click on a site's step does nothing, it sends a live view on that page. It stays open through every step until you tap *I'm finished*, so you don't need a second link.
  ```screen
  <div class="card col gap phone">
    <p>Example Shop's Continue didn't go through for me. Tap through the steps you need.</p>
    <div class="skeleton"></div>
    <div class="row gap"><span class="grow"/><button class="btn-primary">I'm finished</button></div>
  </div>
  ```
- **The form no longer empties a card the site already took.** It empties boxes only when nothing was pressed. When the agent's click reaches the site only through the page's own code, which some sites ignore, it says so and offers the live view instead of clicking again. It also waits up to 30 seconds for a slow step before it calls the step stuck.
- **PayPal as a second way to pay.** When a site takes PayPal, the pay question offers it beside the card. You sign in to PayPal and approve in a live view.

Non-goals: saving cards; Google Pay or Apple Pay; a live view on a Mac; the WongOS-only browser network and email parts.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

### Modified Capabilities
- `browser-logins`: a private form shows the site live from its press, not only one picture; a pressed form ends as sent or not confirmed, never not accepted, empties no box, and gets no new form while the payment may have gone through; an unconfirmed payment is watched up to 30 minutes while the site shows live; a stuck site step, a press, and a PayPal approval may get a live view, and a form's view doesn't count as the site's one live view.
- `private-links`: a form or password link shows the site live from the press, with a status line; a hidden part counts as gone, and a finish may name words; a changed page stops a form before typing; a form never empties boxes after its press; a live view that stays open until the person closes it; a script-only click is reported; the agent's after-check of an unclear payment; PayPal through a live view.

## Impact

- `.agents/skills/hand-over/scripts/`: `hand-over.mjs`, `form.mjs`, `form-page.mjs`, `passwords-page.{html,mjs}`, `view.mjs`, `view-page.{html,mjs}`.
- `.agents/skills/browser/scripts/browse.mjs`, `browser-server.mjs`.
- Tests in `scripts/tests/`: `browse`, `browser-server`, `form`, `hand-over`, and a new `live-pages` test.
- Wiki: `wiki/development/private-form.md`, `live-view.md`, `passwords.md`, `browsing.md`.
- `openspec/specs/private-links/spec.md` and `openspec/specs/browser-logins/spec.md`; a `## Next (minor)` entry in `CHANGELOG.md`.
- Source: WongOS PR #279, commit `f25f88c1` (`/root/WongOS`).

## Decision log

- **2026-11-04** — Asked what to send up from WongOS PR #279 → chose only the general parts of the hand-over scripts, `browse.mjs`, `browser-server.mjs`, and the live-view, passwords, private-form and browsing pages; WongOS-only parts stay out (the home Pi and Canadian proxy, `network off`, en-CA, the email browser lease, `refused-sites.md`, Matthew's accounts), and the plan is the scope review.
- **2026-11-04** — Assumed: WongOS's design decisions carry over unchanged (view from the press with no page resize, a new form after a changed page with no second ask, a payment's view not counting as the site's one view, `--keep-open` only for stuck site or payment steps), because WongOS asked and settled each one on a real order.
- **2026-11-04** — Assumed: WongOS's test cases move into this repo's `scripts/tests/` files with this repo's import paths, because here tests sit there, not beside the scripts.
- **2026-11-04** — Assumed: the browsing page keeps its *When a site refuses the browser* steps, and the new lines fit its 3,000-word cap by WongOS's own trims plus shorter wording, because `refused-sites.md` stays in WongOS.
- **2026-11-04** — Assumed: the after-check looks for the store's receipt in email only when the chat has an email tool, because WongStack ships no email app.
- **2026-11-04** — Assumed: examples name *Example Shop* in plain-words parts, while the wiki keeps WongOS's dated store example where it explains a lesson, because a real case teaches the rule.
- **2026-11-04** — Assumed: WongOS's `hand-over.test.mjs` cases go into `scripts/tests/private-links.test.mjs`, which matches that WongOS file here; this repo's own `hand-over.test.mjs`, which drives the fake browser, is updated for the new behavior instead (the ready check, no boxes put back after a press, `HANDOVER_REASON`), plus one new case for a shown-only finish and words.
- **2026-11-04** — Assumed: the fake browser in `scripts/tests/fixtures/fake-camofox-server.mjs` learns the new calls (a click's `via`, `front`, the shown count with hidden matches, and page words), each steered by a file as its other answers are, because the hand-over tests drive it.
- **2026-11-04** — Assumed: the hand-over test's page opener reads the page once after it opens, as the agent does before a form, because the new ready check needs the page's names from a snapshot.
- **2026-11-04** — Assumed: `browsing.md` stays under its cap by shorter wording and by moving the form helper's read list to `private-form.md`, which owns the form, because that detail is the form's own.
- **2026-11-04** — Assumed: the after-check reads email only when it can, worded in `private-form.md` as *when it can read your email*, as the earlier email line settled.
- **2026-11-04** — Assumed: the `browser-logins` delta also fixes two contradictions the review did not name (a live view only for a check or a stuck login, and one live view per site that a form's view would use up), because this change ships a view from the press, a view that stays open for a stuck step, and PayPal through a view.
