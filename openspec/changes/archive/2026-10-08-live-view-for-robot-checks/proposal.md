# Tap through a robot check in a live view

**Status:** planned
**Branch:** test-browser-auth
**Open questions:** none

## Why

On 2026-10-08 Messenger took the saved password, then asked *I'm not a robot*. Nothing let you tick that box in the assistant's browser, and ticking it on your own phone doesn't sign the assistant in. So a saved password alone can't get the assistant into a site that adds a check. A trial the same day got through: a private link showed the assistant's browser, you did the puzzle, and Messenger signed in. It took two fixes on the way, and this plan keeps both.

## What Changes

- **A robot check gets a live view you tap through.** When a site asks whether a person is there, with a tick box or a picture puzzle, the assistant asks if you're ready. Then it sends a private link that shows its browser on that page. You tick the box or do the puzzle. The link closes itself once the site lets you through, and the assistant carries on. The assistant never ticks or solves a check itself.
  ```text
  site shows a check
        │
        ▼
     "Ready?" ─▶ live view ─▶ you tap through
                                   │
              ┌────────────────────┤
              ▼                    ▼
        site moves on        still refused
              │                    │
              ▼                    ▼
        carries on           steps for you
  ```
- **The live view, on a phone.** The assistant's browser fills the page, with one box under it and no buttons. Tap a box in the browser, then type in ours: each letter goes straight into the browser as you type it. It ends on a plain line and tells you to go back to the chat.
  ```text
  ┌──────────────────────────────┐
  │ facebook.com/...             │
  │                              │
  │  Your name [Matt|]           │
  │  [ ] I'm not a robot         │
  │                              │
  ├──────────────────────────────┤
  │ [Matt|                     ] │
  └──────────────────────────────┘
    before you type:
  ┌──────────────────────────────┐
  │ [Tap a box above, then type] │
  └──────────────────────────────┘
    while it connects:
  ┌──────────────────────────────┐
  │ Opening the browser...       │
  └──────────────────────────────┘
    once the site lets you through:
  ┌──────────────────────────────┐
  │ Done. Go back to the chat.   │
  └──────────────────────────────┘
    closed, or out of time:
  ┌──────────────────────────────┐
  │ This link has closed.        │
  │ Ask in the chat for a new    │
  │ one.                         │
  └──────────────────────────────┘
  ```
- **The whole page fits your screen.** In the trial you saw only the top-left corner, because the browser's window was twice the size of the screen being shown. The view now fits the page to what you hold, narrow on a phone and wide on a laptop, and puts it back when the link closes.
- **The page no longer closes under you.** The assistant's browser closes any page left alone for 5 minutes, and your taps don't count as use. In the trial that blanked the view and restarted the puzzle. Now a page stays open for as long as a link is using it.
- **Card forms get the same fix.** A card form you take more than 5 minutes over can fail today for the same reason, with nothing sent. It stays open now too.
- **You can type and paste from a phone.** There is no send button. What you type, delete, or paste in the box happens in the browser at once, letter by letter, and so do Enter and Tab. A box in the browser that already holds text is no trouble: you add to it, or keep deleting. When your phone's keyboard opens, the box sits on top of it and the browser stays in sight above.
- **It stays open for eight hours, and it can drive a browser signed in as you.** Anyone who gets the link while it's open can use the accounts that browser is signed in to. It closes when the site lets you through, when you say *done* in the chat, or after eight hours. The page has no close button: you close the tab. Only one private link is open at a time, and the view needs the link's own secret.
- **Only for robot checks.** A password, a code, a card, and an ordinary answer keep the routes they have. *Let me take over* still opens nothing anywhere else. A passkey or an approval on your phone stays on your own device: neither can travel through a view of another computer's browser.
- **A site that still refuses after your try ends with steps for you**, as today. Each site gets one live view per task, so a site that won't be satisfied isn't tried again and again.
- **After a sign-in, the assistant looks for a check.** *Accepted* only means the password page was passed. The assistant reads the next page and offers the live view when it's a check, before saying it's signed in.
- **Three small tools, installed once with your yes.** One goes in your home folder. Two need admin rights on the computer, which the browser itself did not.
- **On a Mac, nothing changes yet.** There the assistant's browser has no screen to show, so a check still ends with steps for you.

Non-goals: no service that solves checks, no second browser, no hired network address, no live view for anything but a check, no Mac support, and no change to how long the other private links stay open.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: a check that asks whether a person is present goes to a live view the person taps through, with steps only when the site still refuses or the machine can't show one; the ban on any live view narrows to everything but such a check; a page stays open while a private link is using it.
- `dependencies`: the live view's tools join what a machine may need, installed on first use with consent, two of them with admin rights.

## Impact

