# Tasks

## 1. Memory route (member guard)

- [x] 1.1 In `.agents/skills/memory/worker/statements.mjs`, make `memberRefusal` a batch check: each write shape keeps its author check; `factTag` and `supersede` need an earlier `fact` insert in the same batch; reads must start with `SELECT`/`WITH` and have no write keyword or `;` in their unstripped text. Remove `bare()`.
- [x] 1.2 In `.agents/skills/memory/worker/memory-worker.mjs` `query()`, pass the whole batch to the new check. Before the batch runs, look up the author of each member `session` upsert's existing row, and refuse (403, `member_write`) when it isn't the key's email.
- [x] 1.3 In `memory-worker.mjs` `route()`, catch a `decodeURIComponent` failure and answer `fail(400, 'bad_path', …)`.
- [x] 1.4 Extend `scripts/tests/memory-worker.test.mjs` with one test per new spec scenario: a lone supersede, a lone fact tag, another author's session upsert, a `NULL`-author session upsert, and the `[']`-hidden `DELETE`. Add a malformed `%` path, and a test that runs every read `memory.mjs` builds through the check. Keep the existing member-supersede scenario passing.
- [x] 1.5 Reword the member line in `wiki/development/memory.md` (around line 47): a member supersedes only by writing their own replacing fact, so the replacement is always visible and credited.

## 2. Memory scripts

- [x] 2.1 Fix `parseEnv` in `.agents/skills/memory/scripts/lib/store.mjs`: trim, accept a quoted value followed by a `# comment`, and strip comments only from unquoted values. Add the design's cases to `scripts/tests/memory-store.test.mjs`.
- [x] 2.2 Make `writeEnvKey` in `lib/members.mjs` remove every `CLOUDFLARE_MEMORY_TOKEN=` line and write one where the first was. Add a test where a duplicate line is written and then read back.
- [x] 2.3 In `memory.mjs` `search`, when `--state` is set, drop the SQL `LIMIT`, filter, then slice to `--limit`. Add a test where the newest threads belong to changes and an older conversation thread is still found.
- [x] 2.4 Reword `run.mjs`'s runbook line so `finish-run --counts '{…}'` is the stated exception to "Never put JSON in a command".
- [x] 2.5 Give `run.mjs` and `session-start.mjs` a `--help` usage path (exit 0) and exit 2 on an unknown flag, with `strict` argument parsing. List both in `scripts/tests/cli-conventions.test.mjs`.

## 3. Delivery scripts

- [x] 3.1 In `.agents/skills/save/scripts/wait-for-checks.sh`, report `SUCCESS` only after two identical settled polls. Keep polling while every check is `skipping` and the grace period is still open. Update the header comment. Add the three design cases to `scripts/tests/wait-for-checks.test.mjs`.
- [x] 3.2 In `.agents/skills/ship/scripts/merge.sh`, capture `gh pr list` and keep the branch with exit 2 when it fails. After a failed `push --delete`, run `ls-remote --exit-code` again and report `deleted-at-merge` on exit 2. Add both cases to `scripts/tests/ship-merge.test.mjs`.
- [x] 3.3 In `.agents/skills/save/scripts/preview-url.sh`, make method 4 read comments newest first and keep only bodies naming the full or 7-character head SHA. Update the header's method list, and cover both new scenarios in `scripts/tests/preview-url.test.mjs`.
- [x] 3.4 In `.agents/skills/verify/scripts/verify-runner.sh`, add `--max-time "${VERIFY_REQUEST_TIMEOUT:-30}"`, and use `-I` for `HEAD`. Add a hanging-server case to `scripts/tests/verify-scripts.test.mjs`.
- [x] 3.5 Make `.agents/skills/improve/scripts/survey.mjs` `excluded()` skip `CHANGELOG.md`. Add a case to `scripts/tests/improve-survey.test.mjs`.

## 4. CI, pack, and server

- [x] 4.1 Change `on: push:` to `push: branches: ['**']` in `.github/workflows/test.yml`, `deploy.yml`, and `payload.yml`. Update the header comments that describe the triggers.
- [x] 4.2 Add `!cancelled() &&` to the `if:` of `test.yml`'s "Test the changed mini apps" step.
- [x] 4.3 Extend `wong_preview_alias` in `scripts/lib-wrangler-config.sh` with an optional Worker name: cap the alias at `62 - len(worker)`, and prefix `b-` when it doesn't start with a letter. In `scripts/cf-deploy.sh`, compute `ALIAS` after `STAGING_NAME` and pass it; do the same in `scripts/cf-preview.sh`. Cover a long branch and a digit-first branch in `scripts/tests/wrangler-config.test.mjs`.
- [x] 4.4 Point `app/package.json`'s `deploy` script at `scripts/cf-deploy.sh`, after checking it works from `app/`'s working directory; if it doesn't, `cd ..` first. Grep that nothing else relies on the old script.
- [x] 4.5 Pin `@fission-ai/openspec@1.13.2` in `server/setup.sh`. Add an assertion to `scripts/tests/server-setup.test.mjs` that it matches the version `payload.yml` installs.

## 5. Release

- [x] 5.1 Bump `VERSION` to 25.8.1 and add a `CHANGELOG.md` entry with an **Updating** note: the Worker fix takes effect on the next production deploy, and member checkouts need no update.
- [x] 5.2 Run the script suite, `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, `node .github/scripts/loosened-checks.mjs` on the working tree, and `openspec validate fix-found-bugs --strict --no-interactive`. Record the counts in the Decision log.
