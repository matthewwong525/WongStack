# Fewer steps, faster tasks

**Status:** in-progress
**Branch:** codex-session-speed
**Open questions:** none

## Why

A task that should take minutes takes hours. Two weeks of session logs show that running commands is under a tenth of the time; the rest is the assistant thinking between thousands of small steps: about 40 to publish a change, 50 to 300 to build one, each costing 10 to 30 seconds.

## What Changes

- **Saving and publishing take a few commands, not forty.** Saving does the commit, the upload, the change on GitHub, and the wait for checks in one go. Publishing does the same for its steps before and after. A failed check comes back with its cause and what to do next, so nothing is looked up twice.
  ```text
    BEFORE                AFTER
  publish               publish
   ├ ~35 commands        ├ +prepare
   │  one at a time      ├ +save and wait
   └ ask every 30s       └ +finish
  about 40 steps        under 10 steps
  ```
- **Mistakes are caught on this computer before the first upload.** When the tools are installed here, a finished build runs the same checks GitHub runs for that kind of file, and fixes what fails. GitHub's checks still decide whether a change can be published. A computer without the tools skips this and says so in one line.
- **The main assistant waits quietly while its helper builds.** No checking every 30 seconds, no re-reading the helper's work, no stream of messages to it. You get one short line now and then, and the report at the end.
- **Shorter instructions, read once.** The save and publish pages shrink by about a quarter, because the commands now carry the steps. Each command says what to do next, so the page is not opened again mid-task.
- **Medium thinking on this computer, as a trial.** Your two *Apply / Ship* presets move from high to medium here. New installs keep high until the numbers say otherwise.
- **A timing report.** One command reads the session logs and shows steps per task, seconds per step, repeated page reads, and failed-check rounds, by model and thinking level. After a week of real builds it shows whether the trial and these fixes worked.

**Non-goals:** Drop or loosen any check; make the checks on this computer a condition for publishing; force a new chat between stages; change the presets new installs get; change how a Cloudflare-hosted project saves.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `delivery-gate`: A finished build is checked locally where the tools exist, never as a condition of the gate; a checkpoint and `/ship`'s preparation and finish each run as one command whose output names the result, each failing check's cause, and the next action.
- `apply`: The build helper runs the local checks after the whole implementation is authored; the parent waits quietly while it builds.

## Impact

`/save`, `/ship`, and `/apply` skill pages and the git-gate and build-helper references; new `checkpoint.mjs` and `ship.mjs` skill scripts wrapping the existing ones; a `--worktree` mode on `.github/scripts/checks.mjs`; meta-only `scripts/payload-checks.mjs` and `scripts/measure-sessions.mjs` with script tests; the gate wording in the change-loop page, `AGENTS.md`, and the pages that repeat *nothing builds locally*; payload inventory, a lower instruction-size baseline, and a minor release entry. Outside the repo: this machine's Paseo presets. CI workflows, required checks, caps, and the hosted save route are unchanged.

## Decision log

