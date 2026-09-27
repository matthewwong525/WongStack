# Design

## Context

See proposal.md — Why. On 2026-09-27 the host (8 GB RAM, `/tmp` a 3.8 GB tmpfs) showed three leaks, all WongStack-caused or WongStack-shaped:

- Paseo agents never archived: `paseo ls` listed 7 idle agents, the oldest 4 days; each `claude` process holds 100–300 MB.
- Six `vite` servers with `ppid 1` whose `/proc/<pid>/cwd` read `…/27cot6mt/chilly-manatee/app (deleted)`.
- About 4,300 `wong-memory-{home,repo}-*` folders (282 MB) from the memory test harness, left by runs that crashed or predate 25.3.0's `t.after` cleanup, plus loose agent scratch files (`/tmp/sync-wongstack-15-*`, `/tmp/wong-check*`).

Paseo 0.9.2 already has what's needed: `paseo workspace ls --json` (`workspaceId`, `project`, `isolation`, `cwd`), `paseo workspace archive <id>` (removes the worktree and its agents, leaves the local branch), `paseo ls --json` and `paseo inspect <id>` (`Status`, `UpdatedAt`, `Cwd`), and `paseo wait <id>` (blocks until idle). `workspace.mjs` and `routine.mjs` already share `routine/scripts/lib/paseo.mjs` for binary lookup, `--json` calls, and exit codes.

## Goals / Non-Goals

**Goals:** one script owns every cleanup action, so `/ship`, the session-start hook, and tests call the same code; every destructive step checks ownership first.

**Non-goals:** a general temp cleaner, Paseo's own daemon or supervisor processes, `agent-browser` sessions (`verify-runner.sh` already closes them), and macOS process cleanup.

## Decisions

### One script: `routine/scripts/tidy.mjs`

Three commands, with the same JSON-on-stdout and exit codes as `workspace.mjs` (0 ok, 2 bad input or refused, 3 no Paseo, 4 daemon down, 5 Paseo output changed), `--dry-run` on each, and `TIDY_PASEO_BIN` to point tests at a fake:

- `scratch` — creates and prints `<checkout root>/.scratch/`, first adding `.scratch/` to `git rev-parse --git-path info/exclude` when `git check-ignore` says it is not ignored.
- `close` — closes the workspace it runs in, after the reply ends.
- `sweep` — the background tidy-up; `--report` prints and clears the last report instead.

It lives beside `workspace.mjs` because it is Paseo plumbing and ships with `/routine`'s scripts (already core payload). *Alternative:* a new `tidy` skill — rejected: it would add a listed skill for something no person invokes by name.

### Ownership tests, shared by `close` and `sweep`

- **This repo's workspace:** `git -C <cwd> rev-parse --git-common-dir` equals ours, and `isolation` is `worktree`. The primary checkout is never archived.
- **Saved:** `git status --porcelain` is empty (ignored files, `.scratch/` included, do not count), and `git rev-list HEAD --not --remotes` is empty (every commit is on some remote branch, or the branch was squash-merged and its remote deleted — see below).
- **Merged branch (close only):** `gh pr view <branch> --json state,headRefOid` shows `MERGED` and `headRefOid` equals the local tip. Then a squash-merged branch counts as saved, and the local branch is deleted with `git branch -D` from the primary. With no `gh` or no match, the branch stays and the report says so.
- **Idle (sweep only):** every agent whose `Cwd` is in the workspace is not `running`, and the newest `UpdatedAt` is 3+ days old. The current `PASEO_AGENT_ID`'s workspace is always skipped.
- **Orphaned process:** owned by this uid; `readlink /proc/<pid>/cwd` ends in ` (deleted)`; the path is under a Paseo worktree parent of this repo (the parent folders of `git worktree list --porcelain` entries under `~/.paseo/worktrees/`). SIGTERM only, never SIGKILL. No `/proc` → the step is skipped with a note.
- **Old temp:** direct children of `os.tmpdir()` named `wong-*`, owned by this uid, with the entry's own mtime and its top-level children's mtimes all older than 24 h. These are now only crash leftovers (test runs, `run.mjs`, `/verify`), since scratch moved into the checkout.
- **Old scratch (primary only):** files under the primary checkout's `.scratch/` with mtime older than 24 h, then empty folders. Worktree scratch is never swept; it goes with the worktree.

