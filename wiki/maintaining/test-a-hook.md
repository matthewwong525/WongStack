# Test a hook in a live session

You test a hook by running it in a real session, not only in its script test, because a test can't show how the agent reacts to it. The hooks live in [`.agents/settings.json`](../../.agents/settings.json) ([why `.agents`](repo-layout.md)); [the ask check](../../.agents/loop/ask-check.mjs) is the worked example. Codex reads its hooks from [`.agents/hooks.json`](../../.agents/hooks.json).

## Headless, with only your hook

Load your hook alone, so the [memory hooks](../development/memory.md) don't start a background capture run:

```bash
claude -p --setting-sources user --settings /tmp/only-my-hook.json \
  --output-format stream-json --verbose "<a prompt that triggers it>" < /dev/null
```

`--setting-sources user` drops the project's hooks; the `--settings` file adds back just yours, with the same `command` line. Read the stream for `hook_started`, the hook's feedback as a `user` row, and the agent's next step.

A headless run has no question box: `AskUserQuestion` is not callable. Test what your hook asks for there too, because scheduled and background runs are headless.

## With the question box

Start a short Paseo chat in your worktree, read what it did, then delete it:

```bash
paseo run -d --json --title "probe (delete me)" --provider claude \
  --mode bypassPermissions --cwd "$PWD" "<a prompt that triggers it>"
paseo wait <agentId>; paseo logs <agentId>; paseo delete <agentId>
```

This session loads every project hook, memory included, like a real chat.

## Apart from your own daily

The [daily](../../.agents/skills/daily/SKILL.md)'s hooks act on your real chats and settings. To test them apart, give the test chat a temp home:

- Run it with `HOME=<temp>` and `CLAUDE_CONFIG_DIR` set to your own `~/.claude`, so sign-in stays. Link `<temp>/.paseo` and `<temp>/.gitconfig` to yours, and unset every `PASEO_*` variable.
- Its hooks start a daily worker from the primary checkout in the temp home. Stop that worker before you test new delivery code: it runs the old code.
- After the test, delete the `.claude.json` the run made in your `~/.claude`.

## In Codex

Codex runs a project hook only after you trust it. Point `CODEX_HOME` at a scratch folder holding a copy of `~/.codex/auth.json` and a `config.toml` that trusts your probe hooks, run `codex exec "<a prompt that triggers it>"` in a scratch project, then delete both folders. Your own Codex setup stays untouched. For a one-off probe, `codex exec --dangerously-bypass-hook-trust` runs the scratch project's hooks with no trust step; use it only on hooks you wrote.

## What you'll see

- A helper's stop fires `SubagentStop`, with `agent_transcript_path`, `last_assistant_message` and `stop_hook_active`; the main chat's end fires `Stop`. Both hosts work this way (Claude Code 2.1.287, Codex 0.159.2), so [the helper stop check](../../.agents/loop/helper-stop-check.mjs) serves both.

- A `Stop` hook that blocks with `{"decision":"block","reason":…}` sends the reason back to the agent, and Claude Code shows the person a *Stop hook error* notice. Say so in the change's report, so nobody takes it for a fault.
- A second stop in the same turn arrives with `stop_hook_active: true`; let it end, or the session loops. A hook that carries a chat on more than once, as [the check-in](../../.agents/skills/daily/scripts/stop-check.mjs) does, needs its own limit.
- A `PreToolUse` hook starts before Claude Code writes the turn's last text and the call's own row to the transcript. A hook that reads the transcript waits for the call's `tool_use_id` first, as [the link check](../../.agents/loop/ask-check.mjs) does; without the wait, it sees none of the turn's last words.
- A hook that starts a detached process, as [the chat-name hook](../../.agents/loop/step-title.mjs) does, returns before that process ends, and the process keeps writing files under `HOME`. Its script test waits for the process to end before it deletes its temp folder ([the example](../../scripts/tests/step-title.test.mjs)); without the wait, the cleanup fails in CI with `ENOTEMPTY`.
- Codex records a block's reason as a `user` message, `<hook_prompt hook_run_id="…">reason</hook_prompt>`; Claude Code records it as a meta row, `Stop hook feedback:` then the reason. A reader that looks for the person's own words skips both.

Part of [Maintaining WongStack](README.md).
