# Test a hook in a live session

You test a Claude Code hook by running it in a real session, not only in its script test, because a test can't show how the agent reacts to it. The hooks live in [`.agents/settings.json`](../../.agents/settings.json) ([why `.agents`](repo-layout.md)); [the ask check](../../.agents/skills/explore/scripts/ask-check.mjs) is the worked example.

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

## What you'll see

- A `Stop` hook that blocks with `{"decision":"block","reason":…}` sends the reason back to the agent, and Claude Code shows the person a *Stop hook error* notice. Say so in the change's report, so nobody takes it for a fault.
- A second stop in the same turn arrives with `stop_hook_active: true`; let it end, or the session loops.

Part of [Maintaining WongStack](README.md).
