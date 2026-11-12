# Tasks

## 1. Prove the agent can pick from 1Password's list

- [x] 1.1 With the browser's 1Password signed in and unlocked (send the person the browser if it is locked), and a test login in it for a local test page's host, check from a scratch script that the in-page fill list's entry names can be read from its frame and that clicking one fills the page (design decision 2). Verify: the page's own check confirms the fill, and no password appears in output. If it fails, stop and return to the person with the design's fallback; build nothing more.

## 2. The add-on code

- [x] 2.1 Add the default 1Password add to `.agents/skills/browser/scripts/addons.mjs` (design decision 1): `defaults` in `addons.json`, the add at the end of `browse.mjs install` and once in `startArgs()`, `removed` on removal, `skipped` beside another password manager, failures that keep the start going.
- [x] 2.2 Add `addon logins` and `addon pick <n>` to `addons.mjs` and their one opening in `browse.mjs`'s guard (design decision 2), keeping every other step aimed at an add-on refused.
- [x] 2.3 Change `ADVICE` to the 8-hour auto-lock (design decision 4).
- [x] 2.4 Write tests in `scripts/tests/addons.test.mjs` and `scripts/tests/browse.test.mjs`: a new install adds 1Password; an older browser gets it once; removed stays removed; another password manager means skipped; a failed download keeps the start and retries; with a stub frame, `logins` prints names only, `locked`, and `none`; `pick` without a recent `logins` is refused; any other click or typing aimed at the frame is still refused. Verify: `node --test scripts/tests/addons.test.mjs scripts/tests/browse.test.mjs`.
- [x] 2.5 Run `addon logins` and `addon pick` against the real 1Password from 1.1. Verify: the test page signs in and no value appears in output.
- [x] 2.6 Refuse `press`, but Escape, and `type` with `pressEnter` or `submit`, in `browser-server.mjs`'s guard while a password manager's frame shows on the page. Verify: `node --test scripts/tests/browser-server.test.mjs`.
- [x] 2.7 Treat an older version's `declined` answer as `removed` in `addDefault`. Verify: `node --test scripts/tests/addons.test.mjs`.
- [x] 2.8 Make no default add in `browse.mjs install` while a browser runs; the next start adds it. Verify: `node --test scripts/tests/browse.test.mjs`.
- [x] 2.9 Add the 8-hour auto-lock advice to the first 1Password sign-in turn in `SKILL.md`, and a MODIFIED delta for *The person's choice of add-on, after their yes* with the default add's exception. Verify: `openspec validate fill-logins-from-1password --strict --no-interactive`.
- [x] 2.10 Make `addon pick` report a fill only when a box changed and the password box, or a 2-step login box, holds a value, compared inside the page. Verify: `node --test scripts/tests/browser-server.test.mjs`.
- [x] 2.11 Give the default add's first site call an 8-second limit, and wait a day after a failed try. Verify: `node --test scripts/tests/addons.test.mjs scripts/tests/browse.test.mjs`.
- [x] 2.12 Test `HOLDS_FOCUS` with a small stand-in `document` and nested shadow roots, open and closed. Verify: `node --test scripts/tests/browser-server.test.mjs`.
- [x] 2.13 Count only shown password boxes in `addon pick`'s fill check, so a hidden one, as on Google's email step, does not block the 2-step rule. Verify: `node --test scripts/tests/browser-server.test.mjs`.

## 3. The rule and help pages

- [x] 3.1 Add the *Sign in with 1Password* rule to `.agents/skills/browser/SKILL.md` (design decision 3): ask every time with the login, site and numbered steps, pick only after a yes, only those steps, ask again for anything else, the end report, and the sign-in turn otherwise, with `addon open` first.
- [x] 3.2 Update `wiki/development/password-manager.md`: 1Password comes by default (and how removal sticks), *Use it at a sign-in* with the agent's ask and pick, *Keep it safe* with the 8-hour auto-lock and the never-unlock rule.
- [x] 3.3 Add one clause at the sign-in step of `wiki/development/browsing.md`, with an equal cut, linking the page.
- [x] 3.4 Add a minor entry to `CHANGELOG.md`.

## 4. Checks

- [x] 4.1 Run `openspec validate fill-logins-from-1password --strict --no-interactive`, `node --test scripts/tests/addons.test.mjs scripts/tests/browse.test.mjs`, and the wiki checks (`node --test scripts/tests/wiki-links.test.mjs`).
- [x] 4.2 `/save`, then confirm CI passes on the saved change.
