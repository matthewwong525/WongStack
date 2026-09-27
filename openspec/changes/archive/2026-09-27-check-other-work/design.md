# Design

## Context

`/explore` runs `openspec list --json`, which reads only the current worktree, so it misses plans in sibling worktrees and on teammates' branches. `plan/references/new-workspace.md` already asks when a new change starts in a workspace that holds another; nothing looks sideways. `routine/scripts/tidy.mjs` already finds this repo's Paseo workspaces by comparing git common dirs, and `routine/scripts/lib/paseo.mjs` wraps the Paseo CLI with fixed exit codes. On 2026-09-27, `paseo workspace ls --json` listed 20+ workspaces across six projects on this host; two WongStack workspaces ("Make install easier", and `chatty-cheetah` with an unsaved `cloud-runs-server-installer` plan) overlapped.

## Goals / Non-Goals

**Goals:**
- One script that prints this repo's other active work as JSON, fast and offline-tolerant.
- One step in `/explore` that runs it once per piece of work and speaks only on an overlap.

**Non-Goals:**
- A session-start check, locks, or messages to other agents.
- Automatic overlap scoring: the agent judges.

## Decisions

- **`other-work.mjs` gathers; the agent judges.** New `.agents/skills/explore/scripts/other-work.mjs`, Node built-ins, `--help`, exit 2 on unknown flags (`cli-conventions.test.mjs`). It prints `{ ok, workspaces[], pullRequests[], notes[] }`. Overlap means the same area of the product, which paths alone can't tell, so no score. Alternative, file-overlap scoring: rejected; two plans often clash before either touches a file.
- **Git is the base, Paseo enriches.** `git worktree list --porcelain` from the primary (via `primaryRoot`) gives this repo's worktrees, so other projects never appear and no filtering by Paseo's project name is needed. Paseo, when installed and answering, adds each workspace's `name` (`paseo workspace ls`) and `busy` (any agent in `paseo ls -g` under that folder with status `running` or `initializing`). Paseo missing or down → a note; the list still comes from git. `OTHER_WORK_PASEO_BIN` overrides the binary for tests, as `TIDY_PASEO_BIN` does.
- **Each worktree entry.** `{ name, path, branch, busy, changes[], changedFiles, dirtyFiles[], commitsAhead }`. `changes` are active folders under `openspec/changes/` (not `archive`), each `{ name, title }` from the proposal's `#` heading, read from disk so unsaved plans count. `dirtyFiles` from `git status --porcelain` (first 20), `commitsAhead` from `rev-list --count origin/<default>..HEAD`, `changedFiles` from `diff --name-only origin/<default>...HEAD` (first 20). Left out: the current worktree (by realpath of `--show-toplevel`) and any worktree with no changes, no dirty files, no commits ahead, and not busy. The primary checkout is included on the same test.
- **Pull requests.** `gh pr list --state open --limit 50 --json number,title,headRefName,author,url,files`. Skipped: `author.is_bot` or a login starting `app/` or ending `[bot]`, the current branch, and a branch a listed worktree already holds (the worktree entry gets `pr: { number, url }`). Each entry `{ number, title, branch, author, url, changes[], files[] }`, `changes` from `openspec/changes/<name>/` paths, `files` first 20. `gh` failing → `notes: ["Open pull requests were not checked: <reason>."]`, exit 0.
- **The default branch.** `main` when it exists locally or on origin, else `gh repo view`'s default branch, as `workspace.mjs` does; no fetch, so the check stays fast and offline.
- **Where it runs.** `explore/SKILL.md` gains *Check for other work* after *Search memory before asking*: for work that changes repo files, run the script once, compare, and on an overlap put the ask in the next question group (or alone when nothing else is open). The bounded-mode step 2 runs it too unless the conversation shows it ran for this work. The ask's options live in `new-workspace.md`'s *Ask once*, beside the busy-workspace ask, so ask shapes stay in one page. *Work there instead* names the other workspace to open in Paseo (or the pull request) and stops here; nothing is drafted.
- **Wiki.** One sentence in `the-change-loop.md` *Several parts, several workspaces*: planning checks the repo's other workspaces and open pull requests first, linking the explore step. No new page.

## Risks / Trade-offs

- Slow `gh` → up to a few seconds per planning start; bounded by one call. → Acceptable; explore already makes several calls.
- An idle worktree with an old unsaved plan still shows up → The agent names only overlaps, so stale work is quiet unless related, and then worth knowing.
- Paseo JSON fields change → treated like tidy.mjs: skip Paseo enrichment with a note, never fail.
