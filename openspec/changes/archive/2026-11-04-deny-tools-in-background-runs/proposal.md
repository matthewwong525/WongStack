# Deny tools to background runs

**Status:** ready-to-build
**Branch:** slick-gorilla
**Open questions:** none

## Why

A background run works with no person there to say no. Today an install can not stop it from using a tool, such as the command that sends an email a person must approve first. WongOS had this block in its own old worker; every install needs it.

## What Changes

- **An install names the tools no background run may use.** One `deny` list in the install's list of jobs holds tool patterns. Each background run the worker starts gets the list, and Claude Code refuses those tools in that run.
  ```json
  {
    "deny": ["Bash(*email*send*)", "Bash(*send-approved*)"],
    "sweeps": []
  }
  ```
- **A bad list stops nothing quietly.** A `deny` that is not a list of patterns makes the worker say what is wrong, the same as any other bad entry in that list, and it starts no run with a list it can not read.
- **It works with Claude Code only.** Codex has no way to refuse a tool by such a pattern. With Codex and a `deny` list, the worker starts no background run and writes why in the journal, so no run works without the block you set.
  ```mermaid
  flowchart TB
    j[A job is due] --> d{deny list set?}
    d -->|no| r[Run starts as today]
    d -->|yes, Claude Code| c[Run starts with those tools refused]
    d -->|yes, Codex| n[No run; one journal line says why]
  ```

Non-goals: no default `deny` list in WongStack; no block for chats a person opens; the memory and stop-check runs keep their own narrow grants.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `daily-routine`: a new requirement that an install's `deny` list reaches every background run of the worker, and that Codex with a `deny` list starts none.

## Impact

- `.agents/skills/memory/scripts/lib/headless.mjs`: `headlessCommand` takes `deny` and adds `--disallowedTools` to a full Claude run.
- `.agents/skills/daily/scripts/worker.mjs`: `loadSweeps` checks `deny`; `makeWorker`'s `start` passes it, and refuses a Codex run while it is set.
- Tests: `scripts/tests/daily-worker.test.mjs`.
- Docs: `wiki/development/daily.md#your-own-jobs`.
- `CHANGELOG.md` (`minor`).
- Overlap: #505 ("A problem opens one chat") also edits `worker.mjs`; whichever publishes second merges `main`.

## Decision log

- **2026-11-04** — Asked through the WongOS plan `sync-wongstack-both-ways` what to bring over from WongOS's `NO_SEND` → chose a general `deny` list of tool patterns, passed to each Claude run as `--disallowedTools`, with tests and a line on the daily page.
- **2026-11-04** — Assumed: the list sits at the top of the install's sweep list, not in each person's `runs` settings, because the block is the install's rule for every person's runs, and that file is the install's own and never changed by an update.
- **2026-11-04** — Assumed: the install's `deny` replaces the default's, as every other top-level field there does, because WongStack ships no default list.
- **2026-11-04** — Assumed: it is Claude-only, and a Codex run with a `deny` list does not start, with one journal line, because Codex's command rules match fixed word prefixes, not these patterns, so a run would work without the block; failing closed sends nothing.
- **2026-11-04** — Assumed: the list reaches every run the worker starts (events and timed jobs), not the memory or stop-check runs, because those already run with a short list of allowed tools.
- **2026-11-04** — Assumed: morning routines do not get the list, and the page says so, because each opens its own chat through Paseo, which has no option to refuse tools; the second look found the docs said every run did.
