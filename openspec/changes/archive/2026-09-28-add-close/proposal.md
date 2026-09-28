# Add /close to wrap up a session

**Status:** ready-to-ship
**Branch:** close-skill
**Open questions:** none

## Why

Today the agent only offers to close a workspace after it publishes a change. Research, errands, a wiki note, or work you gave up on end with no close question, so their workspaces pile up. What they learned never reaches the wiki, because only publishing updates it. Publishing should only put code live; saving what the chat learned belongs to wrapping up.

## What Changes

- **A new /close command wraps up in one go.** It asks nothing. It saves what the chat learned, saves any unfinished work to GitHub, and otherwise updates the wiki. Then it closes the workspace. The chat stays readable in Paseo's archived list.
  ```text
          /close
            │
            ▼
   save what the chat learned
            │
      ┌─────┴──────┐
      ▼            ▼
   unfinished    nothing
   work          left open
      │            │
      ▼            ▼
   save it to    update the
   GitHub        wiki, publish
      │            │
      └─────┬──────┘
            ▼
    close the workspace
  ```
- **Nothing planned is forgotten.** Before it closes, /close writes a wrap-up to memory. It records what the chat set out to do, what got done, and what's still left. Each piece left undone is saved as an open to-do. The next session's start shows it, and /continue can pick it up, even from another workspace.
  ```text
   CHAT WRAP-UP
   ═══════════════════════════
   set out to  add /close
   done        plan written
   still open  build /close
               ship it
  ```
- **The whole conversation is kept.** /close uploads the chat's full transcript to the memory store's private storage (R2) right away, instead of waiting for a later session to pick it up. Secrets are blanked out first, as today. A chat marked #private is never uploaded, and a store without R2 skips this and says so.
- **Closing cleans up after the chat.** When the workspace closes, /close stops everything still running from it, such as the app's local server, test runs, and builds. It also closes a browser hand-over link the chat left open and deletes the workspace's scratch files. Things other chats share stay running, such as the agent's browser and other workspaces.
  ```text
   stopped at close          left running
  ──────────────────        ──────────────────
   local app server          the shared browser
   test runs, builds         other workspaces
   open hand-over link       the main folder
   scratch files
  ```
- **Unfinished work is never lost.** /close saves it to GitHub the way /save does: on its own branch, with an open pull request that isn't merged. It stays off the live site until you publish it. Later, /continue picks it up from GitHub on any computer, in a new workspace. Nothing is thrown away unless you say so, such as *close and throw it away*. That closes the pull request and deletes the branch, then closes.
  ```text
             │ keep (default) │ throw away
  ───────────┼────────────────┼────────────
  branch     │ on GitHub      │ deleted
  pull req.  │ stays open     │ closed
  live site  │ unchanged      │ unchanged
  /continue  │ picks it up    │ nothing left
  ```
- **Only /close updates the wiki.** /ship just puts code live and no longer touches the wiki. /close gathers what the chat and its change learned and writes the lasting parts into the wiki. It publishes those edits on their own, so after a publish you get a small second update that only changes the wiki. Unfinished work waits, and its wiki update runs at the close after it goes live.
  ```text
     BEFORE                 AFTER
  /ship                   /ship
   ├─ wiki update          └─ put code live
   └─ put code live       /close
  /close                   ├─ wiki update
   └─ close                └─ close
  ```
- **Every finished task offers to close.** In a Paseo workspace, the last question after any finished work offers *Close this workspace*, which runs /close. That covers a publish, a research answer, an errand, or a publish you declined. A plan waiting for review or a build in progress gets no close offer.
  ```text
   BEFORE                  AFTER
  ┌─────────────────┐    ┌─────────────────┐
  │ Here's what I   │    │ Here's what I   │
  │ found: ...      │    │ found: ...      │
  │                 │    │                 │
  │ ( ) Stop here   │    │ (•) Close this  │
  │                 │    │     workspace   │
  │                 │    │ ( ) Stop here   │
  └─────────────────┘    └─────────────────┘
  ```
