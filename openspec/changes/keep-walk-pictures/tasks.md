# Tasks

## 1. The picture route (Worker)

- [x] 1.1 Add `.agents/skills/verify/worker/walk-pictures.mjs` and its `.d.mts`, exporting `WALK_PREFIX` and `handleWalkPictures(request, bucket, identity)` as the design's "What the route accepts" says; verify the module imports nothing from the memory skill or `app/`.
- [x] 1.2 Add `scripts/tests/walk-pictures.test.mjs` on a fake bucket; verify it covers: a service PUT then a user GET returns the same bytes with the fixed headers; a user PUT is `403`; a second PUT to one key is `409` and the first bytes stay; a non-PNG body is `415`; over 10 MB is `413`; no bucket is `404 no_bucket`; no identity is `404` (`no_login` on PUT); and `sessions/…` asked through `/_walk/` in plain, percent-encoded, and `..` forms is `404` with the bucket never read.
- [x] 1.3 Add the import and the `/_walk/` branch to `app/worker/index.ts` after the identity check, and declare nothing new in `app/wrangler.jsonc`; verify a new case in `app/worker/index.test.ts` shows a logged-in GET reaching the route, an anonymous request on a private site answering `401` before it, and a mini app's env still lacking `MEMORY_BUCKET`.

## 2. Build on the agreed base

- [x] 2.1 Build on `main` as it stands: the person chose on 2026-10-03 not to wait for PR #244. Keep this change's edits to the `publish` case below its opening lines, the new `pictures` case, and section f's publish block, result bullets, and picture lines, so PR #244's scrub (the top of `publish`) and its section d and summary-line edits can merge beside them; verify the finished diff touches neither section d nor the `run` case.
- [x] 2.2 Re-copy "Evidence is posted on every verdict" from the main spec into this change's MODIFIED block if `main` changed it, reapplying the screenshot sentences and the third scenario; verify `openspec validate "keep-walk-pictures" --strict --no-interactive` passes.

## 3. The walk script

- [x] 3.1 Rework `publish` in `.agents/skills/verify/scripts/verify-staging.sh` into the design's three outcomes, leaving the `WALK_MEDIA_BUCKET` path as it is and adding the `MEDIA=` and `REASON=` lines; verify the script's header comment and usage line describe them.
- [x] 3.2 Add the `pictures <pr>` subcommand as the design's "A past walk's pictures" says; verify it downloads only links on the recorded production origin and that `cleanup` removes its run folder.
- [x] 3.3 Extend `scripts/tests/verify-scripts.test.mjs` with a local HTTP server standing in for production and a fake `gh`; verify it covers: private upload prints one URL line per PNG, sends both Access headers, and never prints the secret; each `REASON=` row of the design's table; `WALK_MEDIA_BUCKET` set still takes the public path with a fake `wrangler`; two `publish` runs on one commit use different run folders; `pictures` skips a link on another host and reports `NONE` for a comment with no picture.

## 4. The skill's instructions

- [x] 4.1 Edit `.agents/skills/verify/references/walkthrough.md` section f only where this change owns it: the comment template's two picture lines, the "Publish the screenshots" block, and its result bullets, now keyed on `MEDIA`; verify section d and the comment's summary line are byte-identical to `main`.
- [x] 4.2 Add one sentence to the plain-checks paragraph of `.agents/skills/verify/SKILL.md` for a past walk's pictures, with an offsetting cut; verify `node scripts/measure-context.mjs --check` passes.

## 5. Docs and release

- [x] 5.1 Rewrite the bucket bullet under "What a walk needs" in `wiki/development/staging-walkthrough.md` (kept privately by default, who can open them, when they are not kept, the public bucket as the inline option) and add one "why" bullet for links over inline pictures; add the one-clause exception to `wiki/development/memory-key.md` and `wiki/stack/mini-apps.md`; add pictures to "Without R2" in `wiki/development/memory.md`; verify each fact sits on one page and the others link to it.
- [x] 5.2 Update the walkthrough block in `.env.example` (no variable is needed for private pictures; `WALK_MEDIA_*` stay, for inline public ones), the app-scaffold paragraph in `.agents/skills/wong-sync/references/payload-manifest.md` (`index.ts` also sends `/_walk/` to the verify skill's route module), and the card list's cost line in `.agents/skills/wong-setup/references/cloudflare.md`; verify no variable was renamed.
- [x] 5.3 Add the `## Next (minor) — Keep the pictures from a preview check` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: the update adds two lines to the app's entry file, pictures are kept after the next publish, and a public picture folder keeps working; verify `VERSION` is untouched.
- [x] 5.4 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs`; verify all three pass.
- [x] 5.5 Widen the script lint's path from `.agents/skills/memory/worker` to `.agents/skills/*/worker` wherever `main` then keeps the check list (today `.github/workflows/payload.yml`; PR #238 moves it to `.github/scripts/checks.mjs`), so the picture route is linted; verify the lint step names the new folder and passes.

## 6. Gate and live check

- [x] 6.1 Run `/save` for the CI gate; verify the script tests, the app's `npm test` chain, and the payload checks pass on the pushed commit.
- [x] 6.2 Run `/save` then `/verify` on this change's preview; verify the comment says the pictures were not kept because the live site does not serve them yet, names no local path, and the verdict stands on its own.
- [ ] 6.3 After the merge is live, run `/verify` once on any open pull request with a browser journey; verify its comment links each picture, a link opens after the app's login and answers `401` without one, and asking in chat for that pull request's pictures shows them. Record the result in the Decision log, or leave an open thread naming who checks it.
