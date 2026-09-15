# Bare `/ship` continues the thread

**Status:** ready-to-ship
**Open questions:** none

## Why

The loop has one rule — *a verb whose precondition is missing invokes the verb before it*. `/ship` is the only place it is suspended: on a clean branch, bare `/ship` stops even when the conversation just explored and agreed what to build. The user has to retype, as an argument, the intent they settled a minute ago.

The guard that causes it was written against a **cold** bare `/ship`, where inferring intent means grabbing whatever `openspec list` happens to show. A **warm** one is different: the intent is in the conversation, and `/apply` already knows how to read it. Two open threads record the gap — `notes/remove-improve-dream.md:11` (clean branch after `/explore`) and `notes/add-html-wireframes.md:86` (a branch whose change is planned but unimplemented).

The second thread is a safety hole, not a convenience gap. `openspec-archive-change` warns on incomplete tasks **and asks the user to confirm** — but `/ship`'s opening line authorizes the archive and says *don't re-prompt*, which answers that confirmation before it is asked. A change at 7 of 20 tasks archives and squash-merges with nobody deciding to.

## What Changes

- **Bare `/ship` pulls in `/apply` when the work resolves to something other than a stray entry.** On a clean branch or on the default branch with nothing to ship, `/ship` invokes `/apply` with no argument whenever `/apply`'s resolve order lands on items 1–3 — a change the user named, a change created or discussed this session, or an active change whose name matches the current branch — or when no change exists yet and the session states clear implementation intent. (review.html#/pull-in/after/chain)
- **Cold bare `/ship` keeps today's stop, unchanged.** Where resolution would fall through to item 4 (a sole active change) or to "unclear", `/ship` stops and says so. A stray `openspec list` entry must never start a merge. (review.html#/pull-in/after/cold)
- **An incomplete task list pulls in `/apply` instead of archiving.** A new Step 2 guard reads `tasks.md` before the archive: a change with unchecked tasks is finished first. `/ship`'s blanket authorization stops covering the archive step's incomplete-task confirmation. (review.html#/archive-guard/after/guard)
- **`/ship` reports when it cannot resolve** — it never silently does nothing. (review.html#/pull-in/after/report)
- **The change loop page and `CLAUDE.md` state the rule without the argument carve-out**, so the nesting `/ship → /apply → /plan → /explore` reads as one uniform rule. (review.html#/docs-rule/rewritten)
- **Five files edited, none added or removed** — the two rule pages, `CLAUDE.md`, and the release pair. (review.html#/files)

**Non-goals:** no change to `/apply`'s resolve order, to the two-checkpoint contract, to the gate ladder, or to `/verify`; no new flag or verb; no auto-merge from a cold session.

**Cut from #80** (`6943d84`, v14.0.1), which merged while this was being planned. It already fixes the `openspec/config.yaml` parse error found while scaffolding this change, so that fix is **out of scope here**. The only files both touch are `VERSION` and `CHANGELOG.md`, and this branch now starts from the merged state — no conflict remains.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ship-full-cycle`: the pull-in is no longer conditioned on an argument. The "Bare ship on the default branch" scenario is replaced by a conversation-establishes test, a cold-session stop, and a new requirement that an incomplete change is completed rather than archived.

## Impact

- `.agents/skills/ship/SKILL.md` (reached as `.claude/skills/…`, a symlink) — Step 1 stop conditions, "The pull-in" section, a new Step 2 guard, Hard rules.
- `wiki/development/the-change-loop.md` — the `/ship` bullet and the enter-anywhere paragraph.
- `CLAUDE.md` — the verbs rule loses `<intent>`.
- `VERSION` → `14.1.0` (from #80's `14.0.1`); `CHANGELOG.md` — newest-first entry.
- Payload release: the [payload rule](../../../.agents/rules/payload.md) applies, so both release checks run with the bump — `check-payload-links.mjs` and #80's new `check-openspec-config.mjs`.
- No app code, no test surface, no UI screen: the payload here is prose.

## Decision log

- **2026-09-15** — Planned and implemented in one session. `/ship` now pulls in `/apply` on a bare invocation too; the test is which item of `/apply`'s written resolve order applies, so the resolver stays in one place. **Chosen over** full parity (bare `/ship` always chaining), which would let item 4's sole-active-change fallback start a merge from a cold session — the concrete counterexample is the `improve-openspec-plans` scaffold that sat active in this repo for days. **Also ruled out:** a second resolver inside `/ship` (two resolvers drift), and confirming the inferred intent (restores the tap the user asked to remove; `/explore`'s exit round already asked).
- **2026-09-15** — The critic pass caught two factual errors in the first draft, both corrected here and in `design.md`: `/apply`'s resolve-order item 3 is *an active change whose name matches the current branch*, not "an explicit implementation request" — which matters because item 3 is exactly what covers the planned-but-unimplemented change of `notes/add-html-wireframes.md:86`. And `openspec-archive-change` does not merely warn on unchecked tasks: it warns **and asks the user to confirm**. The hole is therefore `/ship`'s own standing authorization ("don't re-prompt") answering that question, not a defect in the generated skill — so the fix narrows the authorization and adds the guard, and the generated skill stays pristine.
- **2026-09-15** — The `openspec/config.yaml` parse error found while scaffolding was **dropped from scope**: PR #80 (`6943d84`, v14.0.1) already fixed it and added `scripts/check-openspec-config.mjs`. This branch was cut from that merge, so the bump runs `14.0.1` → `14.1.0` and no file conflicts.
- **2026-09-15** — Implemented 15/15 tasks. Both release checks pass. Five files edited, none added or removed: `.agents/skills/ship/SKILL.md`, `AGENTS.md`, `CHANGELOG.md`, `VERSION`, `wiki/development/the-change-loop.md`. Note that `CLAUDE.md` → `AGENTS.md` and `.claude/` → `.agents/` are symlinks, so `review.html#/files` names the link and git reports the target — the same five files either way.
- **2026-09-15** — Archived by `/ship`. Delta specs were already folded into `openspec/specs/ship-full-cycle/` by the completion `/save`, and the archive step verified every operation present (old requirement name absent, new name and the added requirement present, preserved scenarios intact) before moving the folder. Checkpointed on PR #81 with CI green.
