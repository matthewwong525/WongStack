# Design

## Context

The daily's worker (`worker.mjs`, run by `daily.mjs serve`) reads its job list from `references/sweeps.json` merged with the install's own file (`loadSweeps`). Today the default list has two events (`stopped`, `asking` → `judge.md`) and no timed jobs, and `loadSweeps` takes timed `sweeps` only from the install's file (`merged.sweeps = own.sweeps ?? []`). A timed job is due by `at`/`days` or `every`/`hours` (`dueKey`); its optional `check` is an add-on whose `{"run": {...}}` line fills the brief; each run is a headless AI run with full access in `project`, the primary checkout, stopped after 30 minutes (`RUN_MS`).

`/close` reaches a chat two ways today: the chat runs it itself when its task is done (AGENTS.md), or `todos.mjs` `closeDone` sends it once the person marks the chat's to-do Done on the board, the chat is idle, and the person has been quiet 15 minutes (needs `sources.tasks`). `tidy.mjs sweep` archives a saved workspace idle 3 days, without `/close`. `tidy.mjs` already has `savedState` and `mergedAtTip` for "saved and merged at this exact commit", and `todos.mjs` has `merged()` by branch.

Memory consolidation runs inside the memory background run (`run.mjs`) at most once per 24 hours and five captured sessions, locked down to `memory.mjs` and its input folder, and ends with `memory.mjs finish-run --kind consolidation`. `/dream-memory` places facts on the wiki and publishes, only when typed; `dream.mjs since` finds the last dream record (slug `wiki-dream`, tag `dream`) and the highest fact id it read.

The sibling change `checkins-for-everyone` (workspace chilly-lionfish) makes `serve` start from every chat start with default settings, limits the watch to this repo's chats, and gives each chat one worker. This change works with or without it.

## Goals / Non-Goals

**Goals:** a merged, quiet chat gets `/close` once, with no settings; the wiki gets each consolidation's lasting facts soon after, in a small published change; both are entries on the default job list an install can turn off.

**Non-Goals:** a scheduled full dream; giving the memory run git; changing `/close`, the tidy-up, or consolidation's own rules; a company knowledge repo as the target.

## Decisions

