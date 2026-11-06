# The live view is the one place for sensitive input

**Status:** planned
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
