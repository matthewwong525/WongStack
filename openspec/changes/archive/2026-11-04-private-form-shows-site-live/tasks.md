# Tasks

## 1. The scripts

- [x] 1.1 From `/root/WongOS`, apply `git diff f25f88c1^ f25f88c1 -- .agents/skills/hand-over/scripts .agents/skills/browser/scripts ':!*.test.mjs'` here; add the failed `refNames` hunk in `browse.mjs` by hand after `boxesIn` (design decision 1). Confirm no WongOS-only part came in.
- [x] 1.2 Port WongOS's new and changed test cases into `scripts/tests/browse.test.mjs`, `browser-server.test.mjs`, `hand-over.test.mjs`, `form.test.mjs`, and a new `scripts/tests/live-pages.test.mjs`, with this repo's import paths (design decision 2). Update any existing case here that expected boxes put back after a pressed send.

## 2. The wiki

- [x] 2.1 Apply WongOS's hunks to `wiki/development/private-form.md`, `passwords.md` and `live-view.md`.
- [x] 2.2 Apply WongOS's `browsing.md` hunks except the refusal-section rewrite and lease context, keeping the page under 3,000 words (design decision 3).
- [x] 2.3 Add the `## Next (minor)` entry to `CHANGELOG.md` (design decision 4).

## 3. Check

- [x] 3.1 Run `node --test scripts/tests/{browse,browser-server,form,form-page,hand-over,live-line,live-pages,passwords,passwords-page,view,view-page}.test.mjs`, `node .github/scripts/checks.mjs --worktree`, and `openspec validate private-form-shows-site-live --strict --no-interactive`; fix each failure this change caused.

## 4. Review fixes

- [x] 4.1 Fix three review findings: add a `browser-logins` delta that matches what ships (the site live from the press, no box emptied after a press, no not-accepted or new form after a press, the 30-minute watch with a live view) and list it in the proposal; update `wiki/maintaining/time-the-private-form.md` for a `never` site's `unconfirmed` end; complete the read lists in `private-form.md` (the ready snapshot) and `live-view.md` (`--until-text`). Then rerun the checks of 3.1 and the wiki checks.
