# Tasks

## 1. The Keys list's line

- [x] 1.1 In `app/src/apps/access/levels.ts`, split what a key does alone (`installs the project`, `look-ups`) from `, no app needed`: `aloneLine` keeps both, `keyUseShort` uses the first part only. Update `levels.test.ts`: `keyUseShort` gives `Look-ups`, `1 app · Look-ups` and `Installs the project`; `aloneLine` and `keyUseLine` expectations stay unchanged. Verify by reading that no other caller's words change.
- [x] 1.2 Add to `levels.test.ts` a bound on the list's line: each alone wording with a two-digit app count is at most 30 characters. Verify the expectation fails against the old wording.
- [x] 1.3 Update `Grants.test.tsx`: the Cloudflare row's *Used by* cell reads `Look-ups` in both list checks; the opened key's `Look-ups, no app needed · Read only` stays. Verify no other test names the list's old words.

## 2. The release

- [x] 2.1 Add `## Next (patch) — A "Used by" line that fits` at the top of `CHANGELOG.md`'s entries, in plain words, with an **Updating.** note: nothing needs doing by hand. Verify `VERSION` is untouched.

## 3. Verification

- [x] 3.1 From `app/`, run `npm test` and `npm run build:app`. Verify both pass.
- [x] 3.2 Run `node .github/scripts/checks.mjs --worktree`. Verify every step passes.
- [x] 3.3 Run `openspec validate "short-used-by-line" --strict --no-interactive`. Verify it reports valid.
- [ ] 3.4 `/save`, then open Access → Keys on the preview at a wide width, at the narrowest width that still shows one-line rows, and at a phone width. Verify Project code's line reads *Installs the project* with no "…", and that opening it still shows *Installs the project, no app needed · Read only*.