- `.agents/skills/hand-over/scripts/hand-over.mjs`: a fourth mode, `open --view (--until <glob> | --until-gone <selector>) [--session <name>] [--note <line>] [--minutes N]`, default 480 minutes; `HANDOVER_NEEDS=live-view` (exit 3) and `HANDOVER_VIEW=unsupported`; a keep-alive for any link that works on a page (`--form` and `--view`).
- New `.agents/skills/hand-over/scripts/view.mjs` (screen source, fit, front, restore), `lib/ws-bridge.mjs` (the keyed screen connection), `view-page.html` and `view-page.mjs`; new `scripts/tests/view.test.mjs`, `ws-bridge.test.mjs`, `view-page.test.mjs`; additions to `scripts/tests/hand-over.test.mjs` and its fake camofox server.
- `.agents/skills/browser/scripts/browse.mjs`: its client gains the resize, evaluate, and keep-alive calls the watcher needs; no new command.
- `.agents/skills/hand-over/SKILL.md`: one line for the fourth mode, inside the word budget.
- New `wiki/development/live-view.md`; edits to `browsing.md` (at its 3,000-word cap, so each addition replaces text with a link), `login-codes.md`, `required-tools.md`, and the `development/README.md` hub.
- `.agents/skills/update-dependencies/scripts/update.mjs`: knows the pinned viewer version.
- New on a machine, not in the repo: noVNC 1.6.0's `core/` and `vendor/` files from its source release in `~/.wong-stack/live-view/`, checked against a recorded fingerprint; system packages `x11vnc` and `xdotool`. Linux only, where camofox runs on a virtual screen.
- The unpublished plan `links-active-eight-hours` (workspace `musing-cat`) edits `hand-over.mjs`, its test, and `browsing.md`; whichever publishes second merges by hand. This plan leaves the other links' time limits to it.
- `CHANGELOG.md` *Next (minor)* entry.

## Decision log

