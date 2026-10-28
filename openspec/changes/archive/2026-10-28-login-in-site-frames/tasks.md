## 1. Browser script

The source is WongOS commit `1dedc6b`; read it from any WongOS checkout (`git -C <wongos> show 1dedc6b -- .agents/skills/browser/scripts/`). Port its hunks; leave out the WongOS-only parts (design Non-Goals).

- [x] 1.1 Add `FRAMES_SCRIPT`, `frameSites`, and `labelFrames` in `.agents/skills/browser/scripts/browse.mjs`, and use them in `page.snapshot()` after `relabel` and `hideSecrets` (design §1). Write tests in `scripts/tests/browse.test.mjs`: a frame header gets its `(host)` and the first-line note; a hostname label; an unknown label; two same-named frames on different hosts read as unknown; a frame with only an `id`; no note with no frame block.
- [x] 1.2 Add `frameOf` and the per-box site check in `login`, with a fresh snapshot before typing and before the password (design §2). Write tests: a login for `example.com` types into a `login.example.com` frame; a frame from another host and an unknown frame get nothing and `wrong-site`.
- [x] 1.3 Add the keyed `typed` record and pass it to `hideSecrets` (design §3). Write tests: a box showing the typed password as text reads `[hidden]`; another value does not; no password text is in the tab file.
- [x] 1.4 Press Enter in the typed box when there is no `--submit`, and add the `next-step` result (design §4), listed in `USAGE`. Write tests: Enter goes to the typed ref; no password box after the wait gives `next-step`; a password box still there gives `rejected`; a code box named *Verification code* still gives `next-step`.
- [x] 1.5 Add the plain selector error for `count` and `fieldScript` (design §5) and the selector rule in `USAGE`. Write a test that the error's text names refs.

## 2. Docs

- [x] 2.1 Move the *Steps for you to finish* list in `wiki/development/browsing.md` to a new `wiki/development/finish-steps.md`, keeping the heading in browsing.md with a one-line link, and link the new page from `wiki/development/README.md` under Browsing. Add it to the payload file list if wiki/development pages are listed one by one.
- [x] 2.2 Update `wiki/development/browsing.md#saved-browser-logins`: boxes in a frame (the note, the site header, use the refs), `next-step` in the result list with a link to [login codes](../../../wiki/development/login-codes.md), and the saved login, or the password form, before a live view, which comes only after a frame's refs failed. General words: no named site, person, or WongOS-only line. Add one line to `.agents/skills/browser/SKILL.md`; offset it if `measure-context.mjs --check` needs.
- [x] 2.3 Add a `## Next (minor) — Saved logins work in sign-in boxes from another site` entry at the top of `CHANGELOG.md`, with an **Updating.** note that says nothing is needed by hand. Leave `VERSION` alone.

## 3. Verification

- [x] 3.1 Run `node --test scripts/tests/browse.test.mjs`, `node .github/scripts/checks.mjs --worktree`, and `openspec validate login-in-site-frames --strict --no-interactive`; confirm browsing.md is under 3,000 words.
- [x] 3.2 Before any push or pull request, show Matthew the pull request's title, body (why every WongStack repo needs this), and file list, and wait for his yes (outward).
