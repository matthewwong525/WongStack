# Tasks

## 1. The save path

- [x] 1.1 In `app/worker/employee-access/code.ts`, make `passed()` return a `Failed` value (step, status, error) instead of `null`, split `upstream()` into a throwing `reach()` it wraps, and keep the published-branch and report failures the same way; read calls still answer `codeUnavailable()`. Verify: `npx vitest run worker/employee-access` from `app/`.
- [x] 1.2 Answer a failed save with the reason line (refs → `ng` report; GET or probe → `text/plain` 503) and log one `code_save_failed` line; pass `who` from `router.ts`. Verify: tests in 1.3.
- [x] 1.3 In `code.test.ts`, cover: 403 on the push → *GitHub answered 403* and a log line with no key, `Authorization` value or body; `fetch` throws → *could not be reached*; default-branch look-up 500 → *GitHub answered 500*, nothing pushed; a non-JSON 200 there → *could not be read*, log `error` is `SyntaxError`; an oversized report → *could not be read*; Cloudflare token failure → *Cloudflare gave no key to save with*; a bad key on `GET info/refs` → `text/plain` 503 with the line. Update the tests that expected `code_unavailable` on a save.

## 2. Docs and release

- [x] 2.1 In `wiki/stack/employee-project.md` add the failed-save line to *What the app takes and refuses* with what to do for each reason and the `code_save_failed` log search; in `wiki/stack/project-git-route.md` change the `code_unavailable` bullet to say a failed save names the place and its number. Verify: `node scripts/check-payload-links.mjs`.
- [x] 2.2 Add a `## Next (patch) — A failed save says why` entry to `CHANGELOG.md`. Verify: the entry is at the top of the entries.

## 3. Verification

- [x] 3.1 Run `node .github/scripts/checks.mjs --worktree`; it passes, or each failure is unrelated and noted in the Decision log.
- [ ] 3.2 `/save`: the online checks pass and the preview link is returned.
