# Tasks

## 1. Script

- [x] 1.1 Add `.agents/skills/verify/scripts/verify-journeys.mjs check`: read `.agents/verification/journeys/**`, validate `verify-journey-1` and its closed `expect` set, and classify each file `ok`, `stale`, or `unreadable` against `openspec/specs/` by scenario name and `thenDigest`. Add `scripts/tests/verify-journeys.test.mjs` cases for each class on a throwaway spec tree. Done when the cases are written.
- [x] 1.2 Add `replay` by design §§ 2-4 and 6: write selected checks into the runner's file shapes, call `verify-runner.sh`, read results into `same`, `changed`, `skipped`, `not-run`, print the `REPLAY=` summary and `replay.json`. Cover the order (changed `sourcePaths` first, then rotation by head hash), the 120 s and 30 s limits, a rebuild before each writing check, the `SEEDED` and `PLAYGROUND` conditions, the login-wall stop, and `--change-root` skips. Tests start the practice site: request checks for real, browser checks through the fake `agent-browser`, a fake rebuild command, and a shortened budget. Done when the cases are written.
- [x] 1.3 Add planted-mistake cases on the practice site: a check holding the promised text for a broken promise returns `changed`, and one for a working promise returns `same`, for one browser and one request promise each. Add one real-browser case that skips where no browser is installed. Done when the cases are written.
- [x] 1.4 Add `keep` and `keep --install` by design §§ 2 and 5: build a candidate from a walked journey, replace the preview host with `{url}`, drop screenshots, refuse a saved-login command, a credential, a snapshot reference, or no expectation, and remove files for scenarios that no longer exist. Tests cover each refusal, the host swap, and that a candidate is installed only after `replay --from` returned `same`. Done when the cases are written.

## 2. Skills

- [x] 2.1 Add the kept-check passage to `.agents/skills/verify/references/walkthrough.md`: inside `/ship`, replay after the change's own journeys settle, read the four results by design § 6, keep by § 5, and the added in-scope clause in § e: a broken kept check the branch caused is repaired without asking, within the existing two attempts. Update `.agents/skills/verify/SKILL.md`: the Order's walk step, the authorized save for kept checks, and the hard rule that journeys stay outside the repo. Done when the three skill files together add at most 1,500 bytes.
- [x] 2.2 Update `.agents/skills/ship/SKILL.md` Step 4: kept checks the walk wrote go through one `/save`, and that commit merges only on `SUCCESS` or `NONE`. Done when the step reads that way and its links resolve.

## 3. Docs

- [x] 3.1 Update `wiki/development/staging-walkthrough.md`: a *Kept checks* section (what is kept, where, when it replays, the two-minute limit, what each result means, what is never kept), the changed reasons under *Why a walk runs the way it does* and *What it is not*, and one paragraph beside *Why this engine* on the 2026-10-05 look at e2e and why only its replay idea was taken. Keep every linked heading's exact text. Done when the page stays under 3,000 words or the new section is split to its own page and linked from the hub.
- [x] 3.2 Update `wiki/development/the-change-loop.md` where `/ship`'s walk is described, in one sentence that links the new section. Done when the sentence is there and links the section's heading.

## 4. Release

- [x] 4.1 Add the `## Next (minor)` entry to `CHANGELOG.md` in plain words, with an **Updating.** note saying nothing needs doing and that the first kept checks appear at the next publish with a page or request promise. Done when the entry is the top entry.

## 5. Verification

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` before the first push, which covers `check-payload-links.mjs`, `check-openspec-config.mjs`, `measure-context.mjs --check`, and the script tests. Then `/save`, and confirm CI passes.
- [x] 5.2 After `/save`, replay for real against this branch's preview: take the staging turn with `preflight`, then run `replay --from` a temp folder holding one hand-written read-only check for a starter-app scenario and expect `same`; change its expected text and expect `changed`; then `cleanup`. Record both outputs and the replay's seconds in this folder as `replay-check.md`. No kept file is committed by this task.
- [x] 5.3 Record an open `verify` thread in memory for what only later publishes can show: the first real publish with a page promise keeps a check, the next one replays it inside two minutes, and how long a rebuild between writing checks takes. Done when the thread exists.
