# Tasks

## 1. The pickup script

- [x] 1.1 Write `.agents/skills/continue/scripts/pickup.mjs` by [design](design.md#one-script-switches-and-refuses-to-switch-past-unseen-work): `pickup.mjs <branch> [--reviewed <commit>] [--dry-run]`, an exported `reviewBranch({ cwd, branch })` returning `{ tip, commits, files }` (unknown = `git rev-list <tip> --not --branches origin/<default>`, files from `git log --cc --name-only`, labelled `code` or `words`, code first), and exits 0 switched, 2 bad input / dirty tree / not on origin / not a fast-forward, 3 needs review (JSON), 4 checked out elsewhere. It imports only the trusted copy's own modules and runs nothing from the branch; verify by reading that it never spawns `node` or `npm`.
- [x] 1.2 Write `scripts/tests/pickup.test.mjs` with a bare `origin`, an owner clone and a teammate clone. Cover: an owner-made branch switches with no review; a teammate branch needs review and lists its files; a teammate commit carrying the owner's email still needs review; `--reviewed` at the tip switches to exactly that commit; a teammate push after the review exits 3 with only the new commit; a merge of `main` lists only the merger's files; a dirty tree exits 2; a branch held by another worktree exits 4; `--dry-run` switches nothing.
- [x] 1.3 Add the finding's regression test to `pickup.test.mjs`. In a fixture repo holding a copy of `.agents` with the `.claude` and `.codex` links, the teammate branch appends a marker writer to `.agents/skills/memory/scripts/lib/cli.mjs` and nothing else. Run `pickup.mjs` (exit 3, `HEAD` unchanged, `lib/cli.mjs` listed as `code`). Then run every `command` string from the fixture's `.agents/settings.json` and `.agents/hooks.json` verbatim, with `CLAUDE_PROJECT_DIR` set, `WONG_MEMORY_RUN=1`, `HOME` in a scratch dir and a JSON hook event on stdin, and assert no marker exists. As the negative control, the same hooks after a plain `git checkout` of the branch do write the marker.

## 2. The new-workspace route

- [x] 2.1 In `.agents/skills/schedule/scripts/workspace.mjs`, add `--reviewed <commit>` to `open --checkout`. Run `reviewBranch` on the primary. With unknown commits and no matching `--reviewed`, exit 2 with the review JSON. Otherwise create or fast-forward the primary's local branch to the reviewed commit before `paseo run`, then compare the new worktree's `HEAD` to it and fail on a mismatch. Update `USAGE` and the app-steps fallback.
- [x] 2.2 Extend `scripts/tests/workspace.test.mjs`: `--checkout` on a teammate branch without `--reviewed`, or with a stale one, opens nothing and returns the review; a reviewed open pins the local branch before the stub Paseo runs; a stub Paseo that lands on another commit is reported as an error; an owner branch opens as today.

## 3. Skill text

- [x] 3.1 Rewrite `/continue` step 3 in `.agents/skills/continue/SKILL.md` to switch only through `pickup.mjs` (no `git checkout "$BRANCH"` or `gh pr checkout`), with the exit-3 ask from [design](design.md#one-script-switches-and-refuses-to-switch-past-unseen-work). Run the `--dry-run` review before the busy-workspace ask. Add to step 4 that a reviewed switch recaps and asks before building, explicit instruction or not. Trim other step 3 lines to offset the words.
- [x] 3.2 Update `.agents/skills/plan/references/new-workspace.md` [pick up saved work](../../../.agents/skills/plan/references/new-workspace.md#pick-up-saved-work) to pass `--reviewed <commit>` after the person's yes, and to say a workspace on reviewed work starts at that commit.
- [x] 3.3 Add a text test (in `pickup.test.mjs`, or beside the existing skill-text tests) asserting that `continue/SKILL.md` names `pickup.mjs` and contains no raw `git checkout "$BRANCH"` or `gh pr checkout`.

## 4. Docs and release

- [x] 4.1 In `wiki/development/the-change-loop.md`, say in the `/continue` line that picking up work new to this computer shows it and asks first. In `wiki/stack/employee-project.md` [who publishes](../../../wiki/stack/employee-project.md#who-publishes), add one line: the owner or Admin sees a teammate's changed files before the change runs on their computer.
- [x] 4.2 Add `scripts/tests/pickup.test.mjs` to the `continue` area's paths in `.agents/skills/memory/references/areas.json`.
- [x] 4.3 Add a `## Next (minor) — Picking up a teammate's change asks first` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: no hand step; the first pickup of each teammate's change will now ask.

## 5. Final verification

- [x] 5.1 Run `node --test scripts/tests/pickup.test.mjs scripts/tests/workspace.test.mjs` and confirm the regression test leaves no marker after the pickup and writes one after the plain checkout.
- [x] 5.2 Run `node scripts/measure-context.mjs --check`, `node scripts/check-payload-links.mjs`, and `openspec validate review-teammate-work-before-pickup --strict --no-interactive`.
- [x] 5.3 Run `node .github/scripts/checks.mjs --worktree` as the pre-check, then `/save`; CI is the gate.