- **Your project's main folder is never closed.** Each Paseo workspace is a separate copy of your project that /close can remove. The main folder is the original, the one the copies come from, so /close never removes it. A chat outside Paseo has no workspace either. In both cases, /close still does the rest: it saves what the chat learned, updates the wiki, and saves unfinished work to GitHub. Then it says there's no workspace to close, and the chat stays open.
  ```text
   main folder ──▶ never closed
     │
     ├──▶ workspace A ──▶ /close removes it
     └──▶ workspace B ──▶ /close removes it
  ```

Non-goals: no /abandon (none exists); no change to the background tidy-up of idle workspaces, which closes without a wiki update.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-cleanup`: closing moves from a post-publish option to the `/close` verb: it records facts, distills the session's and change's facts into the wiki, keeps or (on request) discards unpublished work, and closes; the close option is offered after any finished work.
- `delivery-gate`: `/ship` no longer distills facts into the wiki.
- `knowledge-center`: `/close`, not `/ship`, is the catch-up that moves remaining repeatable facts into the wiki.
- `memory`: `/close`, not `/ship`, reads the change's facts.

## Impact

- New `.agents/skills/close/SKILL.md`, and `close` in `core.skillDirs` of `payload-files.json`.
- `.agents/skills/ship/SKILL.md`: the distill section moves to `/close`; Step 6's close option points to `/close`.
- `.agents/skills/routine/scripts/tidy.mjs`: `close --discard`; `scripts/tests/tidy.test.mjs`.
- `.agents/skills/explore/references/asking-the-user.md` (next-step list), `.agents/skills/plan/references/new-workspace.md` (*Next work*), `wiki/development/the-change-loop.md`, `wiki/wiki-style.md`, `wiki/agent-knowledge-center.md`, `wiki/development/memory.md`, `AGENTS.md`, `README.md`, the payload manifest.
- `openspec/specs/`: `workspace-cleanup`, `delivery-gate`, `knowledge-center`, `memory`.
- `CHANGELOG.md` `## Next (minor)` entry; trims elsewhere to stay under the instruction-size baseline and start-up ceiling.

## Decision log

