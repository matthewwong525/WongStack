# Design

## Context

The worker starts each background run through `headlessCommand({ agent, prompt, access: { full: true } })`, which for Claude gives `--permission-mode bypassPermissions`. WongOS's old worker added `--disallowedTools` with its `NO_SEND` patterns to the same mode, and Claude Code honours it there. The sweep list (`loadSweeps`) merges the install's file over `references/sweeps.json` with a top-level spread, then checks each entry.

## Goals / Non-Goals

**Goals:** one install-wide list; every worker run gets it; a bad list or an agent that can not honour it never starts a run without the block.

**Non-Goals:** mapping patterns to Codex's `.rules` execpolicy; denying tools in chats.

## Decisions

1. **`deny` is a top-level array in the sweep list.** `loadSweeps` rejects it unless it is an array of non-empty strings, with the same `The sweep list has a bad entry: deny` error. The top-level spread already lets the install's value win. Alternative: `runs.deny` in the person's settings; rejected, because the block is the install's, not one person's.
2. **`headlessCommand` takes `deny` (default `[]`).** A full Claude grant appends `--disallowedTools ...deny` when it is non-empty, last, because the option takes many values and must not swallow a later argument. A narrow grant ignores it; Codex never gets it.
3. **Codex with `deny` fails closed.** In `start`, when `agent === 'codex'` and `sweeps.deny?.length`, journal `Not started: <title> — the deny list works only with Claude Code` (`kind: 'not-started'`) and return, before a copy is made. Alternative: translate to Codex `prefix_rule(..., decision="forbidden")`; rejected, because those match fixed word prefixes, so `Bash(*email*send*)` has no faithful form.

## Risks / Trade-offs

- [A pattern that matches too much blocks a job's own work] → the run's log shows the refusal; the daily page says to keep patterns narrow.
- [#505 edits the same file] → whichever ships second merges `main`; the edits touch different functions.
