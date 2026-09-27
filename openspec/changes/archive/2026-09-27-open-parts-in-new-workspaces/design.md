# Design

## Context

Today one chat carries every part of a request. `/plan` makes one change; a second change planned in the same worktree sits uncommitted beside the first, and `/ship` refuses a branch that carries another active change folder, so the agent parks the second plan on a side branch by hand. `/continue` switches the current worktree's branch, which asks about a dirty tree and otherwise moves the workspace away from its work. The session behind this change (`perfect-unicorn`, 2026-09-27) hit exactly this: the person asked "is this two changes in one?"

Paseo 0.9.2 opens a workspace and its agent in one call: `paseo run --new-workspace worktree --worktree-mode branch-off|checkout-branch …`. Read from its bundled server:

- `--base origin/main` resolves to `refs/remotes/origin/main`. Branch-off does **not** fetch first; checkout-branch fetches a branch that is missing locally.
- With no `--new-branch`, Paseo names the branch itself and may rename it later, as it did for this worktree.
- `paseo run` passes `PASEO_AGENT_ID` from the environment as `callerAgentId`, which makes the new agent a sub-agent of the caller. `paseo inspect <id> --json` returns the caller's `Provider`, `Model`, `Thinking`, and `Mode`.
- The workspace's `paseo.json` setup (secrets seed) runs on creation. Paseo may skip it and print `setupSkippedReason`.

`/routine`'s `routine.mjs` already owns WongStack's Paseo calls, with fixed exit codes: 0 ok, 2 input, 3 no Paseo, 4 daemon down, 5 client changed.

## Goals / Non-Goals

**Goals:**

- One script opens a workspace deterministically; the skills decide *when* and write the brief.
- The rule is stated once, in the change-loop page, and the how once, in `plan/references/new-workspace.md`.

**Non-Goals:**

- No tracking of parts across workspaces beyond what each change and memory already record.
- No change to `/routine`'s behavior or its private schedule client.

## Decisions

### A script opens the workspace; the agent writes the brief

`routine/scripts/workspace.mjs open` makes the one Paseo call, following [the principle](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai) that fixed steps belong in code. The judgment — what the parts are, what each brief says — stays with the agent.

```text
workspace.mjs open --title <part> --brief <file>
                   [--checkout <branch>] [--agent claude|codex] [--dry-run]
```

1. Find `paseo` (exit 3) and the primary worktree (`primary-root.mjs`).
2. Read the caller's settings with `paseo inspect $PASEO_AGENT_ID --json`. With no `PASEO_AGENT_ID`, require `--agent` and use Paseo's default model with `/routine`'s mode map (`bypassPermissions`, `full-access`).
3. Branch-off: `git -C <primary> fetch origin <default>`, then `--worktree-mode branch-off --base origin/<default>`. Checkout: `--worktree-mode checkout-branch --branch <branch>`.
4. Run `paseo run -d --json --new-workspace worktree --cwd <primary> --title <part> --provider <p> [--model <m>] [--thinking <t>] --mode <m> <brief text>`, with `PASEO_AGENT_ID` and `PASEO_WORKSPACE_ID` removed from the child's environment, so the new agent has no parent.
5. Print one JSON object: `agentId`, `workspaceId` and branch (parsed from Paseo's `Created workspace <id> - <name> (<branch>)` line), `cwd`, `title`, and `setupSkippedReason` when present.

`--dry-run` prints the exact `paseo run` argument list and changes nothing; the tests use it and a fake `paseo` binary (`WORKSPACE_PASEO_BIN`, like `ROUTINE_PASEO_BIN`).

*Alternatives:* the private daemon client, as `/routine` uses for schedules — rejected, the public `paseo run` covers every flag needed. `paseo workspace create` then `paseo run --workspace` — two calls and two failure points for the same result.

### Shared Paseo helpers

`findPaseo`, the `--json` call wrapper, `DAEMON_DOWN`, and the exit codes move from `routine.mjs` into `routine/scripts/lib/paseo.mjs`, which takes the binary override name as a parameter. `routine.mjs` imports them unchanged in behavior, and `routine.test.mjs` passes as is. Copying them instead would let the two drift.

### Where the rule lives

- `wiki/development/the-change-loop.md` gains `### Several parts, several workspaces`: the rule, in a few lines, linking the reference.
- `plan/references/new-workspace.md` is the runbook: what counts as a part, the ask, the brief template, the report, the fallbacks. `/explore`, `/plan`, `/continue`, and `/ship` link to it at the point of use, so it loads only when parts exist.
- `/explore`'s exit round names the split question as one of its possible questions. `/plan` runs the script for each other part after a yes, then plans the part it keeps.
- `/ship`'s closing line and `asking-the-user.md`'s next-step list gain the new-workspace offer.
- `/continue` step 3: when this worktree holds uncommitted work or another active unshipped change, the recommended option is a new workspace on the change's branch; its first message is `/continue <name>`.

### What counts as a part, and "holding" a change

A part is work that could be planned, reviewed, and published without the others. A workspace "holds" a change when `openspec list` shows an active change on its branch that is not the one being asked about, or its tree has uncommitted edits. A merged, archived change is not held, so after `/ship` the next change may start here when the person picks *stop here* and later asks again.

### The brief

The new agent's first message:

```text
/plan <part, in the person's words>

This is one part of a larger request. Plan only this part.
- Settled: <answers from this chat that apply to it>
- Other parts: <title> — <where: this chat | workspace "<title>">
- Builds on: <part> — <state: being built | about to publish | none>
```

The brief is written to a temporary file and passed as `--brief`, so quoting never breaks it. Memory adds the session facts at start.

### Next work after `/ship`

`/ship` looks for next work in this conversation first, then with one `memory.mjs search --type thread` on the change's slug. A queued part with no workspace yet becomes the recommended option; a part already opened elsewhere is named, not reopened.

## Risks / Trade-offs

- [Paseo changes `paseo run`'s flags or output] → a run result with no agent id exits 5 with the Paseo app steps (new worktree, same title, the brief), and the agent carries on here. A missing `Created workspace` line is only a warning, because the agent is already open. The fake-binary tests pin the argument list we send.
- [The branch for `/continue` is checked out in another worktree] → `git worktree add` refuses. The script reports Paseo's error; the agent offers to continue in that workspace instead.
- [Setup is skipped, so the new worktree has no `.env`] → the report shows `setupSkippedReason` and the command `paseo workspace setup <id>`; the agent does not approve setup on the person's behalf.
- [Parallel parts all bump `VERSION` and `CHANGELOG.md` in this repo] → each part takes the next version at publish, through `/ship`'s existing merge-conflict step. Installed repos rarely bump both.
- [Each workspace runs an agent, and costs usage] → the one ask names how many workspaces open; unattended runs open none.
- [Open PRs #150, #151, and #153 reword the same skills] → whichever publishes second merges by union of intent; the new text is a few lines per skill.

## Migration Plan

Nothing to migrate. Installed repos get the change through `/wong-sync`. A host without Paseo sees only the old choices.

## Open Questions

- Whether a Paseo phone client shows a workspace opened from the CLI without a refresh. It changes no spec; check it on the first real split.
