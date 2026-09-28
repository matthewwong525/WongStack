# Design

## Context

Closing today is one option in `/ship`'s Step 6. [`new-workspace.md#next-work`](../../../.agents/skills/plan/references/new-workspace.md#next-work) runs `tidy.mjs close`, which refuses unsaved work (`savedState`) and the primary checkout. A detached `close-child` waits for the reply to end, runs `paseo workspace archive`, stops leftover processes, and deletes the local branch only when `mergedAtTip`. [`/ship`'s distill section](../../../.agents/skills/ship/SKILL.md#distill-the-changes-facts-into-the-wiki) is the only path from facts to the wiki. [`asking-the-user.md`'s next-step list](../../../.agents/skills/explore/references/asking-the-user.md#end-every-reply-with-the-next-step) has no close entry.

The budget is tight. `measure-context.mjs --check` shows 144 bytes of instruction headroom, and start-up is 2199 of its 2200-word ceiling.

## Goals / Non-Goals

**Goals:**
- One verb that closes any finished session with no questions and loses nothing.
- `/close` is the only path from facts to the wiki; `/ship` only puts code live.
- A close offer after every kind of finished work in a Paseo worktree.

**Non-Goals:**
- Changing `sweep` (idle 3+ days, saved work only).
- Distilling work that is thrown away, or a workspace closed by the tidy-up or the Paseo app.
- Any `/abandon` or alias.

## Decisions

### `/close` runbook (`.agents/skills/close/SKILL.md`)

Invoking `/close` authorizes every step below, `/save` and `/ship` included. No other prompt.

1. **Read the state.** Run `git status --porcelain`, the commits ahead of `origin/main`, the branch's PR (`gh pr view`), and whether the tip merged. Check whether this is a linked worktree with `PASEO_AGENT_ID` set.
1a. **Wrap-up facts** (every route, before anything else): gather the session's intent from the conversation, and the plan's tasks when a change exists. Write facts through [the write gate](../../../.agents/skills/memory/SKILL.md#write): one `project` fact with the goal and what got done, one `thread` fact per unfinished piece (what's next and any blocker), and supersede each thread this session finished. These ride with the route's own save: `/save`'s session facts on keep, and the facts-only save on wrap and discard, so there is no second write.
2. **Pick a route:**

   | State | Route |
   | --- | --- |
   | Person asked to throw it away (worktree only) | **discard** |
   | Unpublished repo work: dirty tree, or commits whose PR didn't merge at the tip | **keep** |
   | Tip merged, or 0 ahead with a clean tree | **wrap** |

3. **keep:** invoke `/save` verbatim. It commits, pushes, opens or updates the PR, and records session facts. It never publishes, and the wiki step is skipped because the close after that work ships runs it. Proceed on any `SAVE_GATE_RESULT` except a failed push. A red CI run still leaves the work saved, so say so in one line.
4. **wrap:** record the session's facts by [the facts-only save](../../../.agents/skills/save/references/facts-save.md), then run **Update the wiki** below. If the tip merged, first `git fetch origin main` and `git switch -c <branch>-wiki origin/main`, so the edits start from the updated main. If the step wrote edits, invoke `/ship`, which finds a dirty tree with no change and no code, so it saves, gates, and merges. Suppress `/ship`'s closing question. After the switch, delete the old merged local branch with `git branch -D`, because `close-child` deletes only the current one.
5. **discard:** record facts (facts-only), then run `tidy.mjs close --discard`.
5a. **Keep the transcript** (every route): run `memory.mjs keep-transcript current`. It reuses `strip`'s private check, redaction, and `putObject` to `sessions/<email>/<agent>/<id>.jsonl`, and records `raw_key` and `raw_bytes` on the session row, leaving its capture status and `read_through` alone so the background run still captures it. Over 50 MB, no bucket, `#private`, or the store unreachable prints one line and exits 0, so it never blocks the close.
5b. **Before the close** (every route): when this chat opened a browser hand-over link that is still open, run `hand-over.mjs close`. The hand-over, like agent-browser, is per machine (`~/.wong-stack/hand-over/`), so `/close` never touches one it didn't open. Processes need no step here: `close-child` already stops every process whose working folder was in the removed worktree (`stopOrphans`), such as dev servers, watchers, and builds.
6. **Close:** run `tidy.mjs close` (keep and wrap). Exit 0 → say it's closing, then end the reply. Exit 2 in the primary checkout or outside Paseo → say there's no workspace to close. Any other exit 2 → give the `error` in plain words. Exits 3 to 5 → Paseo couldn't close it from here, but the Paseo app can archive it.
7. **Report** in [plain words](../../../.agents/skills/explore/references/asking-the-user.md#write-in-plain-words): facts recorded, pages changed, work saved to GitHub (with its pull request link) or work thrown away, then the close line. The close has no next-step question, because the chat is ending. After a failed close, end with the ways to clear it.

### Update the wiki: moved from `/ship` to `/close`

`/ship`'s *Distill the change's facts into the wiki* section is deleted, along with Step 2's "after the distillation". Its paragraph and `memory.mjs` block move under `## Update the wiki` in `close/SKILL.md`, widened to the session:

- The facts step 4 just saved.
- `show "$CHANGE_NAME"` plus `search --branch "$BRANCH" --change "$CHANGE_NAME"`, when the branch holds or held a change. Read the change name from the archive `/ship` just wrote, or the active change.
- `search --branch "$BRANCH"` on a feature branch with no change. Omit `--branch` on main.

The Decision-log line has nowhere to go once the change is archived. Instead, `/close`'s pull request body names the pages changed, and the report says `no repeatable fact` when there is none. The delivery-gate distill requirement is removed. `knowledge-center` and `memory` name `/close` instead of `/ship`, and so do the three docs that say `/ship` distills: `wiki-style.md`, `agent-knowledge-center.md`, and `development/memory.md`.

### `tidy.mjs close --discard`

With `--discard`, `close` skips `savedState` but still refuses the primary checkout and a chat that isn't a Paseo agent. Before handing off:

1. `gh pr close <branch>` if a PR is open, or print a note on failure.
2. `git push origin --delete <branch>` if the remote has it.
3. `git reset --hard` and `git clean -fd` in the worktree (never the primary). `.scratch/` is git-ignored, so it's untouched.
4. Hand off with `deleteBranch: true`, so `close-child` runs `git branch -D` after the archive.

The JSON adds `discarded: { pr, remote }`. `--dry-run` reports the job and touches nothing. The reset makes `paseo workspace archive` see a clean tree, so it behaves as it does for a saved one.

### Where the close offer lives

`asking-the-user.md`'s next-step list gains one bullet: finished work in a Paseo worktree (a publish, a plain request, finished non-code work, a declined publish) offers *Close this workspace*, which runs `/close`, recommended when no asked-for work waits. `/ship` Step 6 and `new-workspace.md#next-work` keep their ordering rules and link there. The `tidy.mjs close` exit list moves to `/close`.

### Budget

Aim for `close/SKILL.md` under about 450 words. Trim at least the same amount elsewhere:

- The distill paragraph and code block leave `/ship`.
- The exit list leaves `new-workspace.md`.
- Tighten any skill's prose that repeats the change loop.

The `close` description is about 18 words. Start-up must drop the same amount, by shortening another description or the `WONG-STACK` verb line. Run `node scripts/measure-context.mjs --check` until it passes.

## Risks / Trade-offs

- **`/save` inside `/close` waits for CI**, which can take minutes on unfinished work. Accepted: `/save` stays verbatim, and the close waits for the reply anyway.
- **A published change now takes two pull requests**: the code, then a small wiki-only one from `/close`. The second skips the app's test suite (`app-untouched.sh`) and runs `/verify` with nothing to walk (`NONE`). Accepted: the person chose to keep `/ship` about code.
- **A workspace closed without `/close`** (the tidy-up, the Paseo app, or a person who just leaves) never updates the wiki. The facts stay searchable in memory, and a later `/close` of the same change reads them by `--change`.
- **The wiki edit is no longer reviewed in the change's own pull request**, so a reviewer sees it apart from the code that taught it.
- **`paseo workspace archive` on a worktree it didn't create**: already covered by today's close. Discard reuses it after a reset.
