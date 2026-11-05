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