- **2026-10-08** — Asked to test whether the assistant can sign in to a site with a saved password → tried Messenger: the password link saved the login, the sign-in was accepted, and a robot check stopped it.
- **2026-10-08** — Asked to be handed the check, *i'll click into it* → told nothing shows the browser since 34.0.0; he recalled the screen viewer from the 2026-10-07 trial.
- **2026-10-08** — Asked how to get the live view back → chose a quick trial now over a plan first. The trial signed Messenger in after two fixes: fitting the window, and keeping the page open.
- **2026-10-08** — Asked to package the trial into a plan with every correction → this plan.
- **2026-10-08** — Asked where to plan it, given the unpublished eight-hour links plan edits the same code → chose keep going here.
- **2026-10-08** — Asked which stops get the live view → chose any robot check, at a site's front door or after a sign-in.
- **2026-10-08** — Asked how long a live view stays open → chose eight hours, over the recommended 30 minutes and over 10 minutes.
- **2026-10-08** — Asked whether to fix the 5-minute fault for card forms here → chose fix it here.
- **2026-10-08** — Assumed: passkeys and phone approvals stay out, because a passkey lives on the person's own device and can't be used through a view of another computer; the 2026-10-07 note that named them for the live view was wrong on this.
- **2026-10-08** — Assumed: the assistant asks *Ready?* before sending the link, as it does for a password link and a private form, because the link can drive a signed-in browser and a puzzle on the page can go stale.
- **2026-10-08** — Assumed: the view is served by the private link's own page behind its own secret, not by the trial's separate helper with an 8-character password, because this link can use the person's accounts; it also needs one tool fewer.
- **2026-10-08** — Assumed: the page is fitted with the browser's own resize call, not the window tool the trial used, because a check on 2026-10-08 showed that call resizes the window too (2560x1385 to 1280x697); the window tool only brings the page to the front.
- **2026-10-08** — Assumed: the view fits a phone first, because the chat that asks *Ready?* is most often read on one.
- **2026-10-08** — Assumed: the screen viewer comes from npm at one pinned version into the home folder, and the other two tools from the system's packages, because a pinned viewer is the one tested and the other two have no home-folder install.
- **2026-10-08** — Assumed: one live view per site per task, then steps for the person, because repeats at a site that keeps refusing can lock the account.
- **2026-10-08** — Assumed: a Mac is left for later, because the browser runs there with no screen to show.
- **2026-10-08** — Assumed: the other private links keep their time limits here, because the eight-hour links plan owns them.
- **2026-10-08** — Assumed: the live view gets its own guide page, because the browsing guide is one word under its 3,000-word cap.
- **2026-10-08** — Assumed: a minor release, because it adds behavior and breaks nothing an install relies on.
- **2026-10-08** — Building: the three proofs in the first task group were run in the chat before the build, because they need this machine's real browser and a download outside the repo, which the build helper may not do.
- **2026-10-08** — Building: the screen is reachable over a private socket with no browser restart, as planned. Found on the way: the screen tool still opened a network port with no password unless told twice not to. The plan now closes it and refuses to open a link if any port is open.
- **2026-10-08** — Building: the screen viewer does not come from npm after all, because that package can't load in a browser. It comes from the viewer's own 1.6.0 release, into the home folder, and is checked against a recorded fingerprint before use. These are the same files the trial used.
- **2026-10-08** — Building: the link reads the page's size and starts the screen before it opens its address, and keeps both in its own record. So the page is put back and the screen stopped even when the link's helper has died.
- **2026-10-08** — Building: the recorded fingerprint was checked against the copy of the viewer already on this computer. It matches when the files are sorted by path as plain bytes, so the install sorts them that way.
- **2026-10-08** — Building: where the assistant can't use admin rights without a password, the install adds nothing at all, the viewer included, and prints the one command for the person.
- **2026-10-08** — Building: text sent from the type box travels through the screen's clipboard, which carries only Western European letters; any other character arrives as `?`. Left as it is: the trial worked the same way.
- **2026-10-08** — Building: the line *the browser runs with no window* came out of the browsing guide, because a live view now shows that window.
- **2026-10-08** — Building: after a link that closed or ran out, the guide has the assistant offer a new link only when the person never got to the check. A try the site refused counts as that site's one view.
- **2026-10-08** — Building: the tests were run once, with the local checks at the end, not after each group of tasks.
- **2026-10-08** — Building: two faults found by trying the built link on the real browser, both fixed, neither visible to the automated tests because they use stand-ins. The link's page could say *closed* on an open link, because it started before the screen viewer had finished loading; it now waits for it. And an extra guard flag on the screen tool made it drop every connection; it is removed, and the check that no network port is open stays.
- **2026-10-08** — Asked whether to install the screen viewer and test on the real browser → chose install and test.
- **2026-10-08** — Building: two more faults found by trying a phone-sized view from a separate browser, both fixed. On the phone fit the page's window was not kept in front, because the browser's window can't go narrower than about 500 and the match wanted exactly 480. And the keyboard could stay with another page on the same screen, so typing could land in the wrong page; the page's window now gets the keyboard whenever it is brought to the front.
- **2026-10-08** — Building: checked on the real browser: a view left untouched for 13 minutes kept its page; a card form left for 7 minutes still filled a pretend checkout; the screen refuses a missing or wrong secret; no network port serves the screen; closing puts the page's size back and removes the screen tool's folder; a second task's page does not stay in front; typed text, *Send*, and *Delete* reach the page from a phone-sized browser after a tap in the box.
- **2026-10-08** — Building: while testing typing, the assistant's own blind click ticked the test tick box on its pretend page (Google's public test widget, not a real site's check). The page was reloaded; the person's own run starts unticked.
- **2026-10-08** — Assumed: the install's *no* path is left to its automated test and the guide, because the person said yes when asked and a second ask only to hear a no would waste his time.
- **2026-10-08** — Asked why the page puts a frame around the browser, *it was better when i was testing it out and logging in* → told it was for typing and closing. Asked how the page should look → answered: *we need a better UI for this sort of thing maybe like tuck away and a button to type that opens up a textbox*, and *when it's in type mode it's clearly communicated to us that it's typing and what's happening and will paste it in*. The browser now fills the page; typing and closing sit behind two buttons.
- **2026-10-08** — Building: the typing panel sits above the browser and moves it down, because drawn over the browser it covered the box being typed into. A send with a character the screen can't carry is refused and names it, because it would arrive as a question mark.
- **2026-10-08** — Building: a viewer that fails to load is tried again twice, then the page says to reload, because a page left on *Opening the browser...* gave no way forward. Seen with a test browser on a server whose temp space was full.
- **2026-10-08** — Asked to try the tucked-away layout → answered: no *Pretend Shop wants to know...* line in the bar, and *have like the send button and the input box on the left already*, *kind of like messaging someone*. The bar is now a box, *Send*, and *More*, always there; the line about what the site wants is the page's title only; the typing mode and its button are gone.
- **2026-10-08** — Asked to try the messaging-style bar → answered: remove *More*, *no need for close without finishing we'll just close the browser*, no line saying a key was pressed, and *as they type it'll update the screen as well*, *no need for send button*. The page is now the browser and one box that types straight into it; nothing else.
- **2026-10-08** — Building: each change to the box is sent as key presses, a Backspace per character that went and then each that came, because that carries a phone's autocorrect and a paste as they look. Tried on the real screen: capitals, punctuation, an accented letter, a Chinese character, and a delete all arrived. The earlier paste-through-the-clipboard route and its plain-characters limit are gone.
- **2026-10-08** — Assumed: the page does not read what a box in the browser already holds to fill ours, though he said it would be cool, because the link's promise is that its helper reads nothing on the page, a password box would be read too, and a check's own boxes sit in a frame that can't be read. Typing live already adds to or deletes what is there.
- **2026-10-08** — Asked for a phone run and a laptop run before publishing → he did one run on the final layout, which passed end to end, and typed `/ship`. The second device and a real picture puzzle on this build were not run; the plan's last check is recorded as what was seen.
