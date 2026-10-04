# Tasks

Implementation completion means source, tests, and docs are written and reviewed, not that tests have passed. Tests are authored in the group that changes their behavior and executed only in the final phase. No group saves or waits on checks.

## 1. Save: one checkpoint command

- [x] 1.1 Add `.agents/skills/save/scripts/checkpoint.mjs` by design D1: staged-index refusals, credential scan from `--scan-keys`, commit, PR state handling (OPEN, none, MERGED, CLOSED), body render and update, check wait, failing-check log tails, saved-revision receipt, preview lookup, attempt counting, `key=value` and `NEXT:` output ending in `SAVE_GATE_RESULT=`. Completion: the script calls the existing save scripts and adds no second copy of their logic.
- [x] 1.2 Author `scripts/tests/checkpoint.test.mjs` with fake `git` and `gh` in the existing script-test style. Completion: cases cover each PR state, each of the five gate results, two failing checks listed with causes, a credential match that stops before commit, nothing staged, and the fourth attempt refused; not run yet.
- [x] 1.3 Rewrite `.agents/skills/save/SKILL.md` steps 3 and 4 and `.agents/skills/save/references/git-gate.md` around the one command, keeping the results table, the refusals, and every heading other pages link. Completion: the two files hold no step the script performs, and `node scripts/check-payload-links.mjs` finds each linked heading.

## 2. Ship: prepare and finish commands

- [x] 2.1 Add `.agents/skills/ship/scripts/ship.mjs` with `prepare` and `finish` by design D2, with exit codes for unchecked tasks, a failing default branch, an unmergeable sync, and `merge.sh`'s own codes passed through. Completion: `prepare` leaves one archive folder, a numbered release when an entry exists, and a rebuilt review page; `finish` prints `merge.sh`'s lines unchanged.
- [x] 2.2 Author `scripts/tests/ship-commands.test.mjs`. Completion: cases cover a clean prepare, unchecked tasks, default-branch checks failing and unreadable, `behind=yes` with a clean merge, a `CHANGELOG.md`-only conflict, another file's conflict, `stale_version`, and a failed live look; not run yet.
- [x] 2.3 Rewrite `.agents/skills/ship/SKILL.md` steps 1, 2, 3, and 5 around the two commands, keeping the pull-in, the several-changes stop, the walk-failed ask, and the report. Completion: the page names two commands plus `/save` and `/verify`, and every linked heading keeps its text.

## 3. Local checks before the first push

- [x] 3.1 Add `--worktree` to `.github/scripts/checks.mjs` by design D3: worktree scope, install only when missing or stale, the lock, exit 7 for no tools, and the optional `scripts/payload-checks.mjs` hook. Extend its existing test file. Completion: cases cover pass, a failing suite, no `npm`, a failed install, a held lock that times out, and a docs-only change that skips the suite; not run yet.
- [x] 3.2 Add meta-only `scripts/payload-checks.mjs` listing `payload.yml`'s static steps and running those the changed paths call for, with `scripts/tests/payload-checks.test.mjs` asserting every listed command appears in the workflow. Completion: removing a command from the workflow fixture fails the test; the script is absent from `payload-files.json`.
- [x] 3.3 Update `.agents/skills/apply/references/build-helper.md` and `.agents/skills/apply/SKILL.md` so the helper runs the local checks once after the whole implementation, repairs up to three rounds, and reports `local checks: pass | fail | not run`; update `git-gate.md`'s auto-fix loop to rerun the failed check locally before a further push. Completion: the brief still forbids git, `/save`, `/ship`, `/verify`, and preview uploads, and no test runs before implementation is complete.

## 4. Quiet waiting

- [x] 4.1 Update *Build in a helper* in `.agents/skills/apply/SKILL.md` by design D4: longest wait the host allows, repeat on timeout, one short line per wait at most, no reading the helper's files, messages only for the person's answer or a stop. Completion: the section states each of the five rules once and names both hosts' wait.

## 5. Timing report (source repo only)

- [x] 5.1 Add `scripts/measure-sessions.mjs` by design D6, with small scrubbed Codex and Claude Code fixtures under `scripts/tests/fixtures/measure-sessions/` and `scripts/tests/measure-sessions.test.mjs`. Completion: the fixtures yield known step counts, seconds per step, repeated-read share, parent-steps-during-helper, and failed-check counts per model and thinking level; output carries no message text; not run yet.

## 6. Owning docs, inventory, and release

- [x] 6.1 Reword the gate where it is stated: `wiki/development/the-change-loop.md#the-gate` (owner: local checks are a pre-check, never the gate), the one summary line in `AGENTS.md`, `wiki/agent-knowledge-center.md`, `.agents/rules/code.md`, the `openspec/config.yaml` context line, `save/SKILL.md`'s *No local builds*, and the header comment of `wait-for-checks.sh`. Completion: no page says nothing runs locally without the pre-check, the start-up load stays under its ceiling, and `/explore` and `/verify` keep their own no-local-execution rules.
- [x] 6.2 Add the new skill scripts to `.agents/skills/wong-sync/references/payload-files.json` and the payload manifest, map them in `.agents/skills/memory/references/areas.json`, and add `## Next (minor) — Fewer steps, faster tasks` to `CHANGELOG.md` with a plain Updating note (nothing to do; checks run on a computer only where its tools are installed). Completion: `VERSION` is unchanged and the meta-only scripts are not listed.
- [x] 6.3 Trim until `save/SKILL.md`, `save/references/git-gate.md`, and `ship/SKILL.md` total at most 15,000 bytes, append to the Decision log where each removed rule went, then record the lower total with `node scripts/measure-context.mjs --write-baseline`. Completion: the Decision log maps every removed rule to a script behavior or an owner page.
- [x] 6.4 Review the whole implementation against both spec deltas and refresh the review page. Completion: each scenario names the script case or page line that carries it.

## 7. This computer's trial (outside the repo)

- [x] 7.1 Confirm Paseo offers a `medium` thinking option for each provider, copy `~/.paseo/config.json` to a dated backup, set `thinkingOptionId` to `medium` on the two *Apply / Ship* presets, and run `paseo reload`. Completion: the two presets show medium in Paseo, the two *Explore / Plan* presets and every other setting are unchanged, and a preset whose provider lacks the option is left as it was and named.
- [x] 7.2 Record a memory thread with the trial's start date and the comparison to run after a week (`measure-sessions.mjs --since <start>` against the two weeks before). Completion: `memory.mjs search --type thread` shows it.

## Final verification after implementation

Run once, after every group above is complete: the new local checks on this change itself (`checks.mjs --worktree`), then `check-payload-links.mjs`, `check-openspec-config.mjs`, `check-retired-names.mjs`, and `measure-context.mjs --check`. Repair real failures and rerun what failed. Then ordinary `/save` through the new checkpoint command for the required remote gate, and `/verify` against that saved revision; expect no scenario reachable on the preview, since nothing here changes the app. This change's own `/ship` is the first real run of the new commands: afterwards run `measure-sessions.mjs` on that session and record its step count beside the 41-step median. Name honestly what only fixtures covered: quiet waiting and repeated page reads are observed on later real sessions, not proven here.
