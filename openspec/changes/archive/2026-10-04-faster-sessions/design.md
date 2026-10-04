# Design

## Context

See proposal.md for the motivation. The measurements behind it, from 527 Codex session logs dated 2026-09-20 to 2026-10-04 (122 hours in WongStack):

| Finding | Number |
|---|---|
| Model steps, all repos | 39,619; median 11 s, mean 21 s each |
| Time running commands | under 10% of turn time |
| `/ship` turn | median 41 steps; one 10-minute ship ran about 35 single commands |
| Commands that read skill or wiki pages | 21%; 66% of those reads are repeats in the same chat |
| `save/SKILL.md` reads | 212 across 62 root chats |
| Parent thinking time while a helper built | 36% (31 of 84 hours); 1,749 `send_message` calls |
| Failed-check investigations vs local test runs | 111 vs 110 |
| Longest single Codex `exec` return | about 30 s in 32,169 of 32,170 calls |
| Longest `wait_agent` | about 4 minutes |
| CI duration | Test 23 s, Payload checks about 3.5 minutes (median) |

Constraints that shape the approach:

- The build helper is told never to run tests ([build-helper.md](../../../.agents/skills/apply/references/build-helper.md)), and `delivery-gate` forbids local checks as a gate, so every mistake is found by a push.
- Skill instruction text has 1 byte of headroom against the `measure-context.mjs` baseline, so any added skill text needs a larger cut.
- A fresh Paseo worktree has no `node_modules`; `paseo.json` setup only seeds secrets.
- `.github/scripts/checks.mjs` already owns scope, install, test, and quality checks for CI and hosted runners, and `app-untouched.sh` and `loosened-checks.mjs` already take `--worktree`.

## Goals / Non-Goals

**Goals:**

- A `/ship` with a green gate takes under 10 model steps besides the check wait, and an ordinary `/save` under 8.
- A failed check costs one round, with its cause in the command's own output.
- The parent spends no steps on a build it delegated.
- `save/SKILL.md`, `save/references/git-gate.md`, and `ship/SKILL.md` together shrink from 20,208 bytes to at most 15,000.
- The effect is measurable from logs, by model and thinking level.

**Non-Goals:**

- Rewriting `wait-for-checks.sh`, `merge.sh`, `number-release.mjs`, `render-pr-body.mjs`, `saved-revision.mjs`, `preview-url.sh`, or `live-look.sh`; the new commands call them.
- Restructuring `payload.yml` or any workflow.
- Changing the hosted (Artifacts) route, `/verify`'s walkthrough, or `/close`.
- Enforcing agent obedience in code; quiet waiting is instruction text, observed by the timing report.

## Decisions

### D1. `checkpoint.mjs` runs a save's mechanical tail

`.agents/skills/save/scripts/checkpoint.mjs`, called once after the agent has staged files and written the commit message and PR summary to temporary files outside the repo:

```
node checkpoint.mjs --message-file <f> --summary-file <f> \
  [--change-root <path> --mode active|archive] [--scan-keys A,B] [--max-minutes 20]
```

In order: refuse an empty or unrelated-looking index (nothing staged, or a default-branch HEAD); credential scan of the staged tree for the live values of `--scan-keys`, read from the primary worktree's `.env`, printing matching paths only; commit; read the PR state and act by the existing table (OPEN push, none push `-u` and create, MERGED skip the wait, CLOSED stop with exit 3 so the skill asks); render and apply the PR body through `render-pr-body.mjs`; run `wait-for-checks.sh`; on `FAILURE` fetch each failing run's `--log-failed` tail and print it under the check's name; run `saved-revision.mjs` and `preview-url.sh`; delete the temporary files.

Output is `key=value` lines (`SAVE_HEAD`, `PR_URL`, `PREVIEW_URL`, `RECEIPT`, `ATTEMPT`) followed by one `NEXT:` line per outcome and a final `SAVE_GATE_RESULT=`. `NEXT:` carries what the page used to: on `FAILURE`, *fix the causes above in one push, rerun the failed checks locally, then rerun this command; attempt N of 3*; on a failure outside the diff, the rerun command.

The attempt count lives in the receipt directory keyed by branch and `/save` run, so the three-attempt cap is counted by the script, not remembered by the agent.

*Why not one script that also stages and writes the handoff:* which files belong, the Decision-log entry, and the session facts are judgment. Everything after staging is mechanical.