*Alternative:* delete any stale temp entry — rejected by the person (only WongStack's own).

### `close` waits for the reply to end

`close` runs its checks synchronously. On refusal it prints why (unsaved files, primary checkout, not in Paseo) and exits 2 with nothing done. On success it spawns a detached child (`detached: true`, `stdio: 'ignore'`, `cwd` the primary checkout, so archiving the worktree cannot pull its cwd away). The child:

1. runs `paseo wait <PASEO_AGENT_ID>` (30-minute cap);
2. runs `paseo workspace archive <workspaceId>`;
3. stops orphaned processes for that worktree path;
4. deletes the local branch when it is merged, as above;
5. writes its result into the tidy report.

`.scratch/` needs no step: it is inside the worktree, so the archive removes it. `git worktree remove` counts only untracked files as unclean, not ignored ones, so it does not block the archive.

The agent's reply says *closing this workspace now*, then ends. *Alternative:* archive immediately with `--force` — rejected: it kills the chat mid-reply, and the person never sees the answer.

### Sweep runs from the session-start hook, detached, rate-limited

`session-start.mjs` spawns `tidy.mjs sweep` the way it already spawns `run.mjs`: detached, `unref`, errors swallowed. It skips the spawn for background runs (`WONG_MEMORY_RUN=1`) and when `WONG_TIDY=0`. The sweep takes a lock and exits at once if the last sweep began under 6 hours ago. Stamp, lock, and report live in `<git-common-dir>/wong-tidy/`, beside `wong-memory/`, so every worktree of the repo shares them and nothing shows in `git status`.

The hook also runs the report read synchronously: it reads `wong-tidy/report.json` and prints one line when the file holds anything, then deletes it. That is a local file read, so it fits the hook's 1.5 s budget.

### Scratch folder

`.scratch/` at the checkout root, git-ignored. It is on disk, not on a tmpfs `/tmp`; it disappears with the worktree; writes inside the project need no extra permission, where `/tmp` can prompt outside bypass mode. It is not under `.git/`, which Claude Code refuses to write.

The ignore line ships three ways:
- this repo's `.gitignore`;
- the `.gitignore` fragment in `stack-pack-fragments.md`, which `/wong-sync` re-offers to installed repos;
- `wong-setup`'s install list.

`tidy.mjs scratch` also adds the line to `info/exclude` when git does not ignore the folder yet (an installed repo that has not taken the fragment), so a scratch file can never be committed. `new-workspace.md`'s brief step and a short *Scratch files* line in `the-change-loop.md` point agents at `tidy.mjs scratch`.

*Alternative:* a per-workspace `wong-scratch-*` folder in `/tmp` — rejected: it lives in RAM on this host, and needs its own delete step.

### Test temp folders take a `wong-` prefix

`scripts/tests/*` use prefixes like `verify-env-` and `retired-names-`. A crash leaves them where the sweep can't claim them. Rename each `mkdtemp` prefix to `wong-test-<old>`; the memory harness's `wong-memory-*` already qualifies. The tests are meta-repo only, so targets see no change.

## Risks / Trade-offs

- [A person comes back to a 3-day-idle chat and finds it archived] → only saved work is archived; the chat stays readable in Paseo's archived list; `/continue <change>` reopens the branch; the report line names every archived workspace.
- [`paseo wait` never returns (daemon restart)] → a 30-minute cap; then the child archives nothing and records *could not close: chat never finished*.
- [Paseo's JSON shape changes] → exit 5 and no action, like `workspace.mjs`; the sweep's report says the Paseo part was skipped.
- [A `wong-` folder in temp belongs to a still-running long job] → the 24 h rule checks the folder and its top-level entries; a job idle a full day on disk is treated as done. Accepted.
- [Two sessions start at once] → the lock file; the second sweep exits.
- [A test's `wong-test-` folder is swept mid-run] → impossible inside 24 h.
- [A tool scans `.scratch/` (linters, the app build)] → the folder sits at the repo root, outside `app/` and `mini-apps/`, and the dot hides it from most globs.

## Migration Plan

`/wong-sync` brings `tidy.mjs`, the hook edit, and the skill and wiki edits. The first session start after the update sweeps once, so a machine full of old chats sees a larger first report. Rollback: set `WONG_TIDY=0` in the environment, or revert the hook line.
