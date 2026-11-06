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
