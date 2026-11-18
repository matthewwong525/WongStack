<!-- openspec-archive v1 2026-11-05-live-view-for-sensitive-input -->
<!-- file proposal.md utf8 15511 -->
# The live view is the one place for sensitive input

**Status:** ready-to-ship
**Branch:** outgoing-flamingo
**Open questions:** none

## Why

Today a card, a backup code and a password each have their own form: the private form for a card or a code, and the password page for logins. Each form copies a part of the site, and each one breaks in its own way. The live view already shows the real site, and the assistant sees nothing until you tap *Hand back*. So you type everything sensitive there, on the real page, and the extra forms go.

## What Changes

- **You type a card, a backup code or a password on the real site, in the live view.** The assistant fills in the rest of the page first, then asks *Ready?* in the chat as it does today. The link shows its browser on that page, with one bar under it: a short line that says what to do now, the type box and *Hand back*. You type, or paste from your password manager. The assistant sees nothing you do until you tap *Hand back*.
  ```screen
  <div class="card col gap phone">
    <div class="skeleton">City of Markham: Payment</div>
    <div class="sep"/>
    <span>Type your card and press Pay $45.00, then tap Hand back.</span>
    <div class="row gap"><div class="field grow">Tap a box above, then type</div><button class="btn-primary">Hand back</button></div>
  </div>
  ```
  This page is not part of the app, so the plan has a sketch, not a real picture.

- **You press the site's own Pay button.** You see the real total on the real page, and the assistant never presses Pay with your card. The view ends by itself when the site shows its receipt, or when you tap *Hand back*. The assistant then reads the page as text, with every card box hidden, and tells you whether the payment went through. It never asks you to pay again while the payment may have gone through.
  ```mermaid
  sequenceDiagram
    participant You
    participant Assistant
    Assistant->>You: Pay City of Markham $45.00? Ready?
    You->>Assistant: Ready
    Assistant->>You: the live view link
    You->>You: type the card, press Pay
    You->>Assistant: Hand back, or the receipt shows
    Assistant->>You: Paid. Receipt P0178390.
  ```

- **You sign in to a site in the live view, and the browser stays signed in.** There is no password page and no list of saved passwords. When a site asks you to sign in, the link's line says *Sign in to Netflix, then tap Hand back*. Next time, the browser is still signed in, so you do nothing. A one-time code still comes through the chat or your email, as today. After the update, the assistant offers to delete the old file of saved passwords, because it holds them in plain text. You can not undo a delete.
  ```text
  Assistant: Netflix wants you to sign in.
  I'll send a link that shows my browser.
  [Ready, send it]  [Not now]

  ↳ link line: Sign in to Netflix,
    then tap Hand back.
  ```

- **Every live view has the same bar: one line and *Hand back*.** A robot check, a stuck step, a payment and a sign-in all look the same. *I'm finished* becomes *Hand back*. To give up, you tap *Hand back* and say so in the chat. The assistant then asks before it does more on that page.
  | Step | The line says |
  |---|---|
  | Payment | Type your card and press Pay $45.00, then tap Hand back. |
  | Sign-in | Sign in to Netflix, then tap Hand back. |
  | Backup code | Type your backup code for Google, then tap Hand back. |
  | Robot check | Show Messenger you're a person, then tap Hand back. |
  | Stuck step | Tap DigiKey's Continue, then tap Hand back. |

- **On a Mac or a Windows computer, the browser shows in a window on your screen.** A live view link can not open there yet. So the assistant's browser opens in its own window by default, and your turn happens in that window. The chat says *Sign in to Netflix in the browser window, then say done*. A setting turns the window off, as it is today, for a computer you do not sit at. With the window off, a step that needs you ends with steps to finish in your own browser.
  ```text
  You: don't show the browser window
  Assistant: Done. From the next start my
  browser has no window. A sign-in or a
  payment then ends with steps for you.
  ```

- **The card form and the password page go.** The private key link for API keys stays, as the last way to give a key. Saved everyday answers, such as your email and address, stay, and the chat still asks before it uses them.

**Non-goals:** a live view link on a Mac or Windows computer; one-time codes in the live view (they stay in the chat or your email); removing the key link; the watching that connecting your tools does, which its own change owns.

## What the build needs

- **The live view's tools on this server**: Ready, `x11vnc`, `xdotool` and `Xvfb` are installed, and noVNC 1.6.0 is in `~/.wong-stack/live-view/`.
- **The live view's Hand back**: Ready. They are built in the change *Connect your tools on a server*; this change uses them, or builds the same ones if that change is not live yet.
- **A Mac to try the browser window**: Ready. The build tests it in code; you try one sign-in on your Mac after it is live.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: sensitive input (a card, a backup code, a password) goes only through the live view; saved logins, the password link and the private form are removed; every live view shows one line with *Hand back*; on a computer with its own screen, the browser shows in a window by default and the person's turn happens there.
- `private-links`: the form and password-link requirements go; the payment check after a live view stays; a view that stays open ends on *Hand back*.
- `saved-details`: a card is never saved and goes through the live view, not a private form; saved details no longer sit beside saved logins.
- `shopping`: a card typed into a website goes through the live view.
- `dependencies`, `reply-links`, `secrets-convention`, `shared-look`, `asking-the-user`, `connect-tools`: their lists of private links drop the password link and the private form.

## Impact

- `.agents/skills/hand-over/scripts/`: `form.mjs`, `form-page.mjs`, `form-page.html`, `passwords.mjs`, `passwords-page.mjs`, `passwords-page.html` and `picture-view.mjs` go; `hand-over.mjs` drops `--form`, `--passwords`, `--sign-in`, `--email-first`, `--site` and `--username`, and its view becomes the person's turn with `--note` and *Hand back*; `view-page.mjs` and `view-page.html` drop the form and sign-in states; `lib/timings.mjs` drops form steps; `details.mjs` keeps working.
- `.agents/skills/browser/scripts/`: `browse.mjs` drops `login`, `logins` and `forget`; `logins.mjs` goes; `browser-server.mjs` and `launch-config.py` start the browser in a window off Linux unless `browse.mjs window off` is set.
- `.agents/skills/shop/scripts/shop.mjs` (its refusal text), `.agents/skills/hand-over/SKILL.md`, `.agents/verification/journeys/shared-look/*.json`.
- Tests: `form.test.mjs`, `form-page.test.mjs`, `passwords.test.mjs`, `passwords-page.test.mjs` go; `hand-over.test.mjs`, `view-page.test.mjs`, `browse.test.mjs`, `live-pages.test.mjs`, `private-links.test.mjs`, `keys.test.mjs`, `reply-link.test.mjs` and `fixtures/practice-checkout.mjs` change.
- Wiki: `wiki/development/private-form.md` and `passwords.md` go; `browsing.md`, `live-view.md`, `login-codes.md`, `required-tools.md`, `secrets.md`, `shopping.md`, `README.md`, `wiki/maintaining/time-the-private-form.md` and `README.md`, `wiki/stack/api-keys.md`, `wiki/stack/connect-your-tools.md`, `AGENTS.md`, the wong-setup seed README; a new `wiki/development/saved-details.md` keeps the saved answers.
- `scripts/retired-names.json`, `.agents/skills/wong-sync/references/payload-files.json`, `.agents/skills/memory/references/areas.json`, `scripts/fixtures/context-baseline.json`.
- `CHANGELOG.md` (major: the password link and the private form are removed, and saved logins stop working).
- No app, Worker, or D1 change.

## Decision log