*Why a process, not a single blocking call:* Codex returns from a command after about 30 seconds whatever is asked. The skill says to ask again with the longest wait the host allows and to say nothing between asks; Claude Code blocks for the whole run.

### D2. `ship.mjs prepare` and `ship.mjs finish`

`.agents/skills/ship/scripts/ship.mjs`:

- `prepare [--change <name>]`: the preflight (branch, status, commits ahead, default-branch check runs), the tasks check (any `- [ ]` stops with exit 4 and the list), `openspec status` and `validate --strict`, `openspec archive --yes`, exactly-one-archive check, `git fetch origin main`, `number-release.mjs`, and on `behind=yes` a `git merge origin/main` that stops with exit 5 and the conflicted files when it can not merge cleanly. A `CHANGELOG.md`-only conflict is resolved by the existing rule (this branch's entry on top) and the script reruns numbering. It sets the archived proposal's Status to `ready-to-ship` and rebuilds the review page. Prints `ARCHIVE=`, `RELEASE=`, and `NEXT:`.
- `finish`: `merge.sh`, then `worktree-secrets.mjs promote`, then `live-look.sh` with the merge commit. Passes `merge.sh`'s exit code and `key=value` lines through, and prints `NEXT:` for `stale_version` and merge-conflict recovery.

`/ship` becomes: `prepare` → `/save` (D1) → `/verify` with the receipt → `finish`. The pull-in, the several-changes stop, and the walk-failed ask stay in the skill, since they are decisions.

*Alternative considered:* one `ship.mjs` for the whole chain. Rejected: `/save`'s handoff edits and `/verify`'s walk sit in the middle and need the agent.

### D3. Local checks: `checks.mjs --worktree`

`checks.mjs` gains `--worktree`: scope comes from `app-untouched.sh --worktree`; the suite directory is found as today; `npm ci` runs only when `node_modules` is missing or older than the lockfile; then `npm test`, `loosened-checks.mjs --worktree`, and the wiki check when wiki files changed. It holds a machine-wide lock (`flock` on a file under the OS temp directory) so suites take turns. Exit 0 pass, 1 fail, 7 *no tools* (no `node`, no `npm`, or install failed), printed as one line.

When `scripts/payload-checks.mjs` exists (this source repo only), `--worktree` runs it too. That script lists the static steps of `payload.yml` (lint, shellcheck when installed, script tests with coverage, private names, hosted starter, payload links, OpenSpec config, retired names, context budget) and runs those the changed paths call for, by the same scope rule the workflow uses. A script test reads `payload.yml` and fails when a listed command is absent from it, so the two can not drift silently.

Who runs it: the build helper, once, after all source and tests are authored (D4 of 30.10.0 stays). It repairs failures and reruns only the failed part, three rounds at most, then reports `local checks: pass | fail (<names>) | not run (<reason>)`. `/save`'s auto-fix loop reruns the failed check locally before each further push when the tools exist.

*Why the helper, not `/save`:* the helper holds the build's context and can repair in place; `/save` stays git-only.

*Why not a gate:* an install whose owner has no local tools must behave as today, and CI is the one result `/ship` reads.

### D4. The parent waits

`apply/SKILL.md`'s *Build in a helper* says: after starting the helper, wait for its report with the longest wait the host allows, repeat the wait when it times out, write at most one short line per wait, read none of the files it edits, and message it only with the person's answer or a stop. The brief's report already carries what the parent needs. No script: the hosts differ (Claude Code's Agent call blocks; Codex has `wait_agent`), and the rule is a sentence.

### D5. Shorter pages

The procedures D1 and D2 absorb leave `git-gate.md` (PR state table, render command, REST patch, auto-fix commands, receipt steps), `save/SKILL.md` steps 3 and 4, and `ship/SKILL.md` steps 1, 2, 3, and 5. Each keeps its results table, its refusals, and one command. After the trim, `measure-context.mjs --write-baseline` records the lower total so the saving holds. Linked headings that installed repos or other pages point at keep their exact text (`check-payload-links.mjs`).

### D6. Trial and timing report

`scripts/measure-sessions.mjs` (meta-only, not in `payload-files.json`) reads Codex rollouts under `~/.codex/sessions` and `~/.codex/archived_sessions`, and Claude Code transcripts under `~/.claude/projects`, for one repo and a date range. Per model and thinking level it prints: turns by verb, steps per turn, seconds per step, share of commands that read skill or wiki pages and the repeat share, parent steps taken while a helper turn was open, failed-check investigations, and local check runs. `--json` for comparison; `--since` and `--until` to compare before and after. Claude Code transcripts do not record thinking level, so Claude rows compare by date. It prints counts only, never message text.