- **2026-09-28** — Asked where the wiki update should live → chose one shared step: `/ship` keeps updating the wiki in the change's pull request, and `/close` runs it only for sessions that never shipped.
- **2026-09-28** — Asked what `/close` does with unpublished work → chose a seamless close with no questions: save the conversation's facts, update the wiki, and close the Paseo workspace.
- **2026-09-28** — Asked when the close question appears → chose at the end of any finished work in a Paseo workspace, never mid-plan or mid-build.
- **2026-09-28** — Assumed: unpublished work is saved as a draft (branch and pull request) for `/continue`, and thrown away only when the person says so, because a seamless close must never lose work and the person answered "seamless", not "discard".
- **2026-09-28** — Assumed: `/close` publishes only wiki edits it wrote itself, and only when nothing else in the workspace is unpublished; otherwise the wiki update waits for the close after that work ships, because publishing the person's unpublished edits would override a publish they declined.
- **2026-09-28** — Assumed: throwing work away skips the wiki update; its facts stay in memory, because the wiki edit would need a second, fresh branch for work that is being deleted.
- **2026-09-28** — Assumed: `/close` replaces today's *Close this workspace* runbook in `new-workspace.md`; the option keeps its label and runs `/close`, because one close path can't drift from another.
- **2026-09-28** — Assumed: in the main checkout or outside Paseo, `/close` does everything but close and says there is no workspace to close, and never throws work away there, because the main checkout never closes.
- **2026-09-28** — Assumed: there is no `/abandon` to remove; a repo search found none.
- **2026-09-28** — Assumed: throwing work away is a `tidy.mjs close --discard` flag, not agent-run git, because deleting work is a repeated destructive step that deterministic code should own.
- **2026-09-28** — Assumed: the change trims instructions elsewhere to stay under the size baseline (144 bytes spare) and the start-up ceiling (1 word spare), as better-drawings did, rather than raising either.
- **2026-09-28** — Asked (review, after the plan was drafted) whether `/close` should own the wiki update instead of `/ship` → chose `/close` only: `/ship` just puts code live, which reverses the earlier answer to keep a shared step.
- **2026-09-28** — Assumed: after a publish, `/close` writes its wiki edits on a fresh branch from the updated main and publishes them as their own small pull request, because the shipped branch is merged and gone.
- **2026-09-28** — Assumed: `/close` reads the change's facts across every session that wrote one, plus its branch and this session, as `/ship` did, so a renamed branch or a change resumed in another workspace loses none.
- **2026-09-28** — Assumed: a workspace closed without `/close` (the background tidy-up, or the Paseo app) gets no wiki update and its facts stay in memory, because the tidy-up runs unattended and must not publish.
- **2026-09-28** — Review note on Change #5 asked what "the main checkout never closes" means → rewrote the bullet in plain words: a Paseo workspace is a copy `/close` can remove, the main folder is the original it never removes, and a chat outside Paseo has no workspace; added a drawing. No behavior change.
- **2026-09-28** — Review note on Change #2 asked where unfinished work is saved as a draft → rewrote it: saved to GitHub on its own branch with an open, unmerged pull request, as `/save` does, and resumed with `/continue` from any computer. Dropped the word "draft", because `/save` opens an ordinary pull request, not a GitHub draft. No behavior change.
- **2026-09-28** — Asked (reply to the build question) that close also cleans up background processes → spelled out what today's close already does, stopping every process still running from the workspace and removing its scratch files, and added closing a browser hand-over link this chat left open.
- **2026-09-28** — Assumed: `/close` leaves the agent's browser and anything else shared across chats running, and closes a hand-over link only when this chat opened it, because the browser and hand-over live in one per-machine folder (`~/.wong-stack/`) that other workspaces use at the same time.

- **2026-09-28** — Asked (reply to the build question) that /close also stores in memory everything the session planned to do → added a wrap-up: the session's goal, what got done, and one open `thread` fact for each planned piece left undone, so the session-start digest and `/continue` surface it.
- **2026-09-28** — Assumed: a piece that finished gets no thread, and a thread this session finished is superseded, because the memory convention supersedes a fact rather than editing it and a finished to-do left open would keep resurfacing.
- **2026-09-28** — Asked (with `/ship`) that /close also saves the transcript to R2 → added: /close uploads the session's redacted transcript to the memory bucket before closing, through a new memory script command, because today the transcript is uploaded only by a later background capture that a closed workspace may never get.
- **2026-09-28** — Assumed: the upload leaves the session uncaptured, so the background run still reads it for facts and re-uploads the final version with the last reply, because the upload happens before `/close`'s own final message.
- **2026-09-28** — Built inside `/ship`: the `/close` skill, `tidy.mjs close --discard`, `memory.mjs keep-transcript`, `/ship`'s distill section removed, and the close offer moved to the next-step list. To stay under the size budget, prose was trimmed across about a dozen skill pages with no change in behavior; the start-up ceiling was not raised. The memory tests went into `memory-capture.test.mjs`, beside the transcript fixtures. Script tests, the context check, and the payload checks pass locally.
- **2026-09-28** — Saved inside `/ship` as PR #189 after merging main (26.25.0 to 26.27.0): `AGENTS.md` takes main's wording plus `/close`, and `CHANGELOG.md` keeps this entry on top. The merge pushed instructions 45 bytes over the baseline, so `close/SKILL.md` was trimmed to fit. CI passed.
- **2026-09-28** — No wiki update at ship: this change moves that step to `/close`, which runs it when this workspace closes.
- **2026-09-28** — Archived at ship as 26.28.0; all tasks done and CI green on the branch.