- **Default timed jobs merge with the install's.** `loadSweeps` takes the default `sweeps` and the install's, by `id`: an install entry with a default's `id` replaces it, and `{"id": "<id>", "off": true}` removes it. An entry needs a `brief` or a `do`; `off` entries need only `id`. Alternative: copy the defaults into each install's file; rejected, since an update never touches that file and installs would never get the jobs.
- **A built-in job: `do`.** A timed job with `"do": "<name>"` runs the worker's own code for that name in the pass, with no AI run, queue slot, or brief; `do` names outside the built-in list fail `loadSweeps` like a bad brief. A failure journals `Not read: job <title> — <error>` and the pass goes on. A dry run prints `{"wouldDo": "<name>"}` and runs nothing. Alternative: a `check` script that sends `/close` itself; rejected, because the check contract is "say whether there is work", and the watch rows, Paseo calls and run lanes live in the worker.
- **Wrap-up (`wrap-up.mjs`, `"do": "wrap-up"`, `every: "5m"`).** For each row of today's watch list (`watched()` over the live Paseo list, so the sibling's own-repo and owner rules apply when present), it sends `/close` through `sendText` when all hold:
  1. the agent is live, `idle` or `error`, has no pending permission, and is not named `Daily`;
  2. its `cwd` is a worktree of this repo and not the primary checkout (`ownWorkspace`'s test), on a branch other than `main`/`master`/`HEAD`;
  3. `savedState` says saved with `merged: mergedAtTip(pr, HEAD)`, where `pr` is `gh pr view <branch> --json state,headRefOid` in that folder: the pull request merged at exactly this commit, and the tree is clean;
  4. the person's last message there (`userAt`) is 15 minutes old or more; with no time readable, the chat's own last update from `paseo inspect` stands in;
  5. no judge run for that chat is running or queued (its lane), and no close was asked before: neither in `wrap-up.json` nor as a to-do's `closeAsked`.

  It records `{ at, head, title }` per agent in `<state>/wrap-up.json` before the send, journals `Wrapped up: <title>`, and after 3 failed sends journals `Not closed: <title>` and stops trying. `gh` is asked at most once per chat per 10 minutes and again when HEAD moves; entries for gone agents leave after 60 days, as to-dos do. `closeDone` in `todos.mjs` skips a chat `wrap-up.json` holds. Alternative: `todos.mjs`'s `merged()` by branch name; rejected, because it ignores commits after the merge.
- **Tidy-up stays.** `tidy.mjs sweep` is unchanged: it is the fallback where no worker runs. Its 3-day idle rule never races a 15-minute wrap-up, and `/close`'s own route already keeps unpublished work.
- **The wiki tidy's trigger.** `memory.mjs finish-run --kind consolidation --status ok` writes `{ "at": <ISO time> }` to `consolidated.json` in the memory run's state folder (the one `run.mjs` passes as `stateDir`). The timed job `wiki-tidy` (`every: "30m"`, `check: .agents/skills/daily/scripts/wiki-tidy-check.mjs`) reads it; when `at` is newer than its own `claimed` field in the same file, it writes `claimed: at` and prints `{"run": {"consolidated": at}}`. A failed tidy waits for the next consolidation; no fact is lost, because the window comes from memory's record, not the marker. Alternative: ask the store each 30 minutes; rejected, since a signed-out computer would journal a failure each time.
- **A job in its own copy: `"place": "copy"`.** Before such a run starts, the worker runs `git fetch origin main` and `git worktree add --detach <state>/copies/<runId> origin/main` from `project`, and starts the run there. When the run ends, is stopped, or is found at `boot`, it runs `git worktree remove --force` and `git worktree prune`. A failure to make the copy journals `Not started: <title> — <error>`. The daily's state and memory's `.env` resolve to the primary checkout from a worktree, so the run's `D journal` and `memory.mjs` work there. Alternative: the primary checkout; rejected, because the tidy switches branches and the person may be working there.
- **A job's own time limit: `minutes`.** `reap` stops a run after its job's `minutes` (default 30). `wiki-tidy` takes 90, since `/ship` waits for the checks; it is `ownPlace: true`, so it never takes one of the three judge slots, and its lane keeps it to one at a time.
- **The small pass is `/dream-memory --small`.** The brief `wiki-tidy.md` tells the run to read `.claude/skills/dream-memory/SKILL.md` and follow its `--small` line, and allows publishing that one wiki change. The `--small` line runs steps 1, 4, 5, 8, 11, 12 and 13, with step 6 limited to the pages step 5 edited and the pages `M areas` gives for those facts' paths; it skips consolidation (it just ran), specs and plans (7), fact corrections (9) and faults (10). It publishes on `wiki-tidy-<date>` (`-2`, `-3` when taken) and records `Wiki tidy <date>: read facts up to #<id>. Checked: <pages>.` as the dream record. `dream.mjs` `isDreamFact` accepts both `Dream ` and `Wiki tidy ` records, so `since` starts each later tidy or dream after the facts the last one read. The run's end line is `Wiki tidy: <n> facts on <m> pages <PR url> (<pages>)` or `Wiki tidy: nothing to add`. `disable-model-invocation` stays: the run reads the file; no chat model starts it. Alternative: a separate skill; rejected, since the placing rules and the record would then live twice.
- **Defaults in `sweeps.json`:**
  ```json
  "sweeps": [
    { "id": "wrap-up", "title": "Wrap up finished chats", "every": "5m", "do": "wrap-up" },
    { "id": "wiki-tidy", "title": "Wiki tidy", "every": "30m", "check": ".agents/skills/daily/scripts/wiki-tidy-check.mjs",
      "brief": "wiki-tidy.md", "place": "copy", "minutes": 90, "ownPlace": true }
  ]
  ```

## Risks / Trade-offs

- [`/close` lands while the person reads the chat but has not typed] → the chat stays readable after archive; 15 quiet minutes after a merge is the same bar the board's Done uses.
- [An unattended publish of wiki text, as root on a server] → it is the same publish `/dream-memory` and `/close` make through the same checks; it never touches shipped pages, specs, plans or facts; one change per tidy, undone by reverting it (`wiki-dream.md#undo-one`).
- [Teammates' tidies on the same page at once] → each publishes alone through the gate; the second rebases or fails its checks and journals `Not finished`; its facts stay in memory for the next tidy or `/dream-memory`.
- [A copy left behind by a crash] → `boot` removes `<state>/copies/*` that no running run holds, then prunes.
- [Cost] → about one tidy a day per person, as often as consolidation, on the person's own AI allowance; a day with no consolidation runs none.

## Migration Plan

The jobs reach an install with the next `/wong-sync`; nothing to set up. Where the worker runs only by a service file today, the jobs run there; with `checkins-for-everyone` they run for everyone with Paseo. An install that wants neither adds `{"id": "wrap-up", "off": true}` or `{"id": "wiki-tidy", "off": true}` to its own job list. Rollback is the previous release, which has no default timed jobs; it refuses an `off` entry with no brief, so an install that added one removes it first. Whichever of this change and `checkins-for-everyone` publishes second rebases onto the other: the expected touch points are `worker.mjs` `serveDaily`, `chief.mjs` `watched()`, `daily.md`'s worker section, and the CHANGELOG.
