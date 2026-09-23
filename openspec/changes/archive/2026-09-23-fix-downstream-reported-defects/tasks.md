## 1. Sync preflight

- [x] 1.1 Add the failing preflight fixtures to `scripts/tests/wong-sync-preflight.test.mjs` first: `CLAUDE.md` → `AGENTS.md` symlink, the reversed pair, a directory link, CLI `--max-changes 0` (`invalid-argument`) and `--max-changes 1` (`change-limit`), and `docsPath` mapping, UI probe, collision, and unsafe-path cases. Confirm that they fail against the current `preflight.mjs`.
- [x] 1.2 Resolve file symlinks in `treeAt` with one `git cat-file --batch` call, so a link takes its target blob and directory or dangling links are dropped (review.html#/preflight).
- [x] 1.3 Make `parseArgs` produce camel-case keys so that `--max-changes` reaches `preflight()`.
- [x] 1.4 Read and validate `components.docsPath`. Map `wiki/development/` and then `wiki/` through it in `targetPathFor`, probe the UI page at its mapped path in `selectedCategories`, and fail with `path-collision` when two logical paths share one target path.
- [x] 1.5 Add a test that runs the preflight with this repository as its source against a fixture target recorded at an earlier commit, and asserts that the status is not `error`.
- [x] 1.6 Document `components.docsPath`, the symlink rule, and the `path-collision` code in `.claude/skills/wong-sync/references/payload-manifest.md`.

## 2. Stack-pack and save scripts

- [x] 2.1 Add `scripts/tests/preview-url.test.mjs` with a stub `gh` on `PATH`: a bot comment with a `https://workers.dev` logo link before a real preview URL, and an apex-only case. Confirm that it fails against the current script.
- [x] 2.2 Add `PREVIEW_HOSTS` and the reject-only `drop_bare_apex` filter to methods 2 to 4 of `.claude/skills/save/scripts/preview-url.sh`, with `PREVIEW_RE` built from `PREVIEW_HOSTS`.
- [x] 2.3 Add `scripts/tests/cf-secrets.test.mjs`: a correctly twinned consumer passes, a consumer missing from staging fails and names both counts, and a consumer that is not repointed warns. Confirm the first case fails against the current script.
- [x] 2.4 In `scripts/cf-secrets.mjs`, drop consumers from `bindingsIn` and add `checkQueueConsumers` to `checkBindings`.

## 3. Wiki

- [x] 3.1 Make the section-link example in `wiki/wiki-style.md` point at the real `contributing.md` heading anchor, with the example heading and its anchor in agreement.

## 4. Release

- [x] 4.1 Bump `VERSION` to 16.7.0 and add a newest-first `CHANGELOG.md` entry. Name each fix, the new `docsPath` field, and the local patch that each downstream repo can retire on its next `/wong-sync`: ClaymooApp's two `preflight.mjs` edits and `components.ui` workaround; WongOS's `preview-url.sh` and `cf-secrets.mjs` edits.
- [x] 4.2 Run `node --test scripts/tests/*.test.mjs`, `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/measure-context.mjs --check`.
- [x] 4.3 Run the fixed preflight against `~/WongOS` and `~/ClaymooApp` read-only, and record the status and diagnostic counts in the Decision log.
- [x] 4.4 Validate with `openspec validate fix-downstream-reported-defects --strict --no-interactive` and complete the CI gate through `/save`.