- **2026-10-04** — Asked which of the five fixes from the session-log review to plan → chose all of them.
- **2026-10-04** — Asked whether to plan them as one change or split them → chose one change.
- **2026-10-04** — Asked how to handle thinking level, since every measured session ran at high → chose to try medium on this computer first and compare after a week.
- **2026-10-04** — Assumed: a local check never blocks a save or a publish, because GitHub's checks stay the one gate and a computer without the tools must still work.
- **2026-10-04** — Assumed: the local checks run once, after the whole build, because 30.10.0 moved all checking to the end and repeating them per part was the cost it removed.
- **2026-10-04** — Assumed: no forced new chat between stages, because the build already runs in a fresh helper and the other fixes keep the main chat small; the existing offer of a new workspace after a publish stays.
- **2026-10-04** — Assumed: the wait for checks asks again at the longest interval the host allows instead of promising one single call, because Codex returned from every one of 32,169 measured commands within about 30 seconds.
- **2026-10-04** — Assumed: local checks take turns across chats on one computer, because this server has 8 GB and several chats build at once.
- **2026-10-04** — Assumed: the toolkit's own checks get one list in a script, with a test that it matches the GitHub workflow, because rewiring the workflow would risk the gate for no speed gain.
- **2026-10-04** — Assumed: the timing report stays in this source repo and is not sent to installs, because it reads one computer's private chat logs.
- **2026-10-04** — Assumed: the trial changes only the thinking level, not the model, on this computer's presets, because changing both would hide which one made the difference.
- **2026-10-04** — Assumed: a Cloudflare-hosted project's save route is left as it is, because another workspace is reworking it.
- **2026-10-04** — Check: `.github/scripts/checks.mjs` gains a `--worktree` mode for the check on this computer before a push; what GitHub runs (`--repo`, `--base`, `--head`) is unchanged.
- **2026-10-04** — Assumed: checks take turns through a file holding the running command's process number, not `flock`, because a Mac has no `flock` command and installs run there; a file left by a run that died is taken over.
- **2026-10-04** — Assumed: the save command counts a fix attempt whenever the branch's last result was a failed check, and starts again after a pass or with `--new-run`, because it can not see where one `/save` ends.
- **2026-10-04** — Assumed: the save command also rebuilds and stages the plan's review page, because that step is mechanical and each save had spent a step on it.
- **2026-10-04** — Assumed: a changelog conflict is settled by putting this branch's one entry above the default branch's file, not by joining git's conflict blocks, because joined blocks can interleave two entries; a `VERSION` conflict takes the default branch's value, since numbering starts from it.
- **2026-10-04** — Assumed: `prepare` reads the default branch's checks before it sends an empty branch to the pull-in, because a failing default branch must stop a new request before anything is built.
- **2026-10-04** — Assumed: on a Cloudflare-hosted project the save and finish commands stop and point to the hosted runbook, and `prepare` skips the GitHub read, because that route stays as it is.
- **2026-10-04** — Trimmed from `save/SKILL.md` into `checkpoint.mjs`: the credential scan before every commit (`--scan-keys`, exit 5, the message and summary scanned too), the commit from a message file, pushing commits made earlier, *nothing to push* (exit 4), a non-CI failure stopping with its exact error (exit 1), the review-page rebuild and its *stale* report, the plain body of a save with no change, and the preview lookup through `preview-url.sh`.
- **2026-10-04** — Trimmed from `save/SKILL.md` to an owner page: *no local builds* is now the gate's pre-check rule in `wiki/development/the-change-loop.md#the-gate`; printing the plan's link and writing in plain words are `AGENTS.md` rules owned by `explore/references/asking-the-user.md`; *save may finish unverified* and *UNKNOWN never means no checks* stay in `git-gate.md`'s results section; setting `ready-to-ship` on an archived handoff is `ship.mjs prepare`'s.
- **2026-10-04** — Trimmed from `git-gate.md` into `checkpoint.mjs`: reading the pull request's state (the table is now prose, same four outcomes), the render command and its arguments, creating the pull request, the REST body update, removing the temporary files, the check wait and its result line, the failed-log lookup (now each failing check's log tail and `RERUN` line), and writing the receipt.
- **2026-10-04** — Trimmed from `git-gate.md` to an owner: when `/verify` may reuse a receipt is `saved-revision.mjs`'s own check, and the hosted checks it needs are `wiki/stack/hosted-projects.md#delivery-runbook`'s; the summary's credential rule is `save/SKILL.md`'s first section.
- **2026-10-04** — Trimmed from `ship/SKILL.md` into `ship.mjs prepare`: the four preflight commands, the pull-in test (exit 3), the default-branch check (exit 6), the last two selection rungs, the tasks read (exit 4), `openspec status`, `validate`, and `archive`, the one-archive check, the numbering command and its three answers, and the merge of the default branch with the changelog rule (exit 5).
- **2026-10-04** — Trimmed from `ship/SKILL.md` into `ship.mjs finish`: the merge command and its exit codes, the recovery for a taken number or a merge conflict (`prepare --sync`, named by `NEXT:`), the secrets promotion (its rules stay in `wiki/development/secrets.md`), and the live-look command.
- **2026-10-04** — Trimmed from `ship/SKILL.md` to an owner page: *with no checks, invoking `/ship` is the approval* stays in `git-gate.md`'s results table; why a loosened check is listed stays in `wiki/development/the-change-loop.md#a-loosened-check-needs-a-reason`.
- **2026-10-04** — Built: the save, gate, and publish pages now total 14,951 bytes, from 20,208, and the instruction-size baseline is recorded at the lower total. Tests are written and not yet run; the first run is the final check.
- **2026-10-04** — First real local run, on this change: every new test passed; it also showed three rough edges, fixed in the same build. The toolkit checks printed all 1,386 test results, so a red run now prints only its failed tests by name and file; the hosted-starter check refuses to run outside GitHub, so it is skipped here with a line; and the helper brief now says to repair what the change broke, because 7 tests in `server-install.test.mjs` and `server-project.test.mjs` fail on this server alone (it runs as root with no git email) in code this change never touched. Those 7 are reported, not edited.
