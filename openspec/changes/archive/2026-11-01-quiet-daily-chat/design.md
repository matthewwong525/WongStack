# Design

## Context

WongStack's daily has two ways to watch: the Daily chat runs `D watch` itself (Monitor tool, or `--once` per message), or `D serve` runs the same watch on a computer and posts each pass's events as one `Watch · <day>` message (`serve`, `sendBatch`, the outbox in `chief.mjs`). The Daily chat then starts one background sub-agent per `stopped` or `asking` line by `references/chief.md`.

WongOS replaced `serve` with its own `.agents/daily/worker.mjs` and `journal.mjs` on 2026-10-31 (archive `2026-10-31-daily-background-sweeps`, commits 8b5ea69 and 103db58). Its worker imports WongStack's `watch`, `userAt`, `HOLD_MS` and `sendText`, so the port is mostly a move into the skill with WongOS's names and email parts taken out.

The hold bug is in `notice()`: a stop after the person's message sets `seen.hold`, but the agent running again deletes it, and the next stop is then not "theirs", so it goes at once.

## Goals / Non-Goals

**Goals:** one computer path (the worker) that WongOS can use as it is, with its email jobs as its own list and briefs; the chat path unchanged except for the hold fix.

**Non-Goals:** email jobs, `email-fill`'s lane, WongOS's fill-failed to-do (an install add-on can post it); a service installer.

## Decisions

- **Files.** `worker.mjs` and `journal.mjs` go in `.agents/skills/daily/scripts/`; the default list in `references/sweeps.json`; `header.md` and `judge.md` in `references/briefs/`. `D serve` (and its `chief-service` alias) runs the worker, so a service file that runs `daily.mjs serve` keeps working. `serve`, `sendBatch`, `BATCH`, the outbox and `serve.json`'s beat move to the worker; the beat file stays so the chat's own watch still ends with reason `service`.
- **The install's list.** An optional `sweeps` field in the person's settings file names a JSON file in the repo (WongOS: `.agents/daily/sweeps.json`). Its `events` merge over the default's, and its `sweeps` are the timed jobs. A brief name resolves in the install's `.agents/daily/briefs/` first, then the skill's. Over a settings-file field, an install-wide fixed path was rejected: the daily is per person, as WongOS's "Matthew's sweeps" shows.
- **Lanes.** An event entry may name a `lane` (one run at a time in it) and `ownPlace: true` (outside the 3-run cap). This keeps WongOS's fill rule as data, not a WongOS name in code. Chats use their agent id as the lane, as in WongOS.
- **Which AI runs.** One shared builder for a headless command, taken out of `memory/scripts/run.mjs`'s `agentCommand` into a small lib both use: `claude -p … --permission-mode bypassPermissions --no-session-persistence --output-format stream-json --verbose`, or `codex exec --ephemeral … approval_policy="never"` with `--dangerously-bypass-approvals-and-sandbox`. The settings file's `runs.agent` picks it, default `claude`. A run's env drops `PASEO_AGENT_ID` (its commands act as the Daily chat's helper through `chiefEnv`), sets `WONG_DAILY_RUN=1`, `WONG_MEMORY_NO_HEADLESS=1`, `WONG_TIDY=0`, and `IS_SANDBOX=1` for a root Claude run. Alternative: Claude only, as WongOS has; rejected by the host-agnostic rule.
- **The journal.** `<state>/journal/<day>.jsonl`, mode 0600, pruned past `journalDays` (14); run logs in `<state>/runs/`, pruned past `runLogDays` (7). `D journal [--new]` prints lines; `--new` moves the Daily agent's cursor, which is what the hook runs. The hook is a `UserPromptSubmit` entry in `.agents/settings.json` that prints nothing outside the Daily chat, in a run, or on any error.
- **The hold.** In `notice()`, keep `seen.hold` across the agent's later runs while `now < hold.until`; a stop inside the hold extends nothing and sends nothing; at `until` the latest stop goes. `personWrote` with a newer `userAt` restarts the hold, as now. The worker's own check (`typedAt` against `userAt` at enqueue) stays as WongOS has it.
- **Board line.** `not-read` for the board sends the Daily chat one line per day; all else goes to the journal.

## Risks / Trade-offs

- [A run as root with full permissions] → the same limits as today's sub-agents, stated in `header.md`; outward commands still refused by `D allow`; the streak still stops loops.
- [Codex flags differ by version] → the builder is tested by its argument list; the wiki names Claude Code as the tested path and Codex as the option.
- [WongOS's copy and WongStack's drift until its next sync] → the next WongOS sync takes the skill's files and deletes its own two; its briefs and list stay.
- [A restart stops a run mid-way] → the run is not started again; the journal says it did not finish.

## Migration Plan

An install running `daily.mjs serve` gets the worker on its next update with no file change; the Daily chat stops receiving `Watch ·` messages. Rollback is the previous release. WongOS: on its next `/wong-sync`, point `matthew.json`'s `sweeps` at `.agents/daily/sweeps.json`, rename its fill entry's lane to the new fields, change its unit's `ExecStart` to `daily.mjs serve`, delete its worker and journal, and drop the `.agents/settings.json` difference.