The trial edits this machine's `~/.paseo/config.json`: `thinkingOptionId` `high` → `medium` on the two *Apply / Ship* presets, after a backup copy, then `paseo reload`. `paseo-presets.json` is untouched. A memory thread records the start date and the comparison to run after a week.

## Risks / Trade-offs

- [A script hides a step the agent used to reason about] → every refusal and stop in today's pages becomes an exit code with a plain message, and the script tests cover each PR state, each gate result, and the credential match.
- [Local `npm ci` in every new worktree costs time and disk] → it runs once per worktree and only when a build finishes there; the time is unmeasured and the timing report will show it.
- [Local checks pass, CI fails, on an environment difference] → CI stays the gate; the report always names the local run as local.
- [Several chats run suites at once on 8 GB] → the lock makes them take turns; a wait over 10 minutes gives up as *not run*.
- [Medium thinking builds worse code] → a one-machine trial; the local checks and CI still catch failures; the report compares failed-check rounds before and after.
- [Instruction text can not be tested for obedience] → the timing report measures parent steps during a build and repeated page reads on real sessions.
- [The trimmed pages drop a rule] → each removed line maps to script behavior or an existing owner page, listed in the Decision log at build time, as `context-economy` requires.

## Migration Plan

Ships as a minor release. Installs receive the new scripts and pages through `/wong-sync`; nothing to do by hand. A repo with no local tools behaves as before. Rollback is a revert of the release; no data or account changes.

## Open Questions

- How long `npm ci` takes in a fresh worktree here; the first real build answers it.
- Whether Paseo offers a `medium` thinking option for both providers; the trial task checks before editing and falls back to leaving that preset as it is.

## Where each scenario is carried

Recorded at build time, for task 6.4. Test names are cases in `scripts/tests/`.

| Scenario | Carried by |
|---|---|
| delivery-gate: *A host preview exists* | `ship/SKILL.md` Steps 3 to 5 (save, gate, merge unchanged); `wiki/development/the-change-loop.md#the-gate`, *no local run is the gate* |
| delivery-gate: *A test fails before the first push* | `apply/references/build-helper.md` step 3 and its `local checks:` report line; `checks.test.mjs`, *a failing suite is a local failure that names the part to rerun* |
| delivery-gate: *The machine has no tools* | `checks.test.mjs`, *a computer with no npm says nothing ran, in one line, and exits 7* and *a failed install is "not run"*; `build-helper.md` step 3, *Exit 7 … say so and go on*; neither `checkpoint.mjs` nor `ship.mjs` reads a local result |
| delivery-gate: local runs take turns | `checks.test.mjs`, *a turn another chat holds times out as "not run"; a dead run's turn is taken over* |
| delivery-gate: *An ordinary save* | `checkpoint.test.mjs`, *an open pull request: one command returns the gate result, the preview, and the saved revision* |
| delivery-gate: *A check fails* | `checkpoint.test.mjs`, *two failing checks are listed with the causes their logs show, and the next action* |
| delivery-gate: caps and refusals stay | `checkpoint.test.mjs`, *the script counts fix attempts: the fourth is refused before any commit*, *a closed pull request stops with exit 3*, *a handled credential in a staged file stops before the commit* |
| delivery-gate: `/ship`'s preparation and finish are single commands | `ship-commands.test.mjs`, *a clean prepare leaves one archive folder, a numbered release, and a rebuilt review page* and *finish prints merge.sh's lines unchanged, promotes secrets, and looks at the live app* |
| apply: *An ambiguous task* | `build-helper.md`, *Stop and hand back*; `apply/SKILL.md`, *Act on reports: A question* |
| apply: *No helper available* | `apply/SKILL.md`, *When no helper can start … work inline by the brief's Build steps* |
| apply: no test before the whole implementation; local checks after | `build-helper.md` steps 2 and 3, and *Never: run a test before step 3* |
| apply: *A long build*, *The person speaks mid-build* | `apply/SKILL.md`, the *Wait quietly* paragraph. Instruction text only: `measure-sessions.mjs` counts parent steps during a helper on real sessions, and `measure-sessions.test.mjs` proves the count on fixtures |
