# Design

## Context

The loop plugin (`.agents/plugins/loop/`) installs into any project, with or without memory. Today five of its files call `.claude/skills/memory/scripts/memory.mjs` or link `../../../memory/…`: `explore/SKILL.md` (search before asking, bounded step 2), `continue/SKILL.md` (thread menu, `pull <name>`, session-context recap), `plan/references/new-workspace.md` (next-work search, unattended thread write), `close/SKILL.md` (wiki step through `wiki-dream.md`), and `save/SKILL.md` (memory-capture line). The memory plugin already covers each job by itself: its SessionStart hook prints a digest with open threads by step and the recall/pull instruction, its UserPromptSubmit hook (`topic-match.mjs`) adds topic facts, its SessionEnd hook records the chat, and its daily tidy places facts on wiki pages.

`/save`'s scripts are shared by `/apply`, `/ship` (`ship.mjs` imports `save/scripts/checkpoint*.mjs`, `merge.sh` calls `delivery-route.mjs`), `/verify` (`saved-revision.mjs`), and `/close`. `/continue` owns `pickup.mjs`, which `.agents/daily/profile.mjs` and the workspace script's `--checkout --reviewed` path also rely on.

## Goals / Non-Goals

**Goals:**
- No file under `.agents/plugins/loop/` names `memory.mjs`, `.claude/skills/memory`, or a path into `.agents/plugins/memory/`.
- Seven typed commands; saving and pick-up keep every safety they have today.
- Installs drop `/continue` cleanly on update.

**Non-Goals:**
- Browser, daily and access shape and links; loop docs that link WongStack's own `wiki/` pages (two other workspaces).
- `/verify`'s knowledge of the `memory-areas-pilot-1` receipt format (`verify-receipts.mjs`, `ci-evidence.md`): it reads a repo file, not the memory store.
- The AGENTS.md *offer a routine* rule that searches memory: it is a project rule, not loop text.

## Decisions

1. **`/save` stays a typed command**, at its folder, unchanged but for its memory line. The person asked to keep it for those who want it.
2. **Fold `/continue` into `/apply`.** `git mv continue/scripts/pickup.mjs apply/scripts/pickup.mjs` (fix its `../../../scripts/lib/cli.mjs` import depth if it changes; it does not). Steps 2–4 of `continue/SKILL.md`, minus memory, become `apply/references/pick-up.md`: resolve the change or PR to a branch, switch only through `pickup.mjs` (exits 0/2/3/4 as today), recap from the proposal, Decision log, and drift counts. `apply/SKILL.md`'s "Resolve the plan first" gains one rung: a named change or PR whose branch isn't checked out here → follow `pick-up.md`, then build unless the switch needed a review. No change named and none in this chat → list `openspec list` plus `otherWork`'s saved branches and ask (the old menu, minus threads). Delete `continue/`.
3. **`/close` loses its wiki section.** Routes stay: discard, keep (run the save skill), wrap (nothing to do). Report names the saved-work link or discard, then the close result. `wiki-style.md`'s "`/close` catches what a session missed" becomes memory's daily tidy and `/dream-memory`.
4. **`/explore` drops "Search memory before asking"** and bounded step 2 reads "Check other work unless checked". The memory digest already says *recall the task before substantial work*; that line is memory's.
5. **`new-workspace.md`**: "Next work" looks in this conversation only; the unattended case names the other parts in its report (memory's end-of-chat capture keeps them as threads where installed). Its `/continue` mentions point at `/apply`'s pick-up.
6. **`save/SKILL.md`** "Work that changed no repo file → there is nothing to save in the repo; say so and stop." PR body footer: "pick it up with `/apply <name>`".
7. **Rename touchpoints.** `.agents/daily/profile.mjs` imports `../skills/apply/scripts/pickup.mjs`. `.agents/memory/profile.mjs` drops the `continue` step tag; `areas.json`'s `continue` area points at `apply/scripts/pickup.mjs` and `apply/references/pick-up.md`. `payload-files.json` drops the `continue` mapping. `scripts/retired-names.json` retires `` `/continue `` → `` `/apply <name>` `` and `skills/continue/` → `skills/apply/`, exempting the browser key-link route `'/continue'` (a different thing, without a backtick). `.agents/loop/step-title.mjs` and its test drop `/continue`.
8. **Context budget.** Net words fall (continue's 894 words go; pick-up.md takes ~500). Re-record `scripts/fixtures/context-baseline.json` with `measure-context.mjs` as the repo does for a removal.
9. **Release:** `major`. Updating note: *`/continue` is gone: type `/apply <name>` to pick up saved work. Delete the `.claude/skills/continue` folder if the update leaves it* (wong-sync copies mapped folders and does not delete a folder the payload dropped).

## Risks / Trade-offs

- **People who type `/continue` from habit** get the host's unknown-command reply. Asking in words (*pick up add-auth*) still works. Mitigation: the changelog's Updating note, `first-day/make-a-change.md`, and the loop README say the new way.
- **Errands lose a menu** in projects without memory → accepted: they had none before either (`/continue` only listed threads with memory).
- **Concurrent edits** to `the-change-loop.md` and loop docs from the *Plugin docs stand alone* workspace → whichever publishes second rebases.
