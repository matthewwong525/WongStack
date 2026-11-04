# Design

## Context

The change loop's steps are defined in `wiki/development/the-change-loop.md#what-each-step-may-change` and the `change-loop` spec, but nothing records which step a chat is in. Each host names chats its own way:

- **Paseo**: the chat list shows the workspace `title` (`paseo workspace rename <id> <title> --json`, already used by `.agents/skills/schedule/scripts/workspace.mjs` through `renameArgs`); a chat's tab shows the agent name (`paseo agent update <id> --name <name>`). `PASEO_AGENT_ID` is set in the chat's shell; `paseo workspace ls --json` maps a workspace to its `cwd` and `isolation` (`worktree` or the main folder).
- **Claude Code** (2.1.310): a `UserPromptSubmit` or `SessionStart` hook may return `hookSpecificOutput.sessionTitle` to set the session's title. No other hook event, and no command a tool can run, sets it mid-turn. `CLAUDE_CODE_SESSION_ID` is set in the chat's shell; the hook gets `session_id` and `prompt` on stdin.
- **Codex** (0.159.2): hooks cannot set a title. A rename appends `{"id","thread_name","updated_at"}` to `$CODEX_HOME/session_index.jsonl` (default `~/.codex`); the newest line per id wins in the resume list. `CODEX_THREAD_ID` is set in the chat's shell. Codex has a `UserPromptSubmit` hook.

The parked plan `done-chat-titles` (branch `loud-bedbug`) planned DONE through the daily worker's watch pass. Its `DONE: ` mark shape is reused; its worker path and its strip of any capital-letter mark are not.

## Goals / Non-Goals

**Goals:**
- One script owns the step state and every host's name write, so skills and hooks call one thing.
- A typed step shows at once on every host; a step a skill enters shows at once in Paseo and Codex, and by the next message in plain Claude Code.

**Non-Goals:**
- No enforcement of step limits (memory thread #2112 keeps that open).
- No daily-worker marking, no off switch, no settings file.

## Decisions

1. **`.agents/skills/explore/scripts/step-title.mjs`**, beside `ask-check.mjs`, the loop's other hook script. Subcommands:
   - `set <STEP> [--task <words>] [--typed]`: run by a skill. Records the step, then writes every host it can reach (decision 4). Exit 0 always, printing `STEP_TITLE=<title>` or `STEP_TITLE=skipped <reason>`: a failed name write never stops a step.
   - `hook --agent claude|codex`: reads the hook JSON on stdin. A prompt that starts with a step verb sets that step as `--typed`; Claude also gets `sessionTitle` in its output. `hook --event session-start` reapplies the stored title on resume.
2. **Verbs map to steps:** `/explore` → EXPLORE; `/plan`, `/improve-code` → PLAN; `/apply`, `/continue` → APPLY; `/ship` → SHIP. Codex's `$plan` form maps the same. A chat's first message with no slash starts PLAN. A first message naming another skill (`/daily`, `/schedule`, `/close`, …) or a chat the script finds is the Daily chat, a routine, or a helper (not a worktree, or no task words) sets nothing.
3. **Order guard:** ranks EXPLORE < PLAN < APPLY < SHIP < DONE. A `set` without `--typed` that would lower the rank is ignored (`STEP_TITLE=skipped lower`), so `/ship`'s pull-in through `/apply` and `/plan` stays SHIP, and a DONE chat stays DONE. A typed verb sets any step.
4. **State and writes.** State is one small JSON file per chat id under `$(git rev-parse --git-common-dir)/wongstack/step-titles/`, outside the tracked tree: `{ step, task, at }`. The chat id is `PASEO_AGENT_ID`, else `CLAUDE_CODE_SESSION_ID`, else `CODEX_THREAD_ID` (the hook uses stdin's `session_id`, and also looks for a Paseo id in its env). Writes:
   - Paseo, when `PASEO_AGENT_ID` and `paseo` exist: `agent update --name`, and `workspace rename` for the workspace whose `cwd` is the chat's and whose `isolation` is `worktree`.
   - Codex, when `CODEX_THREAD_ID`: Codex's own rename, `thread/name/set` through `codex app-server` (about 0.2 s), which updates both `state_5.sqlite`'s `threads.name` (what the thread list reads) and `session_index.jsonl`. When that call fails, as on a Codex without it, append one whole line to `session_index.jsonl`. Found in the build: 0.159.2's thread list reads the name from `state_5.sqlite`, so a `session_index.jsonl` line alone does not show.
   - Claude Code: only the hook output; `set` stores the title for the next hook run.
5. **Task words** are chosen once and stored; every write then sets the whole name `<STEP>: <task>`, overwriting what is there. First that exists: the stored task; `--task` (which also replaces a stored task that came from a branch-like name); the host's name at the first write minus a leading step word (Paseo); the first message's first clause, cut at a word to 50 characters, step verb removed. A name that looks like a branch (`/^[a-z0-9]+(-[a-z0-9]+)+$/`) or a placeholder counts as none. `/plan` passes `--task` with the proposal's `#` heading so a chat with no good name takes it.
6. **Skill lines** (one each, offset by cuts so `measure-context.mjs --check` passes): `explore` standalone runs `set EXPLORE`; `plan` runs `set PLAN --task "<heading>"` after drafting; `apply` runs `set APPLY` before building and `set DONE` when a to-do that changes no file is finished; `ship` runs `set SHIP` at preflight and `set DONE` after `finish` reports merged.
7. **Hook entries.** `.agents/settings.json`: `UserPromptSubmit` and `SessionStart` (`startup|resume`) gain `step-title.mjs hook --agent claude`, timeout 3. `.agents/hooks.json`: `UserPromptSubmit` gains `step-title.mjs hook --agent codex`. Hooks fail open: a bad input prints nothing and exits 0.

## Risks / Trade-offs

- **Codex's rename call is experimental.** `codex app-server` is marked experimental; a later Codex may change `thread/name/set`. The fallback line keeps an older Codex working, and tests pin both shapes. The open Codex screen may keep its old name until reopened.
- **Plain Claude Code shows DONE one message late.** Claude Code offers no other way to set the name mid-turn.
- **A name typed by hand is overwritten** at the next step. The person chose this: no special case for hand-typed marks.
- **Overlap:** `chat-names-and-thinking-floor` (PR #487) changes how `workspace.mjs` names new workspaces; this change reads a new workspace's name once as its task words, so the two compose. `ship-goes-all-the-way` (workspace silly-duck) edits `ship/SKILL.md`; the second to land merges one line by hand.