- **2026-11-05** — Asked, during the live test of connect-on-a-server, where sensitive input goes → Matthew chose the live view as *"the one place to fill in stuff"*: *"we can enter payment info and the bot wont see it until we handback"*. Remove *"card, code, passwords like all those forms"*.
- **2026-11-05** — Asked whether the key link goes too → it stays, as the last fallback for API keys; Matthew did not choose to remove it.
- **2026-11-05** — Asked what the view's top shows → one short line saying what to do now, such as *Sign in to Stripe, then tap Hand back*.
- **2026-11-05** — Asked what happens to logins already saved → chose to stop using them: every sign-in happens in the live view, the browser keeps the session, and after the update the assistant offers to delete the saved-passwords file.
- **2026-11-05** — Asked who presses the site's Pay button → chose the person, in the live view, so they see the real total and the assistant never presses Pay with their card.
- **2026-11-05** — Asked how a payment or sign-in works on a Mac, where the live view can not open → Matthew: *"On a mac we can do a real window i think default should be a window but we can change it to a server in the setting which is what we have rn"*. The browser shows in a window by default off Linux; a setting turns it off.
- **2026-11-05** — Assumed: Windows gets the same window as a Mac, because the browser code treats both alike today: no virtual screen, no live view.
- **2026-11-05** — Assumed: with the window off on a Mac, a step that needs the person ends with steps for their own browser, because no view can open there.
- **2026-11-05** — Assumed: in the window, the person says *done* in the chat in place of *Hand back*, and the same finish ends the turn by itself, because the window has no buttons of ours.
- **2026-11-05** — Assumed: the window setting is a `browse.mjs window on|off` command kept in `~/.wong-stack/`, taking effect at the next browser start, because the browser already keeps its own files there and a running browser is never restarted for a setting.
- **2026-11-05** — Assumed: every live view, not only a payment, shows one line, *Hand back* and *Stop*, and *I'm finished* becomes *Hand back*, so the person learns one page.
- **2026-11-05** — Assumed: the assistant still asks *Ready?* before a live view for an errand, because the payment question is the person's yes to buy and a puzzle goes stale; connecting tools keeps its own no-question rule.
- **2026-11-05** — Assumed: one-time codes stay in the chat or email, because they expire in minutes and Matthew named only the form's backup codes.
- **2026-11-05** — Assumed: saved everyday answers stay and move to their own page, because they are typed by the assistant from the chat and are not a form.
- **2026-11-05** — Assumed: the payment safety rules carry over: no picture while a card box holds a value, a reading only as text with card boxes hidden, and no second payment while the first may have gone through.
- **2026-11-05** — Assumed: PayPal keeps its live view, now the same turn as a card, because it already works that way.
- **2026-11-05** — Assumed: this change builds on connect-on-a-server's *Hand back*, *Stop*, the line and paste, and whichever change ships second catches up with the other.
- **2026-11-05** — Assumed: connect-on-a-server is not on `main` yet, so this change carries the least of its turn (the `turn` control, *Hand back* and *Stop*, the line, paste) in the same names and files; design Decision 6 records it.
- **2026-11-05** — Assumed: `close` on a window ends it as *handed back* and wakes no chat, because the person ended it from the chat.
- **2026-11-05** — Assumed: the context baseline stays as it is, because a new baseline sets each route's before to its after and the required reductions then fail; the removed files it names are allowed in `retired-names.json`.
- **2026-11-05** — Check: `scripts/tests/form.test.mjs` deleted, because the card form it tests is removed.
- **2026-11-05** — Check: `scripts/tests/form-page.test.mjs` deleted, because the card form page it tests is removed.
- **2026-11-05** — Check: `scripts/tests/passwords.test.mjs` deleted, because the password link it tests is removed.
- **2026-11-05** — Check: `scripts/tests/passwords-page.test.mjs` deleted, because the password page it tests is removed.
- **2026-11-05** — Check: `scripts/tests/live-pages.test.mjs` deleted, because the status lines it tests (the form's press, the sign-in count, the live line) are removed; the view's line is now the note, tested in `scripts/tests/view-page.test.mjs`.
- **2026-11-05** — Check: the timing tests now check only what ended a link and how long it was open, because the step lines and press times they read are removed with the form.
- **2026-11-05** — Check: removed the `browse.mjs` tests for `login`, `logins` and `forget`, because the commands are removed; a new test checks that `login` exits 2.
- **2026-11-05** — Asked, in a note while testing, where the line and buttons go → Matthew: *"for the hand back and stop can we have it beside the tap a box above bar at the bottom including the one line"*, and *"no need for darkmode thing here"*. The line, the type box, *Stop* and *Hand back* now sit in one bar under the site, and the view has no light and dark switch. This replaces the line at the top.
- **2026-11-05** — Asked, after seeing the bar on a phone, whether to remove *Stop* → chose to remove it. *Hand back* is the one button; to give up, the person hands back and says so in the chat, and the assistant asks before it does more on an unfinished page. The type box gets the freed room. Connect-on-a-server's *Stop* drops too when it catches up.
- **2026-11-05** — Assumed: the live sign-in on a real site (was task 6.2) moves to a follow-up after this is live, because Matthew asked to publish once the payment turn passed, and a sign-in uses the same turn and *Hand back*.
- **2026-11-05** — Assumed: the sign-in on a Mac window (was task 6.3) moves to a follow-up, because it can run only after this is live.
- **2026-11-05** — Done in the catch-up merge with connect-on-a-server: *saved logins* and *a private form* are dropped from *People handle API token websites in their own browser* (was task 5.5), and its scenario is now *A token request while the browser is signed in*.
- **2026-11-05** — Check: in the catch-up merge, the watch link's *Stop* tests in `scripts/tests/hand-over.test.mjs`, `scripts/tests/view-page.test.mjs` and `scripts/tests/connect-browser.test.mjs` now check that `/stop` is gone, that only *Take over* wakes the chat, and that a chat's `close --stopped` still ends the watch `stopped`, because *Stop* is removed from connect's watch link too.
- **2026-11-06** — Archive checkpoint: archived and numbered for publish; connect-on-a-server (v49.1.0) merged in first, with *Stop* removed from its watch link too.
- **2026-11-06** — Check: the kept check *A device set to dark* was replaced by this walk's: it now opens Home on a phone set to dark and reads a light page, and no longer opens Hello and Access, because the view this change touches has no switch and Home carries the promise.
- **2026-11-06** — Check: the kept check *Turn a page dark* was replaced by this walk's: it taps *Switch to dark* on Home, opens Hello dark, then switches back, the same steps as before with Hello's text as its expectation.

<!-- end proposal.md -->
<!-- file design.md utf8 12473 -->
# Design

## Context

Three private pages take sensitive input today, all opened by [`hand-over.mjs`](../../../.agents/skills/hand-over/scripts/hand-over.mjs):

- **The private form** (`open --form`, [`form.mjs`](../../../.agents/skills/hand-over/scripts/form.mjs), `form-page.*`): a card or a backup code, typed into our page and copied into the site's boxes by ref, then the site's button pressed once; from the press it shows the site live. [`wiki/development/private-form.md`](../../../wiki/development/private-form.md) owns it.
- **The password link** (`open --passwords`, `passwords.mjs`, `passwords-page.*`): logins saved to `~/.wong-stack/logins.json`, typed later by `browse.mjs login` ([`logins.mjs`](../../../.agents/skills/browser/scripts/logins.mjs)); `--site`, `--username`, `--email-first` and `--sign-in` shape it. [`wiki/development/passwords.md`](../../../wiki/development/passwords.md) owns it.
- **The live view** (`open --view`, [`view.mjs`](../../../.agents/skills/hand-over/scripts/view.mjs), `view-page.*`): noVNC over x11vnc on the browser's Xvfb screen, Linux only; a finish (`--until`, `--until-gone`, `--until-text`) or `--keep-open` with *I'm finished*. [`wiki/development/live-view.md`](../../../wiki/development/live-view.md) owns it.

The change *connect-on-a-server* (workspace pretty-frog, PR #517, not yet on `main`) adds to the view: a control state (`control.json`: `assistant`, `person`, `turn`, `stopped`), *Take over*, *Hand back* and *Stop* routes, a `line` command, a `turn <finish> --note` command, `wait` results `opened`, `taken-over`, `handed-back`, `signed-in`, `stopped`, and a paste anywhere on the view. Its latest decision: the link opens only for the person's turn, with one short line and no tag. This change reuses all of it.

Off Linux, [`browser-server.mjs`](../../../.agents/skills/browser/scripts/browser-server.mjs) starts no Xvfb and [`launch-config.py`](../../../.agents/skills/browser/scripts/launch-config.py) launches Camoufox with `headless=not display`, so a Mac or Windows browser has no window, and `checkView()` reports `unsupported`.

This machine has 290 saved logins in `logins.json`.

## Goals / Non-Goals

**Goals:**

- One place for sensitive input: the person types on the real site in the live view, and the agent sees nothing until the turn ends.
- One live view page: a line, *Hand back*, the type box, paste.
- A Mac or Windows browser with a window by default, where the person's turn happens.
- Remove the form, the password link, saved logins, and everything only they use.

**Non-Goals:**

- Streaming a Mac or Windows browser to a link.
- Moving one-time codes into the view.
- Changing the key link, reply links, saved details, or connect's watching.

## Decisions

### 1. Every live view is the person's turn

`open --view` opens the view with `control` set to `turn` from the start, the page showing `--note` as its one line, and *Hand back*. It ends on the first of: every named finish holds (`done`), *Hand back* (`handed-back`), `close`, or the time limit. `--keep-open` stays as "no finish": the turn ends only on *Hand back* or `close`, and `KEEP_OPEN`'s *I'm finished* is gone. `--note` becomes required, since the line is how the person knows what to do.

`wait` returns `done`, `handed-back`, `closed` or `timeout`; the agent reads the page afresh after any of them. There is no *Stop*: to give up, the person taps *Hand back* and says so in the chat. After `handed-back` on an unfinished step, the agent asks in the chat before it does more on that page.

*Alternative:* keep `--view` as it is and add a separate `--turn` mode. Rejected: two pages for the same job is the drift this change removes.

### 2. A payment is a turn with the site's receipt as its finish

The agent fills every ordinary answer, asks the pay question in the chat (*Pay City of Markham $45.00? Ready, send it / Not now*), then runs `open --view --until <receipt> --note "Type your card and press Pay $45.00, then tap Hand back."`. The person types the card and presses the site's Pay themselves. A backup code is the same with the site's next page as the finish.

After `done`, `handed-back` or a timeout, the agent runs the existing after-check, moved from `private-form.md` to `live-view.md`'s new *Pay or type a code* section: read the address and a snapshot (card boxes read `[hidden]`), no picture while a card box holds a value, say accepted, declined or can't tell, look for a receipt in email when it can, and never open a new payment turn while the payment may have gone through. A press that pays is the person's; the agent may press a step that pays nothing, such as *Continue*.

The form's watch-after-press (`unconfirmed`, `HANDOVER_WATCHING`, `HANDOVER_VIEWING`, `:late` completions) goes: the person sees the site the whole time and decides when to hand back.

*Alternative:* the person types, hands back, and the agent presses Pay after a chat yes. Rejected by Matthew's choice: the person sees the real total and the agent never presses Pay with their card.

### 3. Sign-ins happen in the view; saved logins go

At a login page, the agent opens a turn with the signed-in address as `--until` (or `--until-gone` with every login box), and `--note "Sign in to Netflix, then tap Hand back."`. The browser profile keeps the session, as it does today. A code or an app approval inside the turn is the person's to finish there, or, after *Hand back*, comes through [login codes](../../../wiki/development/login-codes.md) as today.

`browse.mjs login`, `logins`, `forget` and `--main-domain`, `logins.mjs`, and the `[hidden]` marking of a password the saved-login step typed go. `[hidden]` for password, card and code boxes by their kind stays. The old-browser cookie move (`moveLogins`) is not a saved login and stays.

`logins.json` is not deleted by code. The changelog's **Updating.** note becomes a sync to-do: the assistant asks once and, on a yes, deletes `~/.wong-stack/logins.json`. A delete can not be undone, so it waits for the yes.

*Alternative:* keep typing logins saved before, with no way to add one. Rejected by Matthew's choice: a list that only shrinks keeps the code and the plain-text file for little.

### 4. Off Linux, the browser shows in a window

`browser-server.mjs` passes a `--window` flag to `launch-config.py` off Linux unless `~/.wong-stack/browser-settings.json` holds `{"window": false}`; `launch()` then sets `headless=False` with no virtual display. `browse.mjs window on|off` writes the file and prints `BROWSE_WINDOW=on|off` and that it takes effect at the next start; `browse.mjs window` alone prints the setting. A running browser is never restarted for it, by [browsing's rule](../../../wiki/development/browsing.md#saved-browser-logins).

`checkView()` reports `window` when the running browser has one (the server's record gains `window: true`). `open --view` then opens no tunnel and no screen source: it brings the task's page to the front, records the turn, and its watcher reads the finish as today. It prints `HANDOVER_VIEW=window` and no `HANDOVER_LINK`. The agent tells the person the line in the chat with *say done*; `close` on *done* ends it as `handed-back`. With the window off, `HANDOVER_VIEW=unsupported` stays, and the step ends with [steps for you to finish](../../../wiki/development/finish-steps.md).

The fingerprint stays `os='linux'`, as today on every platform.

*Alternative:* stream a Mac browser's own frames to a link. Deferred: no one has tried it, and Matthew chose the window.

### 5. What goes, and where its docs land

| Goes | Kept part moves to |
|---|---|
| `form.mjs`, `form-page.*`, `picture-view.mjs`, the form and password routes, `PICTURED`, `servePicture`, `takePicture` | the payment turn and after-check: `live-view.md` |
| `passwords.mjs`, `passwords-page.*`, `--passwords`, `--site`, `--username`, `--email-first`, `--sign-in` | sign-in turn: `live-view.md`; `browsing.md` login steps |
| `wiki/development/private-form.md` | *Saved details* → new `wiki/development/saved-details.md`; *Other ways to pay* → `live-view.md` |
| `wiki/development/passwords.md` | nothing; *Save your passwords* section of `browsing.md` goes |
| `wiki/maintaining/time-the-private-form.md` | `lib/timings.mjs` keeps link endings and turn length only |

`private-page.css` stays for the key link. `scripts/retired-names.json` retires `private-form.md`, `passwords.md`, `time-the-private-form.md`, `form.mjs`, `passwords.mjs`, `picture-view.mjs`, `open --form`, `open --passwords`, `browse.mjs login`, `logins.json` (except in the changelog's **Updating.** note, which the check already skips), and *I'm finished*.

### 6. Building on connect-on-a-server

This branch starts from `main`. If connect-on-a-server ships first, `/apply` brings `main` in and builds on its `control`, `line`, `turn`, *Hand back*, *Stop* and paste. If this ships first, it carries the minimal part of those it needs (the `turn` control, the *Hand back* and *Stop* routes, the line) and connect-on-a-server catches up at its next save. Either way one copy of each route lives in `view.mjs`.

**Built (task 1.1, 2026-11-05):** connect-on-a-server (PR #517) is still open, not on `main`. This change carries the least of it: the `turn` control, the `/give` and `/stop` routes in `view.mjs` with that change's names and replies (200 `{control}`, 409 on a second press), the line from `--note`, and paste anywhere, copied from its page. It has no `control.json` and no `/watch` polling, because here the turn lasts the whole view.

Both changes edit the `browser-logins` requirement *People handle API token websites in their own browser*. This change leaves it alone for now, and drops its *saved logins* and *private form* words once connect-on-a-server's version is on `main`, so the two deltas never fight over one block.

## UX

### Use-case brief

The owner or a teammate, mid-errand, must give something only they hold: a card, a backup code, a password. The job: get it onto the real site without the assistant seeing it. Done: the assistant says *Paid. Receipt P0178390.* or *Signed in to Netflix.* in the chat. Mostly on a phone, the same device as the chat; sometimes a laptop. Common: one sign-in or one payment per errand, a few times a week. Edge: a site that asks for a code after the password, a card the site keeps on the page, a person who stops. The closest screen is today's live view page ([`view-page.html`](../../../.agents/skills/hand-over/scripts/view-page.html)) in connect's turn state; this mirrors it.

### Flow

Chat *Ready?* → tap *Ready* → open the link → type on the site (paste works) → press the site's button → the receipt ends the view, or tap *Hand back* → the chat carries on. On a Mac: *Ready* → type in the browser window → say *done*.

### Hierarchy

One action: *Hand back*. The line, the type box and *Hand back* sit in one bar under the site; nothing sits above it.

### Components

The live view's browser area, its type box, one line, two buttons. No new part.

### Review

The plan's [review page](review.html) sketches the view under *You type a card, a backup code or a password on the real site, in the live view*, and the lines for each step under *Every live view has the same bar*.

## Risks / Trade-offs

- [290 saved logins stop working on this machine] → each site asks for one sign-in in the view the next time it logs out; the browser keeps sessions, so most sites need none soon.
- [A scheduled run meets a logged-out site with no one to sign in] → it stops and tells the person in the chat, as any step that needs them does today; before, a saved login could cover it.
- [The person presses Pay twice] → the site's own guard is the only guard, as in their own browser; the line says *press Pay once*, and the after-check never asks again while the payment may have gone through.
- [A view's finish is missed and the person forgets *Hand back*] → the 8-hour limit ends it; the chat says so and reads the page.
- [A Mac window steals focus during an errand] → the window is the default by Matthew's choice; `browse.mjs window off` turns it off.
- [A Mac window with a Linux fingerprint looks odd to a site] → no change from today's headless Mac browser, which carries the same fingerprint.
- [connect-on-a-server and this change both edit `view.mjs`, `view-page.*` and `live-view.md`] → whichever ships second brings `main` in and keeps one copy of each route.

<!-- end design.md -->
<!-- file tasks.md utf8 6676 -->
# Tasks

## 1. Start from connect-on-a-server

- [x] 1.1 Check whether connect-on-a-server (PR #517) is on `main`. If it is, bring `main` in and build on its `control`, `turn`, `line`, *Hand back*, *Stop* and paste. If not, build the least of those this change needs (the `turn` control, the *Hand back* and *Stop* routes in `view.mjs`, the line from `--note`) in the same shape and file, so connect-on-a-server's later merge keeps one copy; record which in design.md Decision 6

## 2. The live view is the person's turn

- [x] 2.1 In `hand-over.mjs`, make `open --view` start as the person's turn: `--note` required as the one line, results `done`, `handed-back`, `closed`, `timeout`; `--keep-open` ends only on *Hand back* or `close`; verify with `hand-over.test.mjs` cases for each result and for a missing `--note` refused
- [x] 2.2 In `view-page.mjs` and `view-page.html`, show the line, the type box and *Hand back* in one bar under the site on every view, with no *Stop* and no light and dark switch; remove `KEEP_OPEN`'s *I'm finished*, the form's and sign-in's status lines (`liveLine`, `ending`'s payment text) and the *Done* button; verify with `view-page.test.mjs` cases on a phone and a wide shape, and a picture of a local view on this server
- [x] 2.3 Remove the form and password modes from `hand-over.mjs`: `--form`, `--passwords`, `--site`, `--username`, `--email-first`, `--sign-in`, `PICTURED`, `servePicture`, `takePicture`, the watch-after-press (`unconfirmed`, `HANDOVER_WATCHING`, `HANDOVER_VIEWING`, `:late`), and their routes and pages; delete `form.mjs`, `form-page.mjs`, `form-page.html`, `passwords.mjs`, `passwords-page.mjs`, `passwords-page.html`, `picture-view.mjs`; keep `private-page.css` for the key link; verify `open --form` and `open --passwords` exit 2 with the usage line, and delete `form.test.mjs`, `form-page.test.mjs`, `passwords.test.mjs`, `passwords-page.test.mjs`
- [x] 2.4 Trim `lib/timings.mjs` to what ended each link and how long it was open; verify with a `hand-over.test.mjs` case that a view's record holds no step lines and no typed value
- [x] 2.5 Update `live-pages.test.mjs`, `private-links.test.mjs`, `keys.test.mjs`, `reply-link.test.mjs` and `fixtures/practice-checkout.mjs` for the removed modes, keeping every key-link and reply-link case; verify they pass
- [x] 2.6 On this server, run a payment turn on the practice checkout (`fixtures/practice-checkout.mjs`): open `--view --until <receipt> --note "Type your card and press Pay $45.00, then tap Hand back."`, type a test card in the view and press Pay; verify `wait` prints `done`, then `browse.mjs snapshot` shows every card box `[hidden]` after a *Hand back* on the card page

## 3. Saved logins go

- [x] 3.1 In `browse.mjs`, remove `login`, `logins`, `forget`, `--main-domain` and the password-typed `[hidden]` marking, keeping `[hidden]` by a box's kind; delete `logins.mjs`; keep `moveLogins`; verify with `browse.test.mjs` that `login` exits 2 with the usage line, a password box and a card box still read `[hidden]`, and nothing reads `~/.wong-stack/logins.json`

## 4. A window off Linux

- [x] 4.1 Add `browse.mjs window [on|off]` over `~/.wong-stack/browser-settings.json` (`BROWSE_WINDOW=on|off`, and a line that it takes effect at the next start); in `browser-server.mjs`, pass `--window` to `launch-config.py` off Linux unless the setting is off, and record `window: true`; in `launch-config.py`, `headless=False` with no virtual display when `--window` is given; verify with `browse.test.mjs` cases over `platform` for the flag and the record, and a `launch-config` test that `--window` sets `headless` false
- [x] 4.2 In `view.mjs` and `hand-over.mjs`, report `window` from `checkView()` when the running browser has one; `open --view` then brings the task's page to the front, opens no tunnel or screen source, prints `HANDOVER_VIEW=window` and no `HANDOVER_LINK`, and its watcher reads the finish; `close` ends it as `handed-back`; verify with `hand-over.test.mjs` cases on a stubbed `darwin` record: no tunnel starts, `done` on the finish, `handed-back` on `close`, and `HANDOVER_VIEW=unsupported` with the window off

## 5. Skill, wiki and release

- [x] 5.1 Rewrite `wiki/development/live-view.md`: one turn for every case (*When it opens* gains a payment, a backup code and a sign-in), the line and *Hand back*, a *Pay or type a code* section with the after-check and *Other ways to pay* from `private-form.md`, and *On a Mac or Windows* with the window and `browse.mjs window`; keep it under 3,000 words
- [x] 5.2 Update `wiki/development/browsing.md` (opening line, login steps 2 and 3 to a sign-in turn, *When a step needs you*, *How private links work* to two links, the no-picture rule, drop *The private form* and *Save your passwords*), `login-codes.md`, `required-tools.md`, `secrets.md`, `shopping.md`, `wiki/development/README.md`, `wiki/maintaining/README.md`, `wiki/stack/api-keys.md`, `wiki/stack/connect-your-tools.md`, `.agents/skills/verify/references/walkthrough.md`, the wong-setup seed `wiki-development-README.md`, and `AGENTS.md`'s *Browse as the person* rule (the live view in place of saving passwords, same length)
- [x] 5.3 Move *Saved details* to a new `wiki/development/saved-details.md`, linked from `wiki/development/README.md` and `browsing.md`; delete `private-form.md`, `passwords.md` and `wiki/maintaining/time-the-private-form.md`; update `hand-over/SKILL.md` to the key link, the live view and reply links; update `shop.mjs`'s `spend-request` reason to name the live view, with its test
- [x] 5.4 Update `.agents/verification/journeys/shared-look/*.json`, `payload-files.json`, `areas.json`, the document-retrieval fixture `browsing.md` only if its test reads the removed text, and `scripts/fixtures/context-baseline.json` by `measure-context.mjs`'s own update; retire the removed names in `scripts/retired-names.json` (design Decision 5)
- [x] 5.6 Add `## Next (major) — The live view is the one place for sensitive input` to the top of `CHANGELOG.md`, its **Updating.** note in plain words: the card form and the password page are gone; saved passwords stop working and each site asks for one sign-in in the live view; the assistant asks once whether to delete the old saved-passwords file (`~/.wong-stack/logins.json`) and deletes it only on a yes; on a Mac the browser now opens in a window, and *don't show the browser window* turns it off

## 6. Check

- [x] 6.1 Run `node .github/scripts/checks.mjs --worktree` (payload links, retired names, context budget, OpenSpec config and script tests) and `openspec validate live-view-for-sensitive-input --strict --no-interactive`, and verify both pass

<!-- end tasks.md -->
<!-- file specs/asking-the-user/spec.md utf8 1393 -->
## MODIFIED Requirements

### Requirement: Every reply that returns control ends with the next step

A reply that hands control back SHALL end with the decision that moves the work on, asked in the choice format through the question tool, with the report and every link written as chat text above it. A link SHALL NOT appear inside the question tool's question or options, and SHALL NOT appear only in the agent's reasoning; an option may name a link shown above it. A handoff the invocation already authorized SHALL continue instead of asking. The only replies that end with no question are a finished plan's, which ends with its link and a line telling the person to review it, and the answers to *Review the plan* and *See the preview*.

#### Scenario: A stage finishes

- **WHEN** a skill finishes and a structured question tool is callable
- **THEN** the report is chat text, and the next steps are asked through the tool, recommended first

#### Scenario: The chain continues

- **WHEN** `/ship` moves from one of its stages to the next
- **THEN** it continues without a next-step question

#### Scenario: A link the person needs

- **WHEN** a reply gives the person a link, such as a pull request, a key link, or a live view, and ends with a question card
- **THEN** the full link is a line of chat text above the card, and neither the card's question nor its options holds the address

<!-- end specs/asking-the-user/spec.md -->
<!-- file specs/browser-logins/spec.md utf8 22614 -->
## ADDED Requirements

### Requirement: Sensitive input is typed only on the real site in a live view

A payment card, a backup or recovery code, a password, and any other lasting secret a page asks for SHALL be typed by the person on the site's own page, in a live view of the agent's browser, never in the chat and never in a page of the agent's own. The agent SHALL first fill the page's ordinary answers and ask in the chat whether the person is ready, naming what the step is for. The live view SHALL show one short line saying what to do now. The agent SHALL NOT read, picture, or act on its browser from the moment the view opens until the person's turn ends. The turn SHALL end when the site meets the finish the agent named, when the person taps *Hand back*, when the chat closes it, or at its time limit. The agent SHALL learn only how the turn ended, then read the page afresh.

#### Scenario: A sign-in

- **WHEN** a task meets Netflix's login page and the browser is not signed in
- **THEN** the agent asks whether the person is ready, sends a live view whose line says to sign in and tap *Hand back*, the person signs in there, and the agent carries on signed in, never having seen the password

#### Scenario: A backup code

- **WHEN** a site asks for a backup code
- **THEN** the agent does not ask for it in the chat, the person types it on the site in a live view, and the stored chat never holds it

### Requirement: The person presses a payment's button

For a card payment, the person SHALL type the card and press the site's own pay button in the live view; the agent SHALL NOT press a button that pays with the person's card. The pay question in the chat, naming the purchase and its total, SHALL come before the view opens. After the turn, the agent SHALL read the page only as text in which every card box is hidden, SHALL take no picture while a card box holds a typed value, and SHALL tell the person whether the site accepted, declined, or can't be told. It SHALL NOT open another payment turn while the payment may have gone through.

#### Scenario: A card from a phone

- **WHEN** the person types a card in the live view, presses the site's *Pay $45.00*, and the site shows its receipt
- **THEN** the view ends by itself, and the chat carries on with a picture of the receipt

#### Scenario: Handed back with no receipt

- **WHEN** the person taps *Hand back* while the site still shows its card page
- **THEN** the agent reads the page as text with the card boxes hidden, takes no picture, and says the payment is not confirmed rather than asking the person to pay again

### Requirement: On a computer with its own screen, the turn happens in the browser's window

On a Mac or Windows computer, the agent's browser SHALL open in a window on the screen by default, and the person's turn SHALL happen in that window: the chat SHALL say what to do and to say *done*, and the turn SHALL end on the finish or on *done*. The person SHALL be able to turn the window off, taking effect at the next browser start, never by restarting a running browser. With the window off, a step that needs the person SHALL end with steps to finish in their own browser.

#### Scenario: A sign-in on a Mac

- **WHEN** a task on a Mac with the window on meets a login page
- **THEN** no link is sent, the chat asks the person to sign in in the browser window and say *done*, and the agent carries on once the page shows them signed in

#### Scenario: The window turned off

- **WHEN** the person on a Mac has turned the window off and a site asks them to sign in
- **THEN** the agent sends no link and gives them steps to finish in their own browser

### Requirement: An update stops using saved passwords and offers to delete them

An update that removes saved logins SHALL leave the saved-passwords file unread and untouched by code, and SHALL ask the person once whether to delete it, deleting it only on a yes. The browser's own sign-ins SHALL be kept.

#### Scenario: Updating an install with saved logins

- **WHEN** an install with saved logins takes the update
- **THEN** the person is asked once whether to delete the saved-passwords file, the file stays unless they say yes, and sites already signed in in the browser stay signed in

### Requirement: Every live view shows one line and Hand back

Every live view SHALL show, in one bar under the site, one short line saying what the person should do now, the type box, and one *Hand back* button. *Hand back* SHALL end the turn and return the browser to the agent. When the step is not finished after *Hand back*, the agent SHALL ask in the chat before it takes a further step on that page.

#### Scenario: A stuck step

- **WHEN** the person taps through DigiKey's stuck *Continue* in a live view and taps *Hand back*
- **THEN** the link ends, the chat is told, and the agent reads the page afresh

#### Scenario: Give up on a payment

- **WHEN** the person taps *Hand back* in a payment's live view without pressing Pay, and says in the chat to stop
- **THEN** the link ends, the agent presses nothing on that page, and the chat says the payment was not finished

### Requirement: A private link records what ended it without values

Each private link SHALL record what ended it and how long it was open, on the agent's computer and outside the repo. The record SHALL hold no typed value, and SHALL stay small by keeping only recent entries.

#### Scenario: A link that closed by itself

- **WHEN** a link closes before anyone opens it
- **THEN** the record names what closed it: a close command, a signal, the person's own close, or the time limit

### Requirement: A step that needs the person goes to the chat or the live view

When a browsing step needs something only the person can give, an ordinary answer (an email, a name, an address, a choice, agreeing to terms) SHALL be asked in the chat and entered by the agent, and the agent SHALL NOT agree to terms without the person's yes. A sensitive value, a sign-in, a check that asks whether a person is present, a site step the agent's click can not get through, and a PayPal approval SHALL go through a live view. A one-time code SHALL follow the login-code requirement, and an API key or token step the own-browser requirement. A sign-in while connecting tools in the agent's own browser, and watching it when the person asks, with taking over, SHALL follow the own-browser connect requirements. A step only the person's own device can do (a passkey or a device check) SHALL NOT be attempted by the agent: the agent SHALL stop that step and hand it back in the chat as numbered steps for the person's own device: one action each, a direct link to the page for each step that has one, the site's own labels, and the details the agent already has, never an invented address.

#### Scenario: A payment page asks for an email, terms, and a card

- **WHEN** a checkout page asks for an email, a terms tick, and card details
- **THEN** the agent asks for the email and the terms in the chat, enters them itself, and sends a live view for the card only

#### Scenario: A passkey

- **WHEN** a site asks for a passkey
- **THEN** the agent sends no private link, stops that step, and gives the person numbered steps, each with its link, to finish on their own device

### Requirement: Every private link opens through Cloudflare and closes itself

A key link and a live view SHALL each open at a new address through Cloudflare's tunnel, with a secret key only the link carries, including when the person is at the computer the agent runs on. The agent SHALL give the person a link only once it answers from outside that computer. A key link SHALL default to a 24-hour time limit from opening, a live view to eight hours, and each SHALL honor an explicit time override. A link SHALL stop working on its finish, on closure, or at its time limit, even if the agent's session has ended, and a closed link SHALL never work again. When the computer can reach the person's inbox, every private link SHALL also be listed there while it is open, with its title, kind, closing time and address only; nothing typed into it SHALL pass through the app, and opening the link SHALL never wait on the listing.

#### Scenario: The person sits at the agent's computer

- **WHEN** the person needs to sign in to a site while at the computer the agent runs on
- **THEN** the live view's link is a Cloudflare address, the same kind a phone would get

#### Scenario: Nobody finishes

- **WHEN** 24 hours pass on a key link without a save or a close
- **THEN** the link stops working, and the agent tells the person it timed out and offers a new one

### Requirement: The agent pictures its browsing in the chat, never a typed card

During a browsing task, the agent SHALL show the person a picture of the page in the chat at each key moment: a new page, right before an action that sends, books, or pays for something, and the result. It SHALL NOT show a picture after every action, nor repeat a page that has not changed. It SHALL keep the pictures out of the repo, take none while a live view is open, and take none while a card box holds a typed value.

#### Scenario: A booking

- **WHEN** the agent opens a booking page, fills it, and books
- **THEN** the chat shows the page, the filled form before booking, and the confirmation, each with a line saying what it shows

#### Scenario: A card left on the page

- **WHEN** the person hands back a payment's live view with the card still in the site's boxes
- **THEN** no picture appears until the card boxes are gone or empty

### Requirement: A page reading hides every filled secret box

Every way the agent reads a page's text SHALL show a filled secret box only as filled, never its contents. A box SHALL count as secret when it is a password box, or when its label or kind names a password, passcode, PIN, card number, card expiry, security code, or one-time code, in the page or in any frame, even after the site switches it to plain text. An empty secret box, a dropdown's picked choice, and every other box SHALL read as before.

#### Scenario: A card box the person filled

- **WHEN** the agent reads a checkout page whose card number box still holds the number the person typed in a live view
- **THEN** that box reads as filled and hidden, by the page reading and by asking for that one box's contents

#### Scenario: A frame shows the typed password as text

- **WHEN** the person typed a password into a frame from another site, and the site then shows the box's value as text
- **THEN** the page text shows `[hidden]` for that box

## MODIFIED Requirements

### Requirement: People handle API token websites in their own browser

When a task needs a website to get, create, reveal, copy, rotate, edit permissions for, or revoke an API key or token, the agent SHALL ask the person to do that step in their own browser, providing the service's token-management link and short instructions including required permissions when relevant. When a new or replacement value is to come back, that link and those instructions SHALL be on the private key link's page; for a change needing no new value they SHALL be in the chat. It SHALL NOT use its own browser, screenshots, or page extraction for that token step. The one exception SHALL be connecting a tool, where the person said yes to the agent using their own open Chrome, or the agent uses its own browser by the own-browser connect requirements: the agent MAY then make the key in that browser by the own-browser connect requirements. A newly supplied or replacement value SHALL otherwise use the existing private key link; a change needing no new value SHALL wait for the person's confirmation. The agent SHALL resume dependent work only after the required value is saved or the person confirms completion. Ordinary website tasks, use of stored credentials, and existing authorized token management through APIs SHALL continue unchanged.

#### Scenario: A token request while the browser is signed in

- **WHEN** a task needs a missing API token and the agent's browser is signed in to the service
- **THEN** it sends the private key link, whose page carries the token-management link and steps, without opening the service in its browser, receives the value there, and then resumes

#### Scenario: A token edit during an ordinary browsing task

- **WHEN** an ordinary browsing task reaches a step requiring a token permission change or revocation
- **THEN** the agent stops browser interaction for that step, gives the person the website link and instructions, waits for confirmation without taking token-page pictures or extracting its content, and resumes ordinary work afterward

#### Scenario: Connecting in the person's own Chrome

- **WHEN** the owner connects Stripe and says yes to the agent using their own Chrome
- **THEN** the agent makes the Stripe key in that Chrome, and no key-page picture or reading holds the key

#### Scenario: Connecting in the agent's own browser on a server

- **WHEN** the agent runs on a server and the owner says *connect my Notion*
- **THEN** the agent makes the Notion key there, the owner signs in through a link if asked, and no key-page picture or reading of the agent's holds the key

### Requirement: The person does each login once

The person SHALL sign in to a site once, in a live view or the browser's window, and the agent SHALL then reuse the browser's session. The agent SHALL NOT ask for a password in the chat, and SHALL NOT read, show, type, or store a password.

#### Scenario: A later visit

- **WHEN** a later task opens a site the person signed in to
- **THEN** no sign-in step is needed

#### Scenario: A password offered in the chat

- **WHEN** the person starts typing a password into the chat
- **THEN** the agent does not use or save it, and offers a live view to sign in instead

### Requirement: The agent confirms an outward browser action in the chat

Before a browsing task publishes, sends, books, pays for, or deletes something, the agent SHALL ask the person in the chat, naming exactly what it will do, and SHALL act only on a yes. A payment with the person's card SHALL be pressed by the person in a live view, after the chat's pay question.

#### Scenario: Publishing a website

- **WHEN** the agent has a website ready and the next click publishes it
- **THEN** the chat asks whether to publish it now, the question waits however long the person takes, and the agent clicks publish only after a yes

### Requirement: The agent gets a login code through the chat or email

When a sign-in reaches a one-time code step after the person's turn, the agent SHALL get the code from the person's email when the agent's browser is already signed in to it, else by asking in the chat, naming the site and where the code was sent, and SHALL enter the code itself. An emailed sign-in link SHALL be handled the same way. Reading email, it SHALL open only the newest message from that site, SHALL show no picture of the inbox, and SHALL say in the chat that it took the code from the email. It SHALL NOT sign in to email to fetch a code. A backup or recovery code SHALL be typed by the person in a live view, never the chat. For an approve-on-your-device prompt, it SHALL ask the person in the chat to approve and wait, with no link.

#### Scenario: A code sent by text

- **WHEN** the person handed back after signing in and the site then texts a code to the person
- **THEN** the agent asks for the code in the chat, enters it, and carries on, sending no link

#### Scenario: A code sent to an email the browser is not signed in to

- **WHEN** the site emails a code and the agent's browser is signed out of that email
- **THEN** the agent asks for the code in the chat and does not try to sign in to the email

### Requirement: Browsing tasks share the personal browser

Two browsing tasks, or a task and a scheduled run, SHALL each use their own pages in the one personal browser and the same sign-ins, without waiting on each other and without one closing the other's pages. Preview checks SHALL NOT use the personal browser or its sign-ins.

#### Scenario: A scheduled run during a task

- **WHEN** a scheduled run starts while a chat is browsing
- **THEN** both carry on, each in its own pages, and neither reports the browser busy

#### Scenario: A preview check

- **WHEN** `/verify` walks a preview
- **THEN** it uses its own temporary browser with none of the person's sign-ins

### Requirement: A live view shows the whole page and closes itself

A live view SHALL show the page fitted to the person's screen, on a phone as on a laptop, with the step and its buttons in view, and SHALL put the page back as it was when it closes. It SHALL let the person type and paste into the page from a phone. It SHALL open at a new address through Cloudflare's tunnel with a secret only the link carries, SHALL show and accept nothing without that secret, and SHALL stop working when the site meets its finish, when the person taps *Hand back*, when the chat closes it, or at its time limit, eight hours unless a shorter one is asked, even if the agent's session has ended. A closed link SHALL never work again.

#### Scenario: A puzzle on a phone

- **WHEN** the person opens a live view on a phone
- **THEN** the whole puzzle shows, its button included, and no part of it is cut off

#### Scenario: Nobody finishes

- **WHEN** eight hours pass on a live view without a finish or *Hand back*
- **THEN** the link stops working, the page is put back as it was, and the agent tells the person it timed out and offers a new one

### Requirement: A page stays open while a private link is using it

While a live view is open, the page it shows SHALL stay open for as long as the link does, however long the person leaves it untouched. Keeping it open SHALL type nothing, press nothing, and go to no other address, and SHALL read nothing the person typed.

#### Scenario: A slow card

- **WHEN** the person presses Pay in a live view seven minutes after it opened
- **THEN** the site's page is the one the agent filled, with the person's card in its boxes

#### Scenario: A puzzle left for an hour

- **WHEN** the person comes back to a live view after an hour
- **THEN** it shows the same page, not a blank screen or a page opened afresh

### Requirement: Every private input page starts calm

A key link SHALL open with a label naming it a private link and, above its first field, one plain line saying that what the person enters stays out of the chat. It SHALL offer *Not now*, which closes the link. It SHALL show when it closes as a time of day on the person's clock, naming the day when it is not today, counted in minutes only in its last ten minutes. A key page with several keys SHALL say how many are saved, and once every key is saved SHALL show that all is set.

#### Scenario: A first-time key

- **WHEN** the person opens a 24-hour key link at 5:30 AM
- **THEN** the page shows a private-link label, the privacy line above the field, *Open until 5:30 AM tomorrow*, and *Not now*

#### Scenario: The last minutes

- **WHEN** a key link has nine minutes left
- **THEN** the page shows *Closes in 9 min*, timed on the watcher's clock

## REMOVED Requirements

### Requirement: The person saves logins through a private password link

**Reason**: The password link is removed; the person signs in on the real site in a live view.
**Migration**: Sign in once in a live view; the browser keeps the session.

### Requirement: The agent logs in with a saved login

**Reason**: Saved logins are no longer typed.
**Migration**: A logged-out site gets a live view for the person to sign in.

### Requirement: A login with no saved password gets a pre-filled password link

**Reason**: The password link is removed.
**Migration**: A sign-in goes through a live view.

### Requirement: A step that needs the person goes to the chat or a private form

**Reason**: The private form is removed; replaced by *A step that needs the person goes to the chat or the live view*.
**Migration**: A sensitive value goes through a live view.

### Requirement: An update leaves earlier saved logins untouched

**Reason**: Saved logins are no longer used; replaced by *An update stops using saved passwords and offers to delete them*.
**Migration**: None.

### Requirement: A live view gets the person past a robot check or a stuck login

**Reason**: Every sign-in and every sensitive value now uses the live view; replaced by *Sensitive input is typed only on the real site in a live view* and *Every live view shows one line and Hand back*.
**Migration**: None.

### Requirement: A payment the site has not confirmed is never called refused

**Reason**: The form's watch after its press is removed; the person presses Pay and sees the site.
**Migration**: *The person presses a payment's button* keeps the no-second-payment rule.

### Requirement: A private form keeps a timing record without values

**Reason**: The private form is removed; replaced by *A private link records what ended it without values*.
**Migration**: None.

### Requirement: A saved login is typed only on its saved site

**Reason**: Saved logins are no longer typed.
**Migration**: None.

### Requirement: A login reports a next step apart from a wrong password

**Reason**: The saved-login command is removed.
**Migration**: None.

### Requirement: A login may try a sibling subdomain once on request

**Reason**: Saved logins are no longer typed.
**Migration**: None.

### Requirement: A private form takes sensitive details and shows the site from the press

**Reason**: The private form is removed.
**Migration**: A card or a backup code is typed on the site in a live view.

### Requirement: Nothing a private form carries reaches the agent

**Reason**: The private form is removed; *Sensitive input is typed only on the real site in a live view* keeps the agent from seeing it.
**Migration**: None.

### Requirement: Every private link goes through Cloudflare and closes itself

**Reason**: A scenario named a removed form or saved login; replaced by *Every private link opens through Cloudflare and closes itself*.
**Migration**: None.

### Requirement: The agent pictures its browsing in the chat

**Reason**: A scenario named a removed form or saved login; replaced by *The agent pictures its browsing in the chat, never a typed card*.
**Migration**: None.

### Requirement: A page reading never shows what a secret box holds

**Reason**: A scenario named a removed form or saved login; replaced by *A page reading hides every filled secret box*.
**Migration**: None.

<!-- end specs/browser-logins/spec.md -->
<!-- file specs/connect-tools/spec.md utf8 483 -->
## MODIFIED Requirements

### Requirement: A website with no API is not connected yet

For a tool the company app can not reach by a key, such as the person's own mail, the helper SHALL say it is not connected yet. It SHALL NOT sign in to that site, open its own browser, or send a live view while connecting.

#### Scenario: The person's own mail

- **WHEN** the person names their own Gmail
- **THEN** the list shows it as not connected yet, and no browser page or live view opens

<!-- end specs/connect-tools/spec.md -->
<!-- file specs/dependencies/spec.md utf8 814 -->
## MODIFIED Requirements

### Requirement: A private link adds one tool

A private link (the key link or a live view) SHALL be the one step that needs Cloudflare's tunnel tool, including at the computer the agent runs on. Setup SHALL offer it up front; on any other machine without it, the agent SHALL install it with the person's consent the first time a private link needs it. It SHALL add nothing to the repository.

#### Scenario: A first private link

- **WHEN** a task needs a key link on a machine where the tunnel tool is absent
- **THEN** the agent asks before installing it on the machine, and adds nothing to the repo

#### Scenario: A machine readied by setup

- **WHEN** a task needs its first private link on a computer readied by setup
- **THEN** the link opens with no install step and no question

<!-- end specs/dependencies/spec.md -->
<!-- file specs/own-browser-connect/spec.md utf8 1734 -->
## MODIFIED Requirements

### Requirement: The person can take over or stop the assistant's browser

When the assistant makes keys in its own browser, it SHALL start at once, report in the chat, and send no link unless a sign-in needs one or the person asks to watch. An open link SHALL show that browser live, with one short line under it that says what the person can do now. While the assistant works, the person's taps and typing SHALL NOT reach the browser. The person SHALL be able to take over at any time from the link, after which the assistant SHALL send its browser no command and read nothing from it until the person hands back, and SHALL then read the page afresh before it goes on. The person SHALL be able to stop at any time in the chat, after which the assistant SHALL make no more keys, SHALL keep the keys already saved, and SHALL list the rest as waiting. The link SHALL save nothing the person types, and SHALL close when the run ends.

#### Scenario: Already signed in

- **WHEN** the owner says *connect my Notion* and the assistant's browser is already signed in to Notion
- **THEN** the assistant makes the key with no link sent, and the chat shows only the key's last four characters

#### Scenario: Taking over mid-run

- **WHEN** the person taps take over in an open link while the assistant is on Notion's integrations page
- **THEN** the assistant's next step does not run, the person's taps reach the browser, and after hand back the assistant reads the page again and goes on

#### Scenario: Stopping

- **WHEN** the person says stop in the chat after the Stripe key is saved and before the Notion key is made
- **THEN** Stripe stays saved, no Notion key is made, and the chat lists Notion as waiting

<!-- end specs/own-browser-connect/spec.md -->
<!-- file specs/private-links/spec.md utf8 3349 -->
## MODIFIED Requirements

### Requirement: One link per chat, several chats at once

Each chat SHALL have its own private-link place, named by its folder. A link from one chat SHALL open while another chat's link is open, and neither SHALL close, replace, or read the other. `wait` and `close` SHALL act only on the calling chat's link, and a finished link SHALL wake only the chat that opened it.

#### Scenario: Two chats

- **WHEN** chat A has a live view open and chat B opens a key link
- **THEN** both links are open, and saving the key wakes only chat B

#### Scenario: Close is per chat

- **WHEN** chat A has a key link open and chat B runs `close` during its `/close`
- **THEN** chat A's key link stays open

### Requirement: A blocked open names its holder

When a link can't open, the message SHALL name the chat folder that holds the place.

#### Scenario: Same chat busy

- **WHEN** a chat with an open live view asks for a key link
- **THEN** the open fails and the message names that chat

### Requirement: A live view can stay open until the person closes it

A live view opened to stay open SHALL take no finish, and SHALL end only when the person taps *Hand back* on its page, when the chat closes it, or at its time limit. It SHALL stay open through every page change on the site.

#### Scenario: Several steps in one view

- **WHEN** the person taps through two checkout steps in a view that stays open
- **THEN** the view stays open until the person taps *Hand back*

### Requirement: The agent checks an unclear payment without seeing the card

After a payment turn that ended without a clear answer, the agent SHALL read the site's page only as text in which every card box is hidden, and SHALL take no picture while a card box still holds a typed value. It SHALL tell the person whether the site accepted, declined, or can't be told, and SHALL never open a new payment turn while the payment may have gone through. It MAY press a site step that pays nothing; a press that pays SHALL be the person's, in a live view, after a pay question that names the purchase.

#### Scenario: The site saved the card and stayed

- **WHEN** the person handed back and the page shows the saved card's last digits and a Continue step
- **THEN** the agent says the site saved the card, may press Continue, and asks before the person places the order

#### Scenario: No answer on the page

- **WHEN** the page shows neither a receipt nor an error
- **THEN** the agent says the payment is not confirmed, looks for the store's receipt in email when the chat has an email tool, and tells the person not to pay again until it is known

## REMOVED Requirements

### Requirement: A form shows the site live from the press

**Reason**: The private form is removed; the person sees the site in the live view from the start.
**Migration**: None.

### Requirement: A changed page stops the form before typing

**Reason**: The private form is removed; the person types on the site's own page.
**Migration**: None.

### Requirement: A form leaves a pressed card alone

**Reason**: The private form is removed; nothing but the person types in the card boxes.
**Migration**: None.

### Requirement: A password link can sign in and turn into a live view

**Reason**: The password link is removed; a sign-in is a live view from the start.
**Migration**: None.

<!-- end specs/private-links/spec.md -->
<!-- file specs/reply-links/spec.md utf8 558 -->
## MODIFIED Requirements

### Requirement: Reply links and private links stay apart

An open reply link SHALL never stop a key link or a live view from opening, nor the reverse, and several pages MAY hold reply links at once. A reply link SHALL never be used to collect a secret, and nothing in this capability SHALL let a private link's page content reach the chat.

#### Scenario: A key is needed during a review

- **WHEN** a plan's reply link is open and the assistant needs a key
- **THEN** the key link opens at once, and the plan's link keeps working

<!-- end specs/reply-links/spec.md -->
<!-- file specs/saved-details/spec.md utf8 2131 -->
## MODIFIED Requirements

### Requirement: Only everyday answers are saved

The agent SHALL save a detail only when the person gave it in the chat and chose to keep it: an everyday answer such as an email, a name, an address, or a phone number. The chat SHALL ask once per form whether to keep its everyday answers, with the answers shown. A card, a password, or a code SHALL never be saved this way, and nothing typed in a live view SHALL be saved. Saved details SHALL live on the agent's computer, outside every repo, readable only by its account. Saving a set like one already saved SHALL replace it, never add a copy.

#### Scenario: An address answered in the chat

- **WHEN** the agent asks for a shipping address in the chat and the person answers and chooses to keep it
- **THEN** the address is saved, and the next form asking for an address can use it

#### Scenario: A card is never saved

- **WHEN** the person pays with a card in a live view
- **THEN** nothing they typed is saved, and the next payment is typed in a live view again

### Requirement: A card saved before is deleted

A card saved by an earlier version SHALL be deleted the next time saved details are read, and SHALL never be filled into a form.

#### Scenario: An install that saved a card

- **WHEN** an install that saved *card ending 4242* updates, and saved details are next read
- **THEN** the card is gone from the saved details, any everyday answers stay, and the next payment is typed in a live view

### Requirement: A saved answer fills a form after a yes in the chat

When a page asks for everyday answers that a saved set holds, the agent SHALL ask in the chat before using it, showing the answers: *Use me@x.com and 1 Main St?* On yes, the agent SHALL type them into the site's boxes as it types any chat answer. A saved answer SHALL never stand in for a card.

#### Scenario: A second order to the same address

- **WHEN** a later checkout asks for a shipping address and the person says yes to *Use 1 Main St?*
- **THEN** the agent types the saved address into the site and carries on to the card, which the person types in a live view

<!-- end specs/saved-details/spec.md -->
<!-- file specs/secrets-convention/spec.md utf8 960 -->
## MODIFIED Requirements

### Requirement: The key link waits for the person

A key link SHALL stay open for 24 hours by default from when it is opened, and its page SHALL show the time left. An explicit time override SHALL be honored. A key link nobody has opened SHALL close at once when another private link is opened on the same computer; the agent SHALL then say the link closed and offer a new one. An opened key link SHALL keep its place: a second link SHALL NOT open until it ends.

#### Scenario: A slow sign-in at the service

- **WHEN** the person opens a key link 5 minutes after it was sent, then takes 15 minutes to sign in at the service
- **THEN** the page is still open, and the pasted key is saved

#### Scenario: A link nobody opened

- **WHEN** a key link sits unopened and another chat on the same computer needs a live view
- **THEN** the key link closes, the live view opens, and the first chat says its link closed and offers a new one

<!-- end specs/secrets-convention/spec.md -->
<!-- file specs/shared-look/spec.md utf8 2459 -->
## MODIFIED Requirements

### Requirement: Standalone pages take the app's look

The plan review page, the key link, the live view, and a closed link's page SHALL use the app's colours, read from the app's one stylesheet when it is present and shadcn's neutral colours when it is not. Each SHALL start light whatever the device's setting, draw its buttons, fields, cards, and tags in the same shapes as the app's ready-made parts, and give each screen state one filled primary action. Red SHALL mark only a problem. A standalone page SHALL still load nothing from the network.

#### Scenario: A rebranded app carries its colours

- **WHEN** the app's stylesheet sets a different primary colour and a plan's review page is built, then a key link is opened
- **THEN** both pages draw their primary button in that colour

#### Scenario: A device set to dark

- **WHEN** a person whose device is set to dark, who has never used the switch, opens a plan's review page, a key link, or Home
- **THEN** each shows the same light surfaces and dark text it shows on a light device

### Requirement: A light and dark switch on every page

The app's pages, every mini app's included, the plan review page, and the key page SHALL show one button in the top right that switches between light and dark. It SHALL show a moon while light and a sun while dark, carry an accessible name saying what it switches to, and be at least 44 pixels square. A tap SHALL switch the page at once without a reload, and the browser SHALL remember the choice for that site so the next page opened there starts in it, with no flash of the other look. Dark SHALL use the dark colour set in the app's stylesheet, falling back to shadcn's neutral dark, with readable text. A closed link's page and the live view SHALL carry no switch; the live view always shows light.

#### Scenario: Turn a page dark

- **WHEN** a person opens Home and taps the moon in the top bar
- **THEN** the page turns dark at once, the button shows a sun, and opening a mini app on the same site shows it dark

#### Scenario: The review page remembers

- **WHEN** a person turns a plan's review page dark, then opens it again
- **THEN** it opens dark, with dark surfaces and readable text on the body, a card, and the bar

#### Scenario: A rebranded dark set

- **WHEN** the app's stylesheet sets a different dark background and a key link is opened and switched to dark
- **THEN** the key page uses that dark background

<!-- end specs/shared-look/spec.md -->
<!-- file specs/shopping/spec.md utf8 854 -->
## MODIFIED Requirements

### Requirement: The agent never sees a payment secret from Shop

A card number, a payment credential, or the Shop sign-in SHALL NOT appear in any command, output, log, message, or repository file the agent can read. Of a saved payment method the agent SHALL see only what names it to the person, such as brand and last digits. The agent SHALL NOT obtain a card issued for it to type into a website.

#### Scenario: A checkout lists saved cards

- **WHEN** a checkout returns the person's saved payment methods
- **THEN** the agent sees each one's brand and last digits, and no credential

#### Scenario: A website outside Shop's checkout

- **WHEN** a purchase can only be made by typing a card into a website's own form
- **THEN** the agent requests no card from Shop, and the person types the card on the site in a live view

<!-- end specs/shopping/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-11-05

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 120083 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker, puts the app's look (look.mjs) at the look marker, the light and dark switch (theme.js) at the
  theme marker, and the change name in place of its token. The one script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes: each button shows when the link offers it.
  A preview page (data-kind="preview", from apply's preview-review.mjs) names the finished build and offers Publish.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-11-05-live-view-for-sensitive-input</title>
<style>
  /* The app's look for pages outside the app: the plan review page, the private pages, and a closed link's page.
   look.mjs swaps the colour sets between the markers for the app's own, from app/src/index.css; this copy of
   shadcn's neutral light and dark colours stays only for a colour it can't find. Every page starts light, even on a
   dark device; theme.js adds `.dark` to the root element when the person switches, and draws the switch (.theme-toggle).
   The parts below draw app/src/components/ui/ (button, input, card, badge, skeleton) in plain CSS. Each sits in
   :where(), so a page's own rule always wins.
   Nothing here loads a file: these pages fetch nothing from the network. */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

/* Tailwind's shadow-xs, shadow-sm and shadow-lg; Radix's popover shadow, and its upward twin for a box docked at the
   bottom, so a layer reads as above the page; and the 3px focus ring at half strength. */
:root {
  color-scheme: light;
  --look-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --look-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --look-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --look-shadow-overlay: 0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2);
  --look-shadow-up: 0 -8px 24px rgb(0 0 0 / 0.12);
  --look-ring: color-mix(in oklab, var(--ring) 50%, transparent);
}
.dark { color-scheme: dark; }

:where(body) {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
:where(h1, h2, h3) { font-weight: 600; letter-spacing: -0.025em; }
:where(a) { color: inherit; text-underline-offset: 0.25rem; }
::selection { background: var(--primary); color: var(--primary-foreground); }
:where(:focus-visible) { outline: 3px solid var(--ring); outline-offset: 2px; }

/* Button (button.tsx): outline by default; .btn-primary, and the pages' button.primary and button.main, filled. */
:where(button, .btn) {
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  background: var(--background);
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
:where(button, .btn):where(:hover:not(:disabled)) { background: var(--accent); color: var(--accent-foreground); }
:where(button.primary, button.main, .btn-primary) { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); box-shadow: none; }
:where(button.primary, button.main, .btn-primary):where(:hover:not(:disabled)) { background: color-mix(in oklab, var(--primary) 90%, transparent); color: var(--primary-foreground); }
:where(.btn-ghost) { border-color: transparent; background: transparent; box-shadow: none; }
:where(button, .btn):where(:disabled) { opacity: 0.5; cursor: default; }

/* Field (input.tsx): a thin border, a soft shadow, and the ring on focus. */
:where(input:not([type=checkbox], [type=radio], [type=file], [type=range], [type=button], [type=submit]), select, textarea, .field) {
  border: 1px solid var(--input);
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
:where(input, textarea)::placeholder { color: var(--muted-foreground); }
:where(input, select, textarea, .field):where(:focus-visible) { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px var(--look-ring); }
:where(input, select, textarea, .field):where([aria-invalid=true]) { border-color: var(--destructive); }
:where(input[type=checkbox], input[type=radio]) { accent-color: var(--primary); }

/* Card (card.tsx) and tag (badge.tsx, secondary). */
:where(.card) {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
  box-shadow: var(--look-shadow-sm);
}
:where(.tag) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.33;
  white-space: nowrap;
}
:where(.tag-outline) { border-color: var(--border); background: transparent; color: var(--foreground); }

/* Skeleton (skeleton.tsx): a grey block that pulses while what it stands for loads, and holds still when motion is
   off. .sr-only keeps the words of a loading state for a screen reader alone. */
:where(.skeleton) { display: block; border-radius: calc(var(--radius) - 2px); background: var(--accent); animation: look-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes look-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { :where(.skeleton) { animation: none; } }
:where(.sr-only) { position: absolute; max-width: 1px; max-height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

/* The light and dark switch (theme.js): a ghost icon button, 44px, in the page's top right corner, above the page and
   below a note box or full-screen view. It scrolls away with the page's top, so it never sits over text read later.
   In a page's [data-theme-toggle] slot it sits in line. The icon shows the look it switches to: moon on light. */
.theme-toggle {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--foreground);
}
@media (hover: hover) { .theme-toggle:hover { background: var(--accent); color: var(--accent-foreground); } }
[data-theme-toggle] .theme-toggle { position: static; flex: none; }
.theme-toggle svg { width: 1.25rem; height: 1.25rem; pointer-events: none; }

  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { --pad:12px; margin:0; padding-bottom:var(--bar, 76px); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--muted); border-radius:4px; padding:.1em .3em; font-size:.88em; }
  [hidden] { display:none !important; }
  header { padding:20px 48px 4px 0; }
  .back { display:flex; align-items:center; gap:8px; min-width:0; margin:0 0 8px; }
  .back .muted { margin:0; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .eyebrow { margin:0; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted-foreground); font-size:14px; margin:4px 0 0; }
  #script-error { color:var(--destructive); font-weight:600; }
  section { margin:24px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted-foreground); font-size:14px; font-weight:500; letter-spacing:0; }
  .card { padding:var(--pad); margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; }
  .item > .drawing:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 var(--pad); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--foreground); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--border); background:var(--muted); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--foreground); --pele-muted:var(--muted-foreground); --pele-line:var(--foreground); --pele-border:var(--ring); --pele-surface:var(--card); --pele-surface-alt:var(--muted); --pele-accent:var(--foreground); --pele-error:var(--destructive); --pele-critical:var(--destructive); }
  .art.pic svg { display:block; width:100%; height:auto; }
  /* A hand-drawn sketch: named colours become classes painted from the look; text inherits the page's ink and font at a fixed size. */
  .art.sketch svg { fill:var(--foreground); font-family:system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size:13px; }
  .art.sketch .f-bg { fill:var(--background); } .art.sketch .f-fg { fill:var(--foreground); } .art.sketch .f-muted { fill:var(--muted); } .art.sketch .f-subtle { fill:var(--muted-foreground); }
  .art.sketch .f-line { fill:var(--border); } .art.sketch .f-card { fill:var(--card); } .art.sketch .f-danger { fill:var(--destructive); }
  .art.sketch .s-bg { stroke:var(--background); } .art.sketch .s-fg { stroke:var(--foreground); } .art.sketch .s-muted { stroke:var(--muted); } .art.sketch .s-subtle { stroke:var(--muted-foreground); }
  .art.sketch .s-line { stroke:var(--border); } .art.sketch .s-card { stroke:var(--card); } .art.sketch .s-danger { stroke:var(--destructive); }
  /* A screen: the look's parts in em, so the kit's fit and zoom scale it; its controls sit in an inert box and never take a tap. */
  .art.screen { line-height:1.4; } .art.screen:not([style]) { width:auto; max-width:49.2em; margin-right:1px; }
  .art.screen .sk { pointer-events:none; user-select:none; } .art.screen .sk > * + * { margin-top:.6em; }
  .art.screen :is(h3, h4, p, ul, ol) { margin:0; } .art.screen h3 { font-size:1.15em; } .art.screen h4, .art.screen small { font-size:.9em; }
  .art.screen .card { margin:0; padding:1em; } .art.screen :is(button, .btn) { min-width:0; min-height:0; padding:.45em 1em; font-size:1em; } .art.screen .tag { margin:0; font-size:.85em; }
  .art.screen :is(input:not([type=checkbox], [type=radio]), textarea, select, .field) { display:block; box-sizing:border-box; width:100%; padding:.45em .7em; }
  .art.screen .skeleton { animation:none; min-height:1em; } .art.screen hr, .art.screen .sep { border:0; border-top:1px solid var(--border); margin:.6em 0; }
  .art.screen .row { display:flex; align-items:center; flex-wrap:wrap; } .art.screen .col { display:flex; flex-direction:column; }
  .art.screen .gap { gap:.6em; } .art.screen .grow { flex:1 1 0; min-width:0; } .art.screen .muted { margin:0; color:var(--muted-foreground); font-size:inherit; } .art.screen .danger { color:var(--destructive); }
  .art.screen .sk-bar { display:block; height:.75em; border-radius:.375em; background:color-mix(in oklab, var(--muted-foreground) 25%, transparent); }
  .art.screen .tbl, .art.screen table { width:100%; border-collapse:collapse; } .art.screen :is(th, td) { padding:.35em .6em; text-align:left; border-bottom:1px solid var(--border); }
  /* Picture files: a wrapping row of labelled figures in em, so the fit and zoom scale them like a drawing; two sit side by side when they fit. */
  .art.photo { width:49.2em; display:flex; flex-wrap:wrap; align-items:flex-start; gap:.8em; white-space:normal; line-height:1.3; }
  .art.photo figure { flex:1 1 18em; min-width:0; margin:0; text-align:center; }
  .art.photo img { display:block; width:100%; height:auto; max-height:40em; object-fit:contain; border:1px solid var(--border); border-radius:.4em; background:var(--background); }
  .art.photo figcaption { margin-top:.3em; color:var(--muted-foreground); font-size:.95em; }
  .shot { position:relative; display:block; } .art .pin.spot { position:absolute; margin:0; transform:translate(-50%, -50%); }
  /* An ad: the card a feed or a story shows, in em like a picture; several sit side by side when they fit. */
  .art.ads { width:auto; max-width:49.2em; margin-right:1px; }
  .ad { flex:1 1 15em; max-width:20em; min-width:0; overflow:hidden; border:1px solid var(--border); border-radius:.6em; background:var(--card); color:var(--card-foreground); text-align:left; }
  .ad .ad-account { margin:0; padding:.5em .7em; } .ad .ad-account span { color:var(--muted-foreground); font-size:.85em; }
  .art.photo .ad img { max-height:none; aspect-ratio:4 / 5; object-fit:cover; border:0; border-radius:0; }
  .ad-words { display:flex; flex-wrap:wrap; align-items:center; gap:.3em .6em; padding:.6em .7em; }
  .ad-words .ad-text { flex:1 1 100%; margin:0; } .ad-words .ad-headline { flex:1 1 0; min-width:0; }
  .ad-button { padding:.3em .8em; border-radius:.4em; background:var(--primary); color:var(--primary-foreground); font-size:.9em; }
  .ad.story { position:relative; } .art.photo .ad.story img { aspect-ratio:9 / 16; }
  .ad.story .ad-account { position:absolute; top:0; left:0; right:0; z-index:1; background:color-mix(in oklab, var(--background) 70%, transparent); }
  .ad.story .ad-words { position:absolute; left:0; right:0; bottom:0; background:color-mix(in oklab, var(--background) 80%, transparent); }
  .try { margin:8px 0 0; padding:0 var(--pad); }
  .item > .verdict { grid-column:1 / -1; display:flex; align-items:center; gap:8px; margin-top:10px; }
  .verdict button { min-width:64px; }
  .note-list .group { margin:12px 0 6px; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  .item > .table { grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; overflow-x:auto; border-top:1px solid var(--border); }
  .item > .table:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .tbl th, .tbl td { padding:6px var(--pad); text-align:left; vertical-align:top; border-bottom:1px solid var(--border); }
  .tbl th { color:var(--muted-foreground); font-weight:500; background:var(--muted); }
  .tbl tbody tr:last-child td { border-bottom:0; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:var(--pad); min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted-foreground); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--background); }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--muted); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted-foreground); font-size:13px; }
  .tag { margin-right:8px; vertical-align:1px; }
  .tag.assumed { border-color:var(--border); border-style:dashed; background:transparent; color:var(--foreground); }
  .tag.check { border-color:var(--foreground); border-style:dotted; background:transparent; color:var(--foreground); }
  .hit { outline:3px solid var(--ring); outline-offset:3px; }
  button { font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; border-color:var(--primary); background:var(--primary); box-shadow:none; color:var(--primary-foreground); font:600 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { border-color:var(--foreground); border-style:dashed; background:var(--background); color:var(--foreground); }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; font-weight:400; }
  .entry .where { display:block; color:var(--muted-foreground); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; border-color:var(--input); box-shadow:var(--look-shadow-overlay); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--input); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-overlay); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:1px 0 0; border-radius:0; box-shadow:var(--look-shadow-up); padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted-foreground); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(var(--cols, 1), minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:var(--background); border-top:1px solid var(--border); }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  body.read-only .bar, body.read-only .add, body.read-only .verdict, body.read-only .hint, body.read-only .vhint .note-it, body.read-only #chip, body.read-only .drop, body.read-only .files button { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-lg); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--look-shadow-lg); font-size:14px; font-weight:500; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted-foreground); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:var(--background); color:var(--foreground); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:8px 14px; border-radius:var(--radius); background:var(--primary); color:var(--primary-foreground); box-shadow:var(--look-shadow-lg); font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  /* Live cards, forms, files, and the needs list: the look's parts, with inputs at 16px so a phone never zooms. */
  .item > .live, .item > .form { grid-column:1 / -1; margin-top:10px; min-width:0; }
  .live-tools { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 6px; }
  .live-tools [aria-pressed="true"] { background:var(--secondary); color:var(--secondary-foreground); }
  .live-box { overflow:hidden; border:1px solid var(--border); border-radius:var(--radius); background:var(--muted); }
  .live iframe { display:block; border:0; transform-origin:0 0; background:var(--background); }
  .live.full { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; margin:0; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; background:var(--background); }
  .live.full .live-box { flex:1; min-height:0; overflow:auto; }
  .live.full iframe { margin:0 auto; }
  .live-said { margin:6px 0 0; }
  .form { display:grid; gap:14px; }
  .need .form { margin-top:10px; }
  .q { min-width:0; margin:0; padding:0; border:0; }
  .q-label { display:block; margin:0 0 4px !important; font-weight:500; }
  .q :is(input:not([type=checkbox], [type=radio], [type=file]), textarea) { display:block; width:100%; padding:8px 10px; font:inherit; font-size:16px; }
  .opt { display:flex; align-items:center; gap:8px; min-height:40px; }
  .opt input { width:20px; height:20px; margin:0; }
  .drop { position:relative; display:flex; align-items:center; justify-content:center; min-height:64px; padding:12px; border:1px dashed var(--input); border-radius:var(--radius); text-align:center; cursor:pointer; }
  .drop.over, .drop:focus-within { border-color:var(--ring); background:var(--accent); }
  .drop input { position:absolute; width:1px; height:1px; opacity:0; }
  .files { list-style:none; margin:6px 0 0; padding:0; }
  .files li { display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:14px; }
  .files .why { color:var(--destructive); }
  .needs { list-style:none; margin:0; padding:0; }
  .need { scroll-margin-top:8px; }
  @media (min-width:701px) {
    body { --pad:16px; font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
<script>
// The light and dark switch outside the app: inlined in the review page's <head>, served to private pages as /theme.js.
// It applies the saved choice before paint, then adds the button; storage that is off still switches, unremembered.
(function () {
  var KEY = 'wongstack-theme';
  var SVG = 'http://www.w3.org/2000/svg';
  // lucide's moon and sun. The icon shows the look a tap switches to.
  var ICONS = {
    moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
    sun: [['circle', { cx: '12', cy: '12', r: '4' }]].concat(['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].map(function (d) { return ['path', { d: d }]; })),
  };
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  root.classList.toggle('dark', saved === 'dark');

  function icon(name) {
    var svg = document.createElementNS(SVG, 'svg');
    var attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
    ICONS[name].forEach(function (part) {
      var el = document.createElementNS(SVG, part[0]);
      Object.keys(part[1]).forEach(function (k) { el.setAttribute(k, part[1][k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function draw(button) {
    var dark = root.classList.contains('dark');
    button.setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark');
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.textContent = '';
    button.appendChild(icon(dark ? 'sun' : 'moon'));
  }

  function mount() {
    if (!document.body || document.querySelector('.theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    draw(button);
    button.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* switched, not remembered */ }
      draw(button);
    });
    var slot = document.querySelector('[data-theme-toggle]');
    if (slot) slot.appendChild(button);
    else document.body.insertBefore(button, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
</script>
</head>
<body data-change="2026-11-05-live-view-for-sensitive-input" data-own-back>
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-11-05-live-view-for-sensitive-input</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#needs">Needs</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint"><span class="lead">Tap + Note to comment.</span> <span class="copies">Saving a note copies all your notes.</span> <span class="tail">Open a drawing and tap it to see it full screen.</span></p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Today a card, a backup code and a password each have their own form: the private form for a card or a code, and the password page for logins. Each form copies a part of the site, and each one breaks in its own way. The live view already shows the real site, and the assistant sees nothing until you tap <i>Hand back</i>. So you type everything sensitive there, on the real page, and the extra forms go.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>You type a card, a backup code or a password on the real site, in the live view.</b> The assistant fills in the rest of the page first, then asks <i>Ready?</i> in the chat as it does today. The link shows its browser on that page, with one bar under it: a short line that says what to do now, the type box and <i>Hand back</i>. You type, or paste from your password manager. The assistant sees nothing you do until you tap <i>Hand back</i>. This page is not part of the app, so the plan has a sketch, not a real picture.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic screen" data-note="item-1-picture-1" tabindex="0" style="width:27.692em"><div class="sk" inert><div class="card col gap phone">
  <div class="skeleton">City of Markham: Payment</div>
  <div class="sep"></div>
  <span>Type your card and press Pay $45.00, then tap Hand back.</span>
  <div class="row gap"><div class="field grow">Tap a box above, then type</div><button class="btn-primary">Hand back</button></div>
</div></div></div></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>You press the site's own Pay button.</b> You see the real total on the real page, and the assistant never presses Pay with your card. The view ends by itself when the site shows its receipt, or when you tap <i>Hand back</i>. The assistant then reads the page as text, with every card box hidden, and tells you whether the payment went through. It never asks you to pay again while the payment may have gone through.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-2-picture-1" tabindex="0" style="width:28.231em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-sequence" viewBox="0 0 367 351" width="367" height="351" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="sequence"><g transform="translate(40,8)"><g class="pele-lifelines" fill="none" stroke="var(--_b)"><path class="pele-lifeline" data-id="You" d="M0,44V291"/><path class="pele-lifeline" data-id="Assistant" d="M270.54,44V291"/></g><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge pele-message" data-id="i0"><path d="M270.54,87H7"/><path class="pele-marker" d="M0,87L8,83.64L8,90.36Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i1"><path d="M0,124H263.54"/><path class="pele-marker" d="M270.54,124L262.54,127.36L262.54,120.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i2"><path d="M270.54,161H7"/><path class="pele-marker" d="M0,161L8,157.64L8,164.36Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i3"><path d="M0,175H22A6,6 0 0 1 28,181V191A6,6 0 0 1 22,197H7"/><path class="pele-marker" d="M0,197L8,193.64L8,200.36Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i4"><path d="M0,234H263.54"/><path class="pele-marker" d="M270.54,234L262.54,237.36L262.54,230.64Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge pele-message" data-id="i5"><path d="M270.54,271H7"/><path class="pele-marker" d="M0,271L8,267.64L8,274.36Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="i0"><text x="135.27" y="77.4" text-anchor="middle">Pay City of Markham $45.00? Ready?</text></g><g class="pele-edge-label" data-id="i1"><text x="135.27" y="114.4" text-anchor="middle">Ready</text></g><g class="pele-edge-label" data-id="i2"><text x="135.27" y="151.4" text-anchor="middle">the live view link</text></g><g class="pele-edge-label" data-id="i3"><text x="111.48" y="190.9" text-anchor="middle">type the card, press Pay</text></g><g class="pele-edge-label" data-id="i4"><text x="135.27" y="224.4" text-anchor="middle">Hand back, or the receipt shows</text></g><g class="pele-edge-label" data-id="i5"><text x="135.27" y="261.4" text-anchor="middle">Paid. Receipt P0178390.</text></g></g><g class="pele-nodes"><g class="pele-node pele-actor pele-actor-participant pele-actor-footer" data-id="You"><rect x="-32" y="291" width="64" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="318.6" text-anchor="middle">You</text></g><g class="pele-node pele-actor pele-actor-participant pele-actor-footer" data-id="Assistant"><rect x="222.09" y="291" width="96.91" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="270.54" y="318.6" text-anchor="middle">Assistant</text></g><g class="pele-node pele-actor pele-actor-participant" data-id="You"><rect x="-32" y="0" width="64" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="27.6" text-anchor="middle">You</text></g><g class="pele-node pele-actor pele-actor-participant" data-id="Assistant"><rect x="222.09" y="0" width="96.91" height="44" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="270.54" y="27.6" text-anchor="middle">Assistant</text></g></g></g></svg></div></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>You sign in to a site in the live view, and the browser stays signed in.</b> There is no password page and no list of saved passwords. When a site asks you to sign in, the link's line says <i>Sign in to Netflix, then tap Hand back</i>. Next time, the browser is still signed in, so you do nothing. A one-time code still comes through the chat or your email, as today. After the update, the assistant offers to delete the old file of saved passwords, because it holds them in plain text. You can not undo a delete.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">Assistant: Netflix wants you to sign in.</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">I'll send a link that shows my browser.</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">[Ready, send it]  [Not now]</span>

<span class="ln" data-note="item-3-line-5" tabindex="0">↳ link line: Sign in to Netflix,</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">  then tap Hand back.</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Every live view has the same bar: one line and <i>Hand back</i>.</b> A robot check, a stuck step, a payment and a sign-in all look the same. <i>I'm finished</i> becomes <i>Hand back</i>. To give up, you tap <i>Hand back</i> and say so in the chat. The assistant then asks before it does more on that page.</div></div><div class="table"><table class="tbl"><thead><tr><th>Step</th><th>The line says</th></tr></thead><tbody><tr data-note="item-4-row-1" tabindex="0"><td>Payment</td><td>Type your card and press Pay $45.00, then tap Hand back.</td></tr><tr data-note="item-4-row-2" tabindex="0"><td>Sign-in</td><td>Sign in to Netflix, then tap Hand back.</td></tr><tr data-note="item-4-row-3" tabindex="0"><td>Backup code</td><td>Type your backup code for Google, then tap Hand back.</td></tr><tr data-note="item-4-row-4" tabindex="0"><td>Robot check</td><td>Show Messenger you're a person, then tap Hand back.</td></tr><tr data-note="item-4-row-5" tabindex="0"><td>Stuck step</td><td>Tap DigiKey's Continue, then tap Hand back.</td></tr></tbody></table></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>On a Mac or a Windows computer, the browser shows in a window on your screen.</b> A live view link can not open there yet. So the assistant's browser opens in its own window by default, and your turn happens in that window. The chat says <i>Sign in to Netflix in the browser window, then say done</i>. A setting turns the window off, as it is today, for a computer you do not sit at. With the window off, a step that needs you ends with steps to finish in your own browser.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">You: don't show the browser window</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">Assistant: Done. From the next start my</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">browser has no window. A sign-in or a</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">payment then ends with steps for you.</span></pre></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>The card form and the password page go.</b> The private key link for API keys stays, as the last way to give a key. Saved everyday answers, such as your email and address, stay, and the chat still asks before it uses them.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> a live view link on a Mac or Windows computer; one-time codes in the live view (they stay in the chat or your email); removing the key link; the watching that connecting your tools does, which its own change owns.</p>

</section>
<section id="needs" aria-labelledby="needs-h"><h2 id="needs-h">What the build needs</h2>
<ol class="needs">
<li class="need card" id="need-1" data-need="ready"><p><span class="tag">Ready</span> <b>The live view's tools on this server</b>: <code>x11vnc</code>, <code>xdotool</code> and <code>Xvfb</code> are installed, and noVNC 1.6.0 is in <code>~/.wong-stack/live-view/</code>.</p></li>
<li class="need card" id="need-2" data-need="ready"><p><span class="tag">Ready</span> <b>The live view's Hand back</b>: They are built in the change <i>Connect your tools on a server</i>; this change uses them, or builds the same ones if that change is not live yet.</p></li>
<li class="need card" id="need-3" data-need="ready"><p><span class="tag">Ready</span> <b>A Mac to try the browser window</b>: The build tests it in code; you try one sign-in on your Mac after it is live.</p></li>
</ol>
</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-05</p>Asked, during the live test of connect-on-a-server, where sensitive input goes → Matthew chose the live view as <i>&quot;the one place to fill in stuff&quot;</i>: <i>&quot;we can enter payment info and the bot wont see it until we handback&quot;</i>. Remove <i>&quot;card, code, passwords like all those forms&quot;</i>.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-05</p>Asked whether the key link goes too → it stays, as the last fallback for API keys; Matthew did not choose to remove it.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-05</p>Asked what the view's top shows → one short line saying what to do now, such as <i>Sign in to Stripe, then tap Hand back</i>.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-05</p>Asked what happens to logins already saved → chose to stop using them: every sign-in happens in the live view, the browser keeps the session, and after the update the assistant offers to delete the saved-passwords file.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-05</p>Asked who presses the site's Pay button → chose the person, in the live view, so they see the real total and the assistant never presses Pay with their card.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-05</p>Asked how a payment or sign-in works on a Mac, where the live view can not open → Matthew: <i>&quot;On a mac we can do a real window i think default should be a window but we can change it to a server in the setting which is what we have rn&quot;</i>. The browser shows in a window by default off Linux; a setting turns it off.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: Windows gets the same window as a Mac, because the browser code treats both alike today: no virtual screen, no live view.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: with the window off on a Mac, a step that needs the person ends with steps for their own browser, because no view can open there.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: in the window, the person says <i>done</i> in the chat in place of <i>Hand back</i>, and the same finish ends the turn by itself, because the window has no buttons of ours.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: the window setting is a <code>browse.mjs window on|off</code> command kept in <code>~/.wong-stack/</code>, taking effect at the next browser start, because the browser already keeps its own files there and a running browser is never restarted for a setting.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: every live view, not only a payment, shows one line, <i>Hand back</i> and <i>Stop</i>, and <i>I'm finished</i> becomes <i>Hand back</i>, so the person learns one page.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: the assistant still asks <i>Ready?</i> before a live view for an errand, because the payment question is the person's yes to buy and a puzzle goes stale; connecting tools keeps its own no-question rule.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: one-time codes stay in the chat or email, because they expire in minutes and Matthew named only the form's backup codes.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: saved everyday answers stay and move to their own page, because they are typed by the assistant from the chat and are not a form.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: the payment safety rules carry over: no picture while a card box holds a value, a reading only as text with card boxes hidden, and no second payment while the first may have gone through.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: PayPal keeps its live view, now the same turn as a card, because it already works that way.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: this change builds on connect-on-a-server's <i>Hand back</i>, <i>Stop</i>, the line and paste, and whichever change ships second catches up with the other.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: connect-on-a-server is not on <code>main</code> yet, so this change carries the least of its turn (the <code>turn</code> control, <i>Hand back</i> and <i>Stop</i>, the line, paste) in the same names and files; design Decision 6 records it.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: <code>close</code> on a window ends it as <i>handed back</i> and wakes no chat, because the person ended it from the chat.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: the context baseline stays as it is, because a new baseline sets each route's before to its after and the required reductions then fail; the removed files it names are allowed in <code>retired-names.json</code>.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-05</p>Check: <code>scripts/tests/form.test.mjs</code> deleted, because the card form it tests is removed.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-05</p>Check: <code>scripts/tests/form-page.test.mjs</code> deleted, because the card form page it tests is removed.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-05</p>Check: <code>scripts/tests/passwords.test.mjs</code> deleted, because the password link it tests is removed.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-05</p>Check: <code>scripts/tests/passwords-page.test.mjs</code> deleted, because the password page it tests is removed.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-05</p>Check: <code>scripts/tests/live-pages.test.mjs</code> deleted, because the status lines it tests (the form's press, the sign-in count, the live line) are removed; the view's line is now the note, tested in <code>scripts/tests/view-page.test.mjs</code>.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-05</p>Check: the timing tests now check only what ended a link and how long it was open, because the step lines and press times they read are removed with the form.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-05</p>Check: removed the <code>browse.mjs</code> tests for <code>login</code>, <code>logins</code> and <code>forget</code>, because the commands are removed; a new test checks that <code>login</code> exits 2.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-05</p>Asked, in a note while testing, where the line and buttons go → Matthew: <i>&quot;for the hand back and stop can we have it beside the tap a box above bar at the bottom including the one line&quot;</i>, and <i>&quot;no need for darkmode thing here&quot;</i>. The line, the type box, <i>Stop</i> and <i>Hand back</i> now sit in one bar under the site, and the view has no light and dark switch. This replaces the line at the top.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-05</p>Asked, after seeing the bar on a phone, whether to remove <i>Stop</i> → chose to remove it. <i>Hand back</i> is the one button; to give up, the person hands back and says so in the chat, and the assistant asks before it does more on an unfinished page. The type box gets the freed room. Connect-on-a-server's <i>Stop</i> drops too when it catches up.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: the live sign-in on a real site (was task 6.2) moves to a follow-up after this is live, because Matthew asked to publish once the payment turn passed, and a sign-in uses the same turn and <i>Hand back</i>.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: the sign-in on a Mac window (was task 6.3) moves to a follow-up, because it can run only after this is live.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-05</p>Done in the catch-up merge with connect-on-a-server: <i>saved logins</i> and <i>a private form</i> are dropped from <i>People handle API token websites in their own browser</i> (was task 5.5), and its scenario is now <i>A token request while the browser is signed in</i>.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-05</p>Check: in the catch-up merge, the watch link's <i>Stop</i> tests in <code>scripts/tests/hand-over.test.mjs</code>, <code>scripts/tests/view-page.test.mjs</code> and <code>scripts/tests/connect-browser.test.mjs</code> now check that <code>/stop</code> is gone, that only <i>Take over</i> wakes the chat, and that a chat's <code>close --stopped</code> still ends the watch <code>stopped</code>, because <i>Stop</i> is removed from connect's watch link too.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-06</p>Archive checkpoint: archived and numbered for publish; connect-on-a-server (v49.1.0) merged in first, with <i>Stop</i> removed from its watch link too.</li>
<li class="decision card" id="decision-35" data-note="decision-35" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-06</p>Check: the kept check <i>A device set to dark</i> was replaced by this walk's: it now opens Home on a phone set to dark and reads a light page, and no longer opens Hello and Access, because the view this change touches has no switch and Home carries the promise.</li>
<li class="decision card" id="decision-36" data-note="decision-36" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-06</p>Check: the kept check <i>Turn a page dark</i> was replaced by this walk's: it taps <i>Switch to dark</i> on Home, opens Hello dark, then switches back, the same steps as before with Hello's text as its expectation.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom<span class="note-it"> · tap a line or picture to note it</span></p>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" data-actions="[{&quot;name&quot;:&quot;build&quot;,&quot;label&quot;:&quot;Build it&quot;,&quot;done&quot;:&quot;Asked the chat to build.&quot;},{&quot;name&quot;:&quot;publish&quot;,&quot;label&quot;:&quot;Build and publish&quot;,&quot;done&quot;:&quot;Asked the chat to build and publish.&quot;,&quot;confirm&quot;:{&quot;say&quot;:&quot;Goes live, can't be undone.&quot;,&quot;yes&quot;:&quot;Yes, publish&quot;,&quot;ask&quot;:&quot;Build and publish? This goes live and can't be undone.&quot;}}]" hidden>
    <div id="ready-confirm" role="group" hidden><p></p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span></span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  // A preview page shows a finished build: its words name the preview. A review page of other work names its cards.
  const PREVIEW = document.body.getAttribute('data-kind') === 'preview', NAME = PREVIEW ? CHANGE.replace(/-preview$/, '') : CHANGE;
  const REVIEW = document.body.getAttribute('data-kind') === 'review', NOUN = REVIEW ? 'Card' : 'Change', PAGE = REVIEW ? 'page' : 'plan';
  if (PREVIEW) {
    document.title = 'Preview · ' + NAME;
    document.querySelector('.eyebrow').textContent = NAME;
    document.querySelector('h1').textContent = 'Built: look, then publish?';
    document.querySelector('.hint .lead').textContent = 'Tap a picture to see it full screen, then tap it to note it.';
    document.querySelector('.hint .tail').textContent = '';
  }
  if (REVIEW) document.querySelector('.hint .lead').textContent = 'Tap OK or Change on each card, or select words to note them.';
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {}, ok: {}, answers: {}, said: {}, files: {} };
  // A note on words keeps its quote; a note on a picture spot keeps the picture, the spot in percent, and its name.
  const EXTRA = { quote: 'string', k: 'number', x: 'number', y: 'number', on: 'string' };
  const ok = function (r, id) {
    return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id)
      && Object.keys(EXTRA).every(function (f) { return r[f] === undefined || typeof r[f] === EXTRA[f]; });
  };
  function extraOf(rec) {
    const x = {};
    Object.keys(EXTRA).forEach(function (f) { if (rec && rec[f] !== undefined) x[f] = rec[f]; });
    return x;
  }
  const QID = /^(?:item|need)-\d+-(?:q|live)-\d+$/;
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  function load(text) {
    try {
      const saved = JSON.parse(text || 'null');
      if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
      if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
      if (saved && saved.ok && typeof saved.ok === 'object') {
        data.ok = {};
        Object.keys(saved.ok).forEach(function (id) { if (/^item-\d+$/.test(id) && (saved.ok[id] === true || saved.ok[id] === 'sent')) data.ok[id] = saved.ok[id]; });
      }
      const kept = function (name, fits) {
        if (!saved || !saved[name] || typeof saved[name] !== 'object') return;
        data[name] = {};
        Object.keys(saved[name]).forEach(function (id) { if (QID.test(id) && fits(saved[name][id])) data[name][id] = saved[name][id]; });
      };
      const words = function (v) { return typeof v === 'string' && v.length <= 2000; };
      kept('answers', function (v) { return words(v) || typeof v === 'boolean' || (Array.isArray(v) && v.every(words)); });
      kept('said', function (v) { return typeof v === 'string'; });
      kept('files', function (v) {
        return Array.isArray(v) && v.every(function (f) { return f && /^[0-9a-f]{32}$/.test(f.id) && typeof f.name === 'string' && typeof f.size === 'number' && typeof f.sent === 'boolean'; });
      });
    } catch (e) { /* unreadable notes start empty */ }
  }
  load(store ? store.getItem(KEY) : null);
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture|row)-(\d+))?(?:-(words|spot)-\d+)?$/.exec(id) || [];
    if (m[5]) return Object.assign(where(id.replace(/-(words|spot)-\d+$/, '')), m[5] === 'words' ? { kind: 'words' } : {});
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'line' ? 'drawing line ' + m[4] : m[3] ? m[3] + ' ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: NOUN + ' #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    // A table row's cells read joined with a dot.
    // A screen's words sit in many small boxes: join every piece of text with a space.
    // Picture files read as their labels, joined with a dot.
    const row = el.tagName === 'TR', photo = el.classList.contains('photo'), cells = row ? c.querySelectorAll('td') : photo ? c.querySelectorAll('img')
      : el.classList.contains('screen') ? texts(c) : el.classList.contains('pic') ? c.querySelectorAll('text') : [c];
    const text = Array.prototype.map.call(cells, function (n) { return (photo ? n.alt : n.textContent).replace(/\s+/g, ' ').trim(); }).join(row || photo ? ' · ' : ' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function texts(c) {
    const found = [], walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) found.push(walk.currentNode);
    return found;
  }
  // A note on words or a spot sits on its base target: words are found again by their quote, a spot by the base's label.
  function find(id, rec) {
    const m = /^(.*)-(words|spot)-\d+$/.exec(id), el = document.querySelector('[data-note="' + (m ? m[1] : id) + '"]');
    if (!el) return null;
    if (m && m[2] === 'words') return textOf(el).indexOf(rec.quote) >= 0 ? el : null;
    if (m && !el.querySelectorAll('.shot')[rec.k]) return null;
    return labelOf(el) === rec.label ? el : null;
  }
  function textOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .add'), function (n) { n.parentNode.removeChild(n); });
    return c.textContent.replace(/\s+/g, ' ');
  }
  // A new note on words or a spot takes the next free number on its target.
  function nextId(base, kind) {
    const pre = base + '-' + kind + '-';
    let k = 1;
    data.notes.map(function (n) { return n.id; }).concat(Object.keys(data.drafts)).forEach(function (id) {
      if (id.indexOf(pre) === 0) k = Math.max(k, +id.slice(pre.length) + 1);
    });
    return pre + k;
  }
  // The notes list groups notes by Why, each card, and Decisions.
  function groupOf(id) {
    const m = /^(why|item|decision)-(\d+)/.exec(id) || [];
    return m[1] === 'why' ? [0, 'Why'] : m[1] === 'item' ? [+m[2], NOUN + ' ' + m[2]] : [1e6, 'Decisions'];
  }
  // A row's pin and Note button go in its last cell: a table row holds only cells.
  function slot(el) { return el.tagName === 'TR' ? el.lastElementChild : el; }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }))
      .map(function (id, i) { return [groupOf(id)[0], i, id]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; })
      .map(function (x) { return x[2]; });
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    let group = null;
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec);
      if (groupOf(id)[1] !== group) {
        group = groupOf(id)[1];
        const head = document.createElement('li');
        head.className = 'group'; head.textContent = group;
        $('note-list').appendChild(head);
      }
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        if (rec.x !== undefined) {
          pin.className += ' spot'; pin.style.left = rec.x + '%'; pin.style.top = rec.y + '%';
          el.querySelectorAll('.shot')[rec.k].appendChild(pin);
        } else slot(el).appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      const id = el.getAttribute('data-note');
      if (el.closest('.art') || el.querySelector('.pin[data-open="' + id + '"]')) return;
      const add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      slot(el).appendChild(add);
    });
    all('.verdict', function (v) {
      const id = v.querySelector('[data-ok]').getAttribute('data-ok'), state = data.ok[id], n = id.slice(5);
      v.querySelector('.tag').hidden = !state;
      v.querySelector('.tag').textContent = state === 'sent' ? 'OK · Sent' : 'OK';
      v.querySelector('[data-ok]').textContent = state ? 'Undo' : 'OK';
      v.querySelector('[data-ok]').setAttribute('aria-label', (state ? 'Undo OK on ' : 'OK ') + NOUN.toLowerCase() + ' ' + n);
      v.querySelector('[data-open]').hidden = !!state;
    });
    const answers = replies();
    Object.keys(data.answers).forEach(function (id) {
      const q = document.querySelector('[data-q="' + id + '"], [data-live="' + id + '"]');
      if (!q || q.getAttribute('data-kind') === 'tick') return;
      if (!$('note-list').querySelector('.group.answers')) $('note-list').insertAdjacentHTML('beforeend', '<li class="group answers">Answers</li>');
      const line = q.hasAttribute('data-live') ? asker(id) + ' answer' : asker(id) + ', "' + q.getAttribute('data-label') + '"', v = data.answers[id];
      const sent = !answers.some(function (a) { return a.id === id; });
      $('note-list').insertAdjacentHTML('beforeend', '<li class="entry"><span class="where">' + esc(line) + (sent ? '<span class="tag">Sent</span>' : '') + '</span>'
        + esc(Array.isArray(v) ? v.join(', ') : v) + '</li>');
    });
    if (ids.length || $('note-list').querySelector('.answers')) { const none = $('note-list').querySelector('li.muted'); if (none) none.remove(); }
    fill(); drawFiles();
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, chipExtra = null, tap = null;
  // True once the inbox opens this page closed, or a tap on it reaches the chat: it takes no note.
  let readOnly = false;
  const pointers = {};
  // `extra` makes the chip start a new note on selected words or a picture spot.
  function showChip(el, x, y, keyboard, extra) {
    if (readOnly) return;
    const id = el.getAttribute('data-note');
    chipFor = el; chipExtra = extra || null;
    chip.textContent = extra && extra.quote ? 'Note' : !extra && (noteOf(id) || data.drafts[id]) ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; chipExtra = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false, spotAt(el, t.target, e)); else hideChip();
  });
  // A tap on a picture file in full screen notes that spot of it, kept in percent so it holds at any size.
  function spotAt(el, target, e) {
    if (!el.closest('#viewer') || !el.classList.contains('photo') || target.tagName !== 'IMG') return null;
    const r = target.getBoundingClientRect(), pct = function (v, size) { return Math.max(0, Math.min(100, Math.round(v / Math.max(1, size) * 100))); };
    return { k: Array.prototype.indexOf.call(el.querySelectorAll('img'), target), x: pct(e.clientX - r.left, r.width), y: pct(e.clientY - r.top, r.height), on: target.alt };
  }
  // Selected words in one note target offer a note on just those words.
  let picking = 0;
  document.addEventListener('selectionchange', function () {
    clearTimeout(picking);
    picking = setTimeout(function () {
      const s = window.getSelection ? window.getSelection() : null;
      if (!s || s.isCollapsed || !s.rangeCount || open) return;
      const range = s.getRangeAt(0), at = range.commonAncestorContainer, host = (at.nodeType === 1 ? at : at.parentNode).closest('[data-note]');
      const quote = s.toString().replace(/\s+/g, ' ').trim().slice(0, 200);
      if (!host || !quote || host.closest('.art, #editor, #viewer') || textOf(host).indexOf(quote) < 0) return;
      const r = range.getBoundingClientRect();
      showChip(host, r.left + r.width / 2, r.bottom, false, { quote: quote });
    }, 150);
  });
  chip.addEventListener('click', function () {
    if (!chipFor) return;
    const id = chipFor.getAttribute('data-note'), extra = chipExtra;
    openEditor(extra ? nextId(id, extra.quote ? 'words' : 'spot') : id, chipFor, extra);
  });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id);
    const el = rec ? find(id, rec) : t.closest('[data-note]') || document.querySelector('[data-note="' + id + '"]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) {
        const el = chipFor, words = chipExtra && chipExtra.quote;
        hideChip();
        if (words && window.getSelection) window.getSelection().removeAllRanges();
        el.focus();
      }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el, extra) {
    if (readOnly) return;
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const quote = extra && extra.quote, clip = quote && quote.length > 60 ? quote.slice(0, 59) + '…' : quote;
    const label = draft ? draft.label : note ? note.label : quote ? 'words "' + clip + '"' : labelOf(el);
    open = { id: id, label: label, el: el, extra: extra || extraOf(draft || note) };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    bar();
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = Object.assign({ label: open.label, text: text }, open.extra);
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push(Object.assign({ id: id, label: open.label, text: text }, open.extra));
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length, k = oks().length, a = replies().length;
      copyNotes(function () { toast('Saved and copied ' + plural2(n, k, a) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d); bar();
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump(hash) {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(typeof hash === 'string' ? hash : location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return Object.assign({ id: n.id, label: n.label, text: n.text }, extraOf(n)); }); }
  // An OK not yet in the chat, as its card's id, in card order.
  function oks() {
    return Object.keys(data.ok).filter(function (id) { return data.ok[id] === true; }).sort(function (a, b) { return a.slice(5) - b.slice(5); });
  }
  function acknowledge(notes, okd, ans) {
    ans.forEach(function (a) {
      if (a.said) data.said[a.id] = a.said;
      (data.files[a.id] || []).forEach(function (f) { if (a.files.indexOf(f.id) >= 0) f.sent = true; });
    });
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    okd.forEach(function (id) { if (data.ok[id] === true) data.ok[id] = 'sent'; });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id), spot = n.x === undefined ? '' : ', spot at ' + n.x + '% across and ' + n.y + '% down on "' + n.on + '"';
      return '- ' + w.spot + spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  // What goes to the chat: each OK on its own line, then the notes.
  function lines(notes, okd, ans) {
    return okd.map(function (id) { return NOUN + ' #' + id.slice(5) + ': OK'; }).concat(ans.map(function (a) { return a.line; }), bullets(notes)).join('\n');
  }
  function notesText() {
    const header = REVIEW ? document.body.getAttribute('data-header')
      : PREVIEW ? 'Notes on the preview of ' + NAME + ' from its review page. Don\'t publish yet.'
      : 'Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.';
    return header + '\n' + lines(unsent(), oks(), replies());
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  function plural2(n, k, a) {
    const parts = n || !(k || a) ? [plural(n)] : [];
    if (k) parts.push(k + (k === 1 ? ' OK' : ' OKs'));
    if (a) parts.push(a + (a === 1 ? ' answer' : ' answers'));
    return parts.join(' and ');
  }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length || oks().length || replies().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    if (hosted) return hostedAsk(path, body);
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), okd = oks(), ans = replies(), n = notes.length, k = okd.length, a = ans.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural2(n, k, a) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const body = { text: lines(notes, okd, ans) };
      if (fileIds(ans).length) body.files = fileIds(ans);
      const r = await ask('send', live, body);
      const changed = 'The ' + PAGE + ' changed. Reload to read it first.';
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (r.status === 409) { const why = ((await r.json()) || {}).gone ? GONE : changed; says(why); toast(why); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes, okd, ans);
      says('Sent ' + plural2(n, k, a) + ' to the chat.');
      toast('Sent ' + plural2(n, k, a) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length, k = oks().length, a = replies().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural2(n, k, a) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── OK and Change on each card: an OK is kept with the notes until undone, and goes to the chat with them ──
  all('.items > .item', function (item) {
    const v = document.createElement('div');
    v.className = 'verdict';
    v.innerHTML = '<span class="tag" hidden>OK</span><button type="button" class="btn-ghost" data-ok="' + item.id + '">OK</button>'
      + '<button type="button" class="btn-ghost" data-open="' + item.id + '" aria-label="Change ' + NOUN.toLowerCase() + ' ' + item.id.slice(5) + '">Change</button>';
    item.appendChild(v);
  });
  document.addEventListener('click', function (e) {
    const b = e.target.closest ? e.target.closest('[data-ok]') : null;
    if (!b) return;
    const id = b.getAttribute('data-ok');
    if (data.ok[id]) delete data.ok[id]; else data.ok[id] = true;
    persist();
  });
  // A picture file's spot pins sit over the picture itself.
  all('.art.photo img', function (img) {
    const shot = document.createElement('span');
    shot.className = 'shot';
    img.parentNode.insertBefore(shot, img);
    shot.appendChild(img);
  });

  // ── the page's own buttons, from the builder; one that can't be undone asks once more above the footer ──
  let version = null, confirming = null;
  const ACTIONS = JSON.parse($('ready').getAttribute('data-actions') || '[]');
  const actionOf = function (name) { return ACTIONS.filter(function (a) { return a.name === name; })[0] || null; };
  const choice = function (name) { return $('ready').querySelector('[data-ready="' + name + '"]'); };
  ACTIONS.forEach(function (a) {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('data-ready', a.name); b.setAttribute('data-label', a.label);
    if (a.confirm) { b.textContent = a.label; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'ready-confirm'); }
    else b.innerHTML = '<span class="spinner" hidden aria-hidden="true"></span><span></span>';
    $('ready').insertBefore(b, $('ready-confirm'));
  });
  function fillConfirm(a) {
    confirming = a;
    $('ready-confirm').querySelector('p').textContent = a.confirm.say;
    $('ready-confirm').setAttribute('aria-label', a.confirm.ask);
    choice('yes').setAttribute('data-label', a.confirm.yes);
  }
  if (ACTIONS.filter(function (a) { return a.confirm; }).length) fillConfirm(ACTIONS.filter(function (a) { return a.confirm; })[0]);
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (focus && wasOpen && !$('ready').hidden && confirming) choice(confirming.name).focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    const gate = drawNeeds();
    all('#ready > [data-ready]', function (b) {
      if (!b.querySelector('.spinner')) b.textContent = gate || b.getAttribute('data-label');
    });
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready'), spinner = b.querySelector('.spinner');
      const active = !!spinner && pending === (step === 'yes' ? confirming && confirming.name : step);
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(active));
      if (spinner) {
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : (b.parentNode === $('ready') && gate) || b.getAttribute('data-label');
      }
    });
    const shown = $('ready').hidden ? 0 : $('ready').querySelectorAll('#ready > button:not([hidden])').length;
    el.style.setProperty('--cols', String(Math.min(3, 1 + shown)));
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  // Each button shows when the link offers it; the choices stay hidden when it offers none.
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || typeof answer.version !== 'string') return;
    const shown = ACTIONS.filter(function (a) {
      choice(a.name).hidden = names.indexOf(a.name) < 0;
      return names.indexOf(a.name) >= 0;
    });
    if (!shown.length) return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot(), okd = oks(), ans = replies();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length || okd.length || ans.length) body.text = lines(notes, okd, ans);
      if (fileIds(ans).length) body.files = fileIds(ans);
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? actionOf(name).done
        : r.status === 409 && a.changed === true ? 'The ' + PAGE + ' changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : r.status === 409 && a.gone === true ? GONE : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes, okd, ans);
      // A gone file keeps the buttons, as a 429 does: the person picks it again and taps once more.
      if (line !== GONE) hideActions();
      says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready'), a = actionOf(step), gaps = needsOpen();
    // While the build needs the person, a go button leads to the first thing it needs instead.
    if (a && gaps.length) {
      all('.hit', function (n) { n.classList.remove('hit'); });
      gaps[0].classList.add('hit'); gaps[0].scrollIntoView({ block: 'center' });
      return;
    }
    if (step === 'yes') act(confirming.name);
    else if (step === 'cancel' || a.confirm) {
      says('');
      if (a) fillConfirm(a);
      $('ready-confirm').hidden = step === 'cancel';
      all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', String(b === button)); });
      bar();
      choice(step === 'cancel' ? confirming.name : 'cancel').focus({ preventScroll: true });
    } else act(step);
  });

  // ── answers: a form's inputs and a live card's answer, kept with the notes and sent with them under their card ──
  // `said` holds each answer as the chat last got it, so a changed answer goes again and an unchanged one never does.
  const asker = function (id) { const m = /^(item|need)-(\d+)/.exec(id); return (m[1] === 'item' ? NOUN : 'Need') + ' #' + m[2]; };
  function inputValue(q) {
    const kind = q.getAttribute('data-kind'), boxes = q.querySelectorAll('input:checked');
    if (kind === 'tick') return !!boxes.length;
    if (kind === 'choice') return boxes.length ? boxes[0].value : undefined;
    if (kind === 'choices') return boxes.length ? Array.prototype.map.call(boxes, function (b) { return b.value; }) : undefined;
    const v = q.querySelector('input, textarea').value.slice(0, 2000);
    return v.trim() ? v : undefined;
  }
  function fill() {
    all('.form [data-q]', function (q) {
      const v = data.answers[q.getAttribute('data-q')], kind = q.getAttribute('data-kind');
      if (kind === 'file') return;
      Array.prototype.forEach.call(q.querySelectorAll('input, textarea'), function (el) {
        if (el.type === 'radio' || el.type === 'checkbox') el.checked = kind === 'tick' ? v === true : kind === 'choice' ? v === el.value : Array.isArray(v) && v.indexOf(el.value) >= 0;
        else if (el.value !== (v || '')) el.value = v || '';
      });
    });
  }
  function answered(q) {
    const id = q.getAttribute('data-q'), v = data.answers[id];
    if (q.getAttribute('data-kind') === 'file') return !!(data.files[id] && data.files[id].length);
    return q.getAttribute('data-kind') === 'tick' ? v === true : v !== undefined;
  }
  // Each answer the chat has not got yet, in page order: its id, its line, and the files it names.
  function replies() {
    const out = [];
    all('.form [data-q], .live[data-live]', function (q) {
      const id = q.getAttribute('data-q') || q.getAttribute('data-live'), v = data.answers[id];
      if (q.getAttribute('data-kind') === 'file') {
        const fresh = (data.files[id] || []).filter(function (f) { return !f.sent; });
        if (fresh.length) out.push({ id: id, files: fresh.map(function (f) { return f.id; }),
          line: '- ' + asker(id) + ', "' + q.getAttribute('data-label') + '": ' + fresh.map(function (f) { return f.name; }).join(', ') });
        return;
      }
      if (v === undefined || data.said[id] === JSON.stringify(v)) return;
      const text = v === true ? 'Yes' : v === false ? 'No' : Array.isArray(v) ? v.join(', ') : v.replace(/\s*\n\s*/g, ' ');
      out.push({ id: id, said: JSON.stringify(v), files: [],
        line: '- ' + asker(id) + (q.hasAttribute('data-live') ? ' answer: ' : ', "' + q.getAttribute('data-label') + '": ') + text });
    });
    return out;
  }
  const fileIds = function (ans) { return ans.reduce(function (ids, a) { return ids.concat(a.files); }, []); };
  function typed(e) {
    const q = e.target.closest ? e.target.closest('.form [data-q]') : null;
    if (!q || q.getAttribute('data-kind') === 'file') return;
    const v = inputValue(q), id = q.getAttribute('data-q');
    if (v === undefined) delete data.answers[id]; else data.answers[id] = v;
    persist();
  }
  document.addEventListener('input', typed);
  document.addEventListener('change', typed);

  // ── files: checked here first, then sent at once through the link or the inbox; a send later names them by id ──
  const MB = 1024 * 1024, uploads = {}, waiting = {};
  let refs = 0;
  function upload(file, question) {
    if (hosted) {
      return file.arrayBuffer().then(function (buf) {
        return new Promise(function (resolve) {
          const ref = 'f' + (refs += 1);
          waiting[ref] = resolve;
          port.postMessage({ type: 'inbox:file', ref: ref, name: file.name, question: question, data: buf }, [buf]);
        });
      });
    }
    return fetch('file', { method: 'POST', cache: 'no-store', body: file,
      headers: { 'x-reply-key': live, 'x-file-name': encodeURIComponent(file.name), 'x-file-question': encodeURIComponent(question) } })
      .then(function (r) { return r.json().then(function (a) { return r.ok && a && /^[0-9a-f]{32}$/.test(a.id) ? { id: a.id } : { error: (a && a.error) || 'it was not sent; try again' }; }); })
      .catch(function () { return { error: 'it was not sent; try again' }; });
  }
  // The app deletes a file a day after it came, or with a tap that failed or was cancelled: one this page holds unsent
  // and the app no longer does goes back to its question, to be picked again.
  const GONE = 'A file is no longer held. Pick it again, then send.';
  function keepHeld(held) {
    let gone = 0;
    Object.keys(data.files).forEach(function (id) {
      data.files[id] = data.files[id].filter(function (f) {
        if (f.sent || held.indexOf(f.id) >= 0) return true;
        gone += 1;
        (uploads[id] = uploads[id] || []).push({ name: f.name, size: f.size, state: 'refused', why: 'the app no longer holds it; pick it again' });
        return false;
      });
    });
    if (gone) persist();
  }
  function bytesHeld() {
    return Object.keys(data.files).concat(Object.keys(uploads)).reduce(function (sum, id) {
      return sum + (data.files[id] || []).concat(uploads[id] || []).reduce(function (s, f) { return s + (f.state === 'refused' ? 0 : f.size); }, 0);
    }, 0);
  }
  function refusal(q, file) {
    const id = q.getAttribute('data-q'), ext = (/\.([a-z0-9]+)$/i.exec(file.name) || [])[1];
    const kept = (data.files[id] || []).length + (uploads[id] || []).filter(function (f) { return f.state === 'sending'; }).length;
    if (!live) return 'open this page from the chat\'s link to send files';
    if (!ext || q.getAttribute('data-types').split(',').indexOf(ext.toLowerCase()) < 0) return 'this question does not take this type of file';
    if (file.size > 25 * MB) return 'too big: 25 MB at most';
    if (kept >= +q.getAttribute('data-count')) return 'this question takes ' + q.getAttribute('data-count') + ' at most';
    if (bytesHeld() + file.size > 100 * MB) return 'the files for this page pass 100 MB';
    return '';
  }
  function send(q, entry) {
    const id = q.getAttribute('data-q');
    entry.state = 'sending'; entry.why = ''; render();
    upload(entry.file, asker(id) + ', "' + q.getAttribute('data-label') + '"').then(function (a) {
      if (a.id) {
        uploads[id] = uploads[id].filter(function (f) { return f !== entry; });
        (data.files[id] = data.files[id] || []).push({ id: a.id, name: entry.file.name, size: entry.file.size, sent: false });
        persist();
      } else { entry.state = 'refused'; entry.why = String(a.error); entry.retry = true; render(); }
    });
  }
  function pick(q, list) {
    const id = q.getAttribute('data-q');
    Array.prototype.forEach.call(list, function (file) {
      const why = refusal(q, file), entry = { file: file, name: file.name, size: file.size, state: why ? 'refused' : 'sending', why: why };
      (uploads[id] = uploads[id] || []).push(entry);
      if (!why) send(q, entry);
    });
    render();
  }
  const sizeText = function (n) { return n < MB ? Math.max(1, Math.ceil(n / 1024)) + ' KB' : (n / MB).toFixed(1) + ' MB'; };
  function drawFiles() {
    all('.form [data-kind="file"]', function (q) {
      const id = q.getAttribute('data-q'), list = q.querySelector('.files');
      list.innerHTML = (data.files[id] || []).map(function (f, i) {
        return '<li>' + esc(f.name) + ' · ' + sizeText(f.size) + ' <span class="tag">Sent</span><button type="button" class="btn-ghost" data-file="' + i + '">Remove</button></li>';
      }).concat((uploads[id] || []).map(function (f, i) {
        return '<li>' + esc(f.name) + ' · ' + sizeText(f.size) + (f.state === 'sending' ? ' <span class="muted">Sending…</span>'
          : ' <span class="why">Refused: ' + esc(f.why) + '</span>' + (f.retry ? '<button type="button" class="btn-ghost" data-retry="' + i + '">Retry</button>' : '')
            + '<button type="button" class="btn-ghost" data-drop="' + i + '">Remove</button>') + '</li>';
      })).join('');
    });
  }
  all('.form [data-kind="file"]', function (q) {
    const drop = q.querySelector('.drop'), input = drop.querySelector('input');
    input.addEventListener('change', function () { pick(q, input.files); input.value = ''; });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); pick(q, e.dataTransfer.files); });
    q.querySelector('.files').addEventListener('click', function (e) {
      const b = e.target.closest('button'), id = q.getAttribute('data-q');
      if (!b) return;
      if (b.hasAttribute('data-file')) { data.files[id].splice(+b.getAttribute('data-file'), 1); persist(); return; }
      const entry = uploads[id][+(b.getAttribute('data-retry') || b.getAttribute('data-drop'))];
      if (b.hasAttribute('data-retry')) send(q, entry);
      else { uploads[id] = uploads[id].filter(function (f) { return f !== entry; }); render(); }
    });
  });

  // ── what the build needs: an item that needs you counts until each of its questions has an answer ──
  function needsOpen() {
    return Array.prototype.filter.call(document.querySelectorAll('.need[data-need="needs"]'), function (n) {
      const qs = n.querySelectorAll('[data-q]');
      return !qs.length || Array.prototype.some.call(qs, function (q) { return !answered(q); });
    });
  }
  function drawNeeds() {
    const gaps = needsOpen();
    all('.need[data-need="needs"]', function (n) {
      const done = gaps.indexOf(n) < 0, tag = n.querySelector('.tag-outline, .tag');
      tag.className = done ? 'tag' : 'tag-outline';
      tag.textContent = done ? 'Answered' : 'Needs you';
    });
    return gaps.length ? gaps.length + (gaps.length === 1 ? ' thing needs you' : ' things need you') : '';
  }

  // ── live cards: the chat's own page in a sealed frame, talking to this page only through the port it is handed ──
  // A frame loads once; a second load means its page went somewhere else, so it starts again from its own copy.
  const cards = [];
  function mount(c) {
    if (c.port) c.port.close();
    c.port = null;
    const f = document.createElement('iframe');
    let loads = 0;
    f.setAttribute('sandbox', 'allow-scripts'); f.title = c.title; f.setAttribute('srcdoc', c.doc);
    f.addEventListener('load', function () {
      loads += 1;
      if (loads === 1) {
        const ch = new MessageChannel();
        c.port = ch.port1;
        ch.port1.onmessage = function (e) { heardCard(c, e.data); };
        f.contentWindow.postMessage({ type: 'review:hello' }, '*', [ch.port2]);
        return;
      }
      c.resets += 1;
      c.said.hidden = false;
      c.said.textContent = 'This card tried to leave the page.' + (c.resets > 2 ? ' Reload the page to try it again.' : '');
      if (c.resets > 2) { f.remove(); c.port.close(); c.port = null; } else mount(c);
    });
    c.stage.replaceChildren(f);
    c.frame = f;
    fitCard(c);
  }
  function heardCard(c, m) {
    if (!m || m.type !== 'review:answer' || typeof m.text !== 'string') return;
    const text = m.text.slice(0, 2000);
    if (text.trim()) data.answers[c.id] = text; else delete data.answers[c.id];
    persist();
  }
  // Phone and Computer draw the page at that width, scaled to the card; full screen shows it at true size.
  function fitCard(c) {
    if (!c.frame) return;
    const full = c.box.classList.contains('full'), k = full ? 1 : Math.min(1, c.stage.clientWidth / c.width);
    c.frame.style.width = c.width + 'px';
    c.frame.style.height = full ? '100%' : c.height + 'px';
    c.frame.style.transform = k < 1 ? 'scale(' + k + ')' : '';
    c.stage.style.height = full ? '' : Math.ceil(c.height * k) + 'px';
  }
  function full(c, on) {
    c.box.classList.toggle('full', on);
    document.body.classList.toggle('viewing', on);
    c.tools.querySelector('[data-full]').textContent = on ? 'Close' : 'Full screen';
    fitCard(c);
    if (!on) bar();
  }
  all('.live[data-live]', function (box) {
    const old = box.querySelector('iframe'), tools = document.createElement('div'), said = document.createElement('p');
    tools.className = 'live-tools';
    tools.innerHTML = '<button type="button" class="btn-ghost" data-width="390" aria-pressed="true">Phone</button>'
      + '<button type="button" class="btn-ghost" data-width="1280" aria-pressed="false">Computer</button><button type="button" class="btn-ghost" data-full>Full screen</button>';
    said.className = 'muted live-said'; said.setAttribute('role', 'status'); said.hidden = true;
    const c = { box: box, id: box.getAttribute('data-live'), height: +box.getAttribute('data-height') || 640, width: 390, doc: old.getAttribute('srcdoc'),
      title: old.title, stage: box.querySelector('.live-box'), tools: tools, said: said, port: null, frame: null, resets: 0 };
    box.insertBefore(tools, c.stage); box.appendChild(said);
    tools.addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-full')) { full(c, !box.classList.contains('full')); return; }
      c.width = +b.getAttribute('data-width');
      all('[data-live="' + c.id + '"] [data-width]', function (w) { w.setAttribute('aria-pressed', String(w === b)); });
      fitCard(c);
    });
    cards.push(c);
    mount(c);
    // A stage first laid out at no width, as in an Inbox frame still opening, fits again once it gets its width.
    if (window.ResizeObserver) new ResizeObserver(function () { if (c.stage.clientWidth !== c.seen) { c.seen = c.stage.clientWidth; fitCard(c); } }).observe(c.stage);
  });
  window.addEventListener('load', function () { cards.forEach(fitCard); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cards.forEach(function (c) { if (c.box.classList.contains('full')) full(c, false); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    cards.forEach(fitCard);
    if (open) place();
    bar();
  });
  // ── hosted: in the live app's inbox, a sealed frame that reaches the inbox only through the port its first greeting carries ──
  let hosted = null, port = null;
  const CODES = { sent: 200, changed: 409, done: 409, gone: 409, soon: 429, closed: 410, expired: 410 };
  function post(message) { port.postMessage(message); }
  // The inbox answers a tap only once the chat has it, or once it is refused, cancelled or failed.
  function hostedAsk(path, body) {
    return new Promise(function (resolve) {
      hosted.reply = function (state) {
        const status = Object.prototype.hasOwnProperty.call(CODES, state) ? CODES[state] : 502;
        const answer = status === 200 ? { sent: true } : state === 'changed' || state === 'done' || state === 'gone' ? { [state]: true } : { sent: false };
        resolve({ ok: status === 200, status: status, json: function () { return Promise.resolve(answer); } });
      };
      const tap = { type: 'inbox:tap', action: path === 'send' ? 'send' : body.action, text: body.text || '' };
      if (body.files) tap.files = body.files;
      post(tap);
    });
  }
  // The inbox's switch owns the look: this frame can't remember a choice, so its own switch goes. Unknown looks change nothing.
  function look(theme) { if (theme === 'light' || theme === 'dark') document.documentElement.classList.toggle('dark', theme === 'dark'); }
  function heard(m) {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'inbox:theme') look(m.theme);
    else if (m.type === 'inbox:notes' && (typeof m.value === 'string' || m.value === null)) {
      load(m.value);
      if (hosted.held) keepHeld(hosted.held);
      hosted.held = null; render();
    } else if (hosted.reply && m.type === 'inbox:result') {
      if (Array.isArray(m.files)) keepHeld(m.files);
      const reply = hosted.reply; hosted.reply = null; reply(m.state);
      // A tap that reached the chat closes the page in the inbox, so it reads as answered now, as its Archive shows it.
      if (m.state === 'sent') closePage();
    } else if (m.type === 'inbox:file-result' && waiting[m.ref]) {
      const done = waiting[m.ref];
      delete waiting[m.ref];
      done(typeof m.id === 'string' && /^[0-9a-f]{32}$/.test(m.id) ? { id: m.id } : { error: typeof m.error === 'string' ? m.error : 'it was not sent; try again' });
    }
  }
  // Back and the workspace sit first in the page, so they scroll away with its words; the inbox's own bar stays put.
  function backRow(workspace) {
    const row = document.createElement('div'), back = document.createElement('button');
    row.className = 'back'; back.type = 'button'; back.className = 'btn-ghost'; back.textContent = 'Back';
    back.addEventListener('click', function () { post({ type: 'inbox:back' }); });
    row.appendChild(back);
    if (typeof workspace === 'string' && workspace) {
      const where = document.createElement('span');
      where.className = 'muted'; where.textContent = workspace; row.appendChild(where);
    }
    document.querySelector('main > header').prepend(row);
  }
  // A closed or answered page in the inbox is read-only: no button, no note, no answer or file.
  function closePage() {
    readOnly = true; document.body.classList.add('read-only');
    all('.form input, .form textarea', function (el) { el.disabled = true; });
    render();
  }
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (hosted || window.parent === window || e.source !== window.parent || !e.ports || !e.ports[0] || !m || m.type !== 'inbox:hello'
      || typeof m.version !== 'string' || !Array.isArray(m.actions)) return;
    // The files the app still holds for this page, checked once its notes arrive.
    hosted = { reply: null, held: Array.isArray(m.files) ? m.files : null };
    port = e.ports[0];
    port.onmessage = function (ev) { heard(ev.data); };
    document.querySelectorAll('.theme-toggle').forEach(function (button) { button.remove(); });
    look(m.theme);
    // Notes live with the inbox page: this frame has no storage of its own.
    store = { setItem: function (key, value) { post({ type: 'inbox:notes-set', key: key, value: value }); } };
    post({ type: 'inbox:notes-get', key: KEY });
    backRow(m.workspace);
    if (m.readOnly === true) { closePage(); return; }
    setLive('inbox'); offer(m); render();
  });
  // In a frame, a link opens its own tab and a # link scrolls in place: the frame never leaves this page.
  // A srcdoc page resolves #why against the inbox's address, so following it would load the inbox here.
  document.addEventListener('click', function (e) {
    const a = window.parent !== window && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.charAt(0) !== '#') { a.target = '_blank'; a.rel = 'noopener noreferrer'; return; }
    e.preventDefault();
    if (href.charAt(1) === '/') { jump(href); return; }
    let el = null;
    try { el = document.getElementById(decodeURIComponent(href.slice(1))); } catch (err) { /* a bad escape names nothing */ }
    if (el) el.scrollIntoView({ block: 'start' });
  }, true);
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
