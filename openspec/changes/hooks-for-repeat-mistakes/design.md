# Design

## Context

See proposal.md for why. Today:

- `scripts/measure-context.mjs --check` (CI, payload workflow) fails when start-up words pass `startupCeiling` or skill instruction words or bytes grow. The memory digest is capped in its own code at 40 lines and 6 KB. Idea 1's budget already exists; only the order is unwritten.
- `wiki/agent-knowledge-center.md` § *What each surface owns* says: *for an edit-time convention, prefer a rule to a hook*.
- `wiki/development/repository-improvement.md` § *A check before an instruction* covers file checks only. `.agents/skills/improve-code/SKILL.md` has one matching line.
- Hooks today: `SessionStart` (memory digest) and `PreToolUse` on edits (area warnings), in `.agents/settings.json` (Claude Code) and `.agents/hooks.json` (Codex, via `.codex -> .agents`).
- `.agents/skills/apply/references/build-helper.md` requires a report on every return, ending with a `local checks: pass | fail (<parts>) | not run (<reason>)` line, and says: *Don't end your turn while a sub-helper or a background check still runs*. Memory #1687 records five early stops anyway.

## Goals / Non-Goals

**Goals:**
- One home for the cost order and the hook stance, linked from where guidance gets added.
- `/improve-code` can plan a hook for a mistake made in the chat.
- One working hook, the same on Claude Code and Codex, that never traps.

**Non-Goals:**
- No new size check, and no change to `startupCeiling`.
- No hook for other recorded ideas (asking before destructive shell commands, etc.).
- No detection of running background jobs from chat files.

## Decisions

**Cost order lives on the philosophy page.** `wiki/agent-knowledge-center.md` already owns what each surface is. It gains one short paragraph: the order (page or skill opened on demand → script or check → helper → hook → always-loaded text), and that always-loaded text means `AGENTS.md`, skill descriptions, the wiki style and voice pages, and the digest, held down by `measure-context.mjs --check`. `wiki/maintaining/adding-a-skill.md` and `.agents/rules/payload.md` keep their budget mechanics and link the order rather than restate it. Alternative: a new page. Rejected: one paragraph doesn't earn a page.

**The hook stance is narrowed in place.** The *prefer a rule to a hook* sentence becomes: a rule for a convention that needs judgment; a hook for one mechanical mistake on record more than once that a script can spot as it happens. The hook names the fix and lets the agent go on at its next attempt. The *hint after a recurring error / block with a reason / check a write* shapes go in `repository-improvement.md`, where hooks get planned.

**`/improve-code` gets a hook branch in its existing section.** `repository-improvement.md` § *A check before an instruction* adds: a mistake made in the chat, which no file shows, may get a hook; each hook ships for both hosts and lets the second attempt through. The skill's line becomes *a failing check, or a hook when only the chat shows it*. The skill bytes this adds are cut from the same file or another skill, so `measure-context.mjs --check` passes.

**The stop check spots a missing report.** Script `.agents/skills/apply/scripts/helper-stop-check.mjs` reads the hook's JSON on stdin:

1. `stop_hook_active` true → allow. This is the "sent back once" guarantee both hosts provide.
2. Read the agent's own transcript (`agent_transcript_path`; none → allow). Allow unless its own part names `apply/references/build-helper.md` in its first plain user message or its first three tool calls, so a reviewer that opens the brief later, or a forked chat whose history names it, is not checked. Only a build helper is checked. Codex sends a helper its task encrypted, so there the helper's own read of the brief names it; a forked Codex helper's transcript opens with its parent's history, skipped up to the first entry stamped with its own thread id.
3. Read the last assistant message (`last_assistant_message`, else the transcript's last assistant entry). Allow if it holds a line starting `local checks:`.
4. Otherwise print a block decision whose reason says: *you stopped without your report; if a check or helper you started still runs, wait for it; then end with the report from build-helper.md*.

Any parse error, missing file or unknown shape → exit 0 and print nothing (allow). Alternatives: open tasks in `tasks.md` (rejected: helpers rightly return with final checks open, and on questions); background jobs left running in the transcript (rejected: the formats differ by host and change between versions).

**Wiring.** `SubagentStop` on both hosts: `.agents/settings.json` (Claude Code) and `.agents/hooks.json` (Codex). The build ran one sub-agent on each host (Claude Code 2.1.287, Codex 0.159.2): each fired `SubagentStop` with `agent_transcript_path`, `last_assistant_message` and `stop_hook_active`, and Codex fired no `Stop` for the sub-agent. On both, a probe helper that read the brief and stopped without a report was sent back once, and its second stop, with `stop_hook_active` true, went through. The `Stop` fallback is not needed. Command style matches the existing hooks (`node "$(git rev-parse --show-toplevel)/.claude/skills/…"`, timeout 3). Reached through `.claude/skills`, so the script ships with the apply skill.

**The brief keeps its sentence.** `build-helper.md`'s *don't end your turn …* line stays, because hosts that run no hooks still need it. It gains no words.

## Risks / Trade-offs

- [A helper's real report lacks a `local checks:` line] → it is sent back once, then allowed. Cost: one extra turn. The test covers a question return with the line present.
- [Codex fires no stop event for sub-agents] → ruled out for Codex 0.159.2 by a live run. The wiki says hooks ship for both hosts *where the host supports the event*.
- [Codex re-asks to trust hooks after an update] → the changelog's *Updating* note says so in plain words.
- [Install hook files edited locally] → `/wong-sync` merges hooks, never replaces (payload manifest); the new entry merges like the memory hooks.

## Migration Plan

Ships as a minor release. Installs receive it through `/wong-sync`. Rollback: remove the two hook entries; the script then never runs.
