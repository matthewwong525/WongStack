## 1. Memory capture

- [x] 1.1 `memory/scripts/run.mjs`: add and export `withInputDir(fn)`, which makes a folder with `realpathSync(mkdtempSync(join(tmpdir(), 'wong-memory-')))`, runs `fn(dir)`, and removes the folder in `finally`. Wrap the agent run in `main()` with it (review.html#/capture/after).
- [x] 1.2 `run.mjs` `agentCommand(agent, prompt, stateDir, inputDir)`: for Claude, grant `Bash(<SCRIPT>:*)` and `Edit(/<inputDir>/**)`, and add `--add-dir <inputDir>`. For Codex, add `inputDir` to `writable_roots` (review.html#/capture/after).
- [x] 1.3 `run.mjs` `runbook(exclude, inputDir)`: replace the stdin line. Tell the model to write each JSON input as a new file in `inputDir` with its file-writing tool, pass `--file <inputDir>/<name>.json`, write nowhere else, and never use a heredoc, pipe, or redirect (review.html#/capture/after).
- [x] 1.4 `memory/SKILL.md` `## Background run`: the intro and steps 1–2 pass `--file <path>` from the input folder, not `--file -`. Leave `## Write` unchanged.
- [x] 1.5 `memory/scripts/memory.mjs`: change the `spool` hint to `put-facts --file <json> --spooled <file>`.
- [x] 1.6 `scripts/tests/memory-capture.test.mjs`: rewrite the runbook test for the new grant (`Bash` + `Edit` rule, `--add-dir`), no `<<` in the prompt, every `gate`/`put-facts --file` under the input folder, and every file-write sentence naming the folder. Add a test that `withInputDir` removes the folder after `fn` throws. Cover Codex `writable_roots`.
- [x] 1.7 Probe one real capture under `dontAsk`: run `run.mjs`'s `agentCommand` output with `claude -p` on a spooled fact whose body holds `<name>`, `>`, `|`, and `$`. Confirm the fact lands, the run records `ok`, and the input folder is gone. Record the result in the Decision log.

## 2. Ship

- [x] 2.1 `ship/SKILL.md` Step 5: after the retarget loop, check `git ls-remote --exit-code --heads origin "$BRANCH"`. Delete on 0, report "deleted at merge" on 2, and stop on any other code. Add the delete outcome to the Step 7 report.

## 3. Source-repo config

- [x] 3.1 `.github/dependabot.yml`: under the `/app` npm entry, ignore `version-update:semver-major` for `@types/node`, with a one-line comment that the types follow `.nvmrc`.

## 4. Release

- [x] 4.1 Bump `VERSION` to 19.0.2 and add a newest-first `CHANGELOG.md` entry: capture writes to a temp folder, `/ship` tolerates auto-delete, Dependabot rule (source repo only).
- [x] 4.2 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`.
- [x] 4.3 Pass CI through `/save`. Supersede memory threads #151, #155, and #156 in that save.
