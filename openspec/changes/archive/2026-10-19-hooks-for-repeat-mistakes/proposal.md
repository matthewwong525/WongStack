# Cheapest place first, and a hook for repeat mistakes

**Status:** ready-to-ship
**Branch:** harness2-research
**Open questions:** none

## Why

Two ideas from Google's [Harness²](https://github.com/google-research/harness2) research fit WongStack. First, text the assistant loads in every chat is the most costly place for new guidance; a page it opens only when needed costs nothing until then. Second, a written rule can be skipped, but a hook can't. Today our wiki says to prefer a rule over a hook. Since 2026-09-27, a building helper has stopped five times while its checks were still running, and each fix so far was another written rule.

## What Changes

- **One list says where new guidance goes, cheapest first.** The page that explains WongStack's parts gains a short order: a page or skill opened only when needed, then a script or a check, then a helper, then a hook, and always-loaded text last. Anything added to always-loaded text is paid for by cutting something else. The existing size check already enforces that; this writes down why.
  ```mermaid
  flowchart TD
    page["1. page or skill, opened when needed"] --> script["2. script or check"] --> helper["3. helper"] --> hook["4. hook"] --> always["5. always-loaded text, paid for with a cut"]
  ```
- **Hooks become a tool for one kind of mistake.** Written rules still come first for judgment calls. A hook is for a mechanical mistake that happens repeatedly, when a script can spot it in the moment. A hook says what went wrong and how to fix it, then lets the assistant go on. `/improve-code` gains this option for mistakes made in the chat, where checks on files can't see them.
  ```text
  BEFORE: prefer a rule to a hook

  AFTER
  judgment call     → a written rule
  mistake in a file → a failing check
  repeated mistake  → a hook that names
    in the chat        the fix, then lets
                       the assistant go on
  ```
- **The first hook: a building helper can't quietly stop early.** When the helper building a change tries to stop without its usual short report, it's sent back once. The message says to wait for anything still running, then report. A second stop always goes through, so it never traps a helper. Everything else that stops passes untouched.
  ```mermaid
  sequenceDiagram
    participant H as Building helper
    participant K as Hook
    H->>K: stops, no report
    K-->>H: "Something may still be running.<br/>Wait for it, then send your report."
    H->>K: stops with its report
    K-->>H: lets it stop
  ```
- **Installs get the hook on their next update.** Codex may ask once to trust the new hook.

**Non-goals:** Adopting Harness² itself. No new size check: the existing one already holds always-loaded text down. No other hooks in this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `knowledge-center`: the philosophy page orders where new guidance goes by what it costs each chat, and says when a hook fits.
- `repository-improvement`: a mistake made in the chat, which no file check can see, may be planned as a hook.
- `apply`: a building helper that stops without its report is sent back once.

## Impact

`wiki/agent-knowledge-center.md`, `wiki/development/repository-improvement.md`, `.agents/skills/improve-code/SKILL.md`, a new script under `.agents/skills/apply/scripts/` with its test, `.claude/settings.json` (Claude Code) and `.agents/hooks.json` (Codex), the apply build-helper brief, `CHANGELOG.md` (minor). The skills' instruction budget stays flat: skill text added is offset by cuts. No app, data or dependency changes.

## Decision log

- **2026-10-19** — Asked which of five Harness² ideas to plan → chose the cost order with a budget, and hooks for repeat mistakes.
- **2026-10-19** — Asked what idea 1 should add, since `measure-context.mjs --check` already caps start-up text and the memory digest has its own 6 KB cap → chose to write the order only, with no new check.
- **2026-10-19** — Asked how the wiki's "prefer a rule to a hook" should change → chose to narrow it: rules for judgment calls, a hook for one repeated mechanical mistake.
- **2026-10-19** — Asked whether to build a first hook in this change → chose yes: the helper that stops early, recorded five times (memory #1687).
- **2026-10-19** — Assumed: the hook spots an early stop by a missing report, not by open tasks or running jobs, because a helper legitimately returns with tasks open, and running jobs look different in each host's chat files. The brief already requires a report on every return.
- **2026-10-19** — Assumed: the hook sends a helper back once, then always lets it stop, and lets any error through, because a hook that traps a helper is worse than the mistake it guards against.
- **2026-10-19** — Assumed: on review, a helper counts as a builder only when its first instruction or its first three commands name the brief, because matching anywhere would send back a reviewer that merely opens the brief, or a forked chat whose history names it.
- **2026-10-19** — Assumed: Harness² ideas are folded in as our own sentences, with no text copied, because that is how outside skills have been taken in before (`improve-skill-lineage`).
- **2026-10-19** — Checkpoint: built the cheapest-first order, the narrowed hook stance, `/improve-code`'s hook option and the build helper's stop check on both hosts; on review, narrowed which helpers count as builders. Local checks pass; waiting on the publishing checks for task 5.2.
- **2026-10-19** — Archived checkpoint: merged main (its question-box `Stop` hook kept beside this `SubagentStop` one), numbered 43.10.0; local checks pass after one flaky password-page test passed on rerun.
