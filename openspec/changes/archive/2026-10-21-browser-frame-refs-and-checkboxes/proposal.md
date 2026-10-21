# Proposal

**Status:** ready-to-ship
**Branch:** royal-bumblebee
**Open questions:** none

## Why

On 2026-10-21, buying a ring on repebble.com, the browser typed your email and name into the wrong boxes. Stripe's *Save my information* section inside the payment box had boxes with the same names, so your answers landed there and ticked *Save my information* for you. Then the *I understand* box would not tick by click, three ways; only the keyboard (Tab, then Space) ticked it. A wrong box on a payment page can save details or agree to something you never chose.

## What Changes

- **Each box's label points at that box, even when a payment box has a box with the same name.** When a page holds a payment box (or any embedded box) with a box of the same name as one on the page, the browser now labels each one for itself. Typing into the page's *Email* goes to the page's *Email*, not the payment box's. When the browser can't be sure which is which, it leaves those boxes unlabelled instead of guessing, so the agent picks another way in.
  ```mermaid
  flowchart TD
    read["read the page"] --> same{"same name in a frame?"}
    same -->|no| as["as before"]
    same -->|yes| sure{"counts agree?"}
    sure -->|yes| own["own label each"]
    sure -->|no| none["no label"]
  ```

- **A tick box click is checked, and retried with the keyboard.** After clicking a tick box, a round choice, or a switch, the browser reads whether it changed. If it didn't, it presses Space on that box, as you would. If it still didn't change, the agent hears *the box did not change* instead of a quiet *done*. Ticking *I agree* still needs your yes first.
  ```mermaid
  flowchart TD
    press["click the box"] --> changed{"changed?"}
    changed -->|yes| done
    changed -->|no| space["press Space"] --> again{"changed?"}
    again -->|yes| done
    again -->|no| say["did not change"]
  ```

**Non-goals:** changing camofox itself. A ref that picks the wrong box when one name starts another (*Save* and *Save all*), which camofox's own open fix (#14004) covers. Tick boxes reached only by a text or role selector, which aren't read back. The private card form's endings and speed, planned in workspace "fix-private-form-false-not-accepted".

## Capabilities

### New Capabilities

### Modified Capabilities

- `browser-logins`: the personal browser's page reading gives same-named boxes in embedded frames their own refs, or none when unsure, and a click on a tick box, radio, or switch is checked and retried with Space.

## Impact

- `.agents/skills/browser/scripts/browse.mjs`: the client's `snapshot`, `click`, and `get value` read; the tab file keeps each ref's role and ticked state from the newest snapshot.
- `scripts/tests/browse.test.mjs` and its fake camofox: frame snapshots and tick boxes.
- `wiki/development/browsing.md`: refs in payment boxes and tick boxes.
- The private form (`hand-over`) types through the same client, so its card boxes in a Stripe frame get the right refs too. No hand-over file changes.
- camofox 1.18.1 stays pinned and untouched.

## Decision log

- **2026-10-21** — Asked where the wrong-box fix should live → chose: update camofox if it has an upstream fix, and prefer not touching camofox. camofox 1.18.1 is its newest release, and its open fix #14004 covers only exact names, so the fix lives in `browse.mjs` and camofox stays untouched.
- **2026-10-21** — Asked whether to offer the fix to camofox's makers → chose: note it as a finding and ask later; nothing is posted outside.
- **2026-10-21** — Assumed: when the browser can't match its count of boxes to camofox's, it drops the refs of same-named boxes rather than guess, because a missing ref is safe and a wrong one types into the wrong box.
- **2026-10-21** — Assumed: only a click on a tick box, radio, or switch, by ref or CSS selector, is read back, so other clicks, the Pay button included, cost no extra time.
- **2026-10-21** — Assumed: no overlap with workspace "fix-private-form-false-not-accepted". It changes `form.mjs`, `hand-over.mjs`, and `form-page.mjs`; this change only `browse.mjs`. Both add a line to `wiki/development/browsing.md` and a `CHANGELOG.md` entry, merged by hand. If its speed work changes `browse.mjs`'s click, the later one rebases onto the other.
- **2026-10-21** — Assumed: a page camofox sends in windows (over 80,000 characters) counts as unsure, because each window repeats the page's end and its boxes can't be counted as camofox counted them; same-named boxes there print no ref. Opening a page drops the last page's tick boxes, and a click whose ref now holds another role is not retried, so Space never lands on a button.
- **2026-10-21** — Assumed: `get value` also reads a text box's text from the line under its placeholder, because the real-camofox check found a filled box with a placeholder reading as empty; fixed in this change, since a fix the check finds belongs here.
- **2026-10-21** — Assumed: the tab file keeps each tick box's name with its role and state, and a click whose ref names another role or another box afterwards counts as changed and gets no Space, because camofox renumbers after a click and the same ref can then be a different box of the same role.
- **2026-10-21** — Assumed: a CSS-selector tick-box read uses the match camofox's click takes, the only visible one when exactly one of several is visible, else the first, with a selector list left as given, because `document.querySelector` alone could read a hidden copy while the click lands on the visible one.
- **2026-10-21** — Assumed: on every page, frame blocks or none, a main-page mark that isn't the line's place among main-page boxes is dropped and the note added, while a windowed read skips this check, because camofox numbers the main page first in order, and a frame missing from its second read otherwise leaves that frame's ref on a main-page line of the same name. A page where every mark matches still reads byte for byte. Test pages that marked boxes out of camofox's order now number them as camofox does.
- **2026-10-21** — Assumed: keep the CSS-selector click's one read before the click, even on a button, and say so in the spec, because a selector carries no role, and only that read shows whether it is a tick box; a click by ref on any other element still takes no extra step.
- **2026-10-21** — Assumed: Google's results page skips the relabel, because camofox builds that page's text in its own pass with no frames, and the main-page mark check would drop correct refs after a link our copied list skips, such as *Calendar*.
- **2026-10-21** — Assumed: a CSS selector whose only visible match isn't its first match gets no check and no Space retry, because camofox's click takes the visible match but its keyboard focus takes the first, so Space could land on another element.
- **2026-10-21** — Archive checkpoint: built, reviewed twice, live-checked on a real camofox, merged with main's 43.18.0 (CHANGELOG and browser-logins spec conflicts kept both sides), and numbered 43.18.1.
