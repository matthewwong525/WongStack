# Design

## Context

A read-only audit on 2026-09-27 compared the change-loop skills, `wiki/development/the-change-loop.md`, the `WONG-STACK` block, and the specs after the 25.0–26.1 releases. See proposal.md — Why. Every fix here is Markdown in skills, wiki, and specs; no script changes.

## Goals / Non-Goals

**Goals:** each entry point to publishing does one save and one CI run; no route leaves a file edit with no next step; a typed verb stops where the loop page says it stops; the skill text, wiki, and specs agree.

**Non-Goals:** release numbering, `merge.sh`, and `tag-releases.mjs` (workspace *Release collisions*); stale stack pages, spec thinning, and check coverage (workspace *Docs, specs, and checks cleanup*). The `multi-part-workspaces` spec is left to that workspace.

## Decisions

- **`/ship` Step 1, dirty default branch → Step 2 in place.** Replace the bullet at `ship/SKILL.md:25` with the post-pull-in rule: go to Step 2 in the same tree; Step 3's save cuts the branch. The preflight's default-branch CI check still runs first. *Alternative:* keep the early save and skip Step 3's. Rejected, because the archive must ride in the gated commit.
- **`/ship` Step 2, code with no change → author it.** Where Step 2 now stops ("code or a plan for code → stop"), load `save/references/new-plan.md` and author the change from the session and the diff, then select it as `explicit` and continue: task check, validate, archive. The unchecked-task rule still applies, so a guessed plan with open tasks goes through `/apply`. This covers what the early save used to do on `main`. *Alternative:* invoke `/save` there. Rejected: that commits and pushes before the archive, bringing back the double checkpoint.
- **Distillation on the default branch.** When `BRANCH` is the default branch (the dirty-main and pull-in paths), run only `memory.mjs show "$CHANGE_NAME"`, and skip `search --branch`, which would return every fact saved on `main`. With no change, the distillation is already skipped.
- **The plan link in `/save`.** §5 prints the link when the save changed the proposal's plan sections or `tasks.md`, not for Status, Branch, Open questions, or Decision-log lines. `asking-the-user.md`'s one-link bullet says the plan's link line is apart from that one link, so `/ship`'s archived-plan link and `/apply`'s plan-then-build line keep working.
- **Standalone `/explore` ends with a question.** The exit-round section's "Then hand off to `/plan`" becomes a split. In bounded mode it returns to `/plan`, as now. Standalone, it summarizes and ends with the next step: *Plan it (Recommended)* / *Keep thinking* / *Stop*. On *Plan it*, invoke `/plan`; its bounded pass sees the exit round done and asks nothing. Add this to `asking-the-user.md`'s next-step list. `explore/SKILL.md:11` "always runs before `/plan`" gains "except review-page notes". The same exception goes in the change-loop page's steps list.
- **Plain request that edits a file.** One sentence in the `WONG-STACK` block's plain-request rule and in the change-loop page's opening paragraph: a plain request that edited a repo file ends by asking *publish it?* *(Recommended)* via `/ship`, or *leave it unsaved*. Nothing else changes, because `/ship` already merges work that needed no change. *Just ask* step 2 drops "just does the task and reports" for "says so and still asks *publish it?*".
- **`/continue` read-only.** Step 3's "resume read-only here" option and the failed-checkout bullet both lead to a new Step 4 branch: recap, then the next-step question (new workspace *(Recommended)* when `paseo` exists, `/save` the current work first, or stop). Step 4's "Otherwise → invoke `/apply`" applies only after a real checkout, or when no branch exists yet.
- **Busy workspace in `new-workspace.md`.** Under *Ask once*, add a second option block for "a new change asked for where another is unpublished": *Open it in a new workspace (Recommended)* / *Publish the work here first, then start it here*. On the first, `/plan` opens the workspace, reports it, and stops, drafting nothing here. Without `paseo`, only the second option remains, plus the person's own answer.
- **Store line in the build helper.** `apply/SKILL.md`'s helper prompt gains an optional third line, `store <id>`, when a store was selected. `build-helper.md` step 1 passes `--store <id>` when that line is present.
- **`asking-the-user.md`'s authorized handoffs.** "`/apply` into `/save`" becomes "`/apply` into `/save` for a task that needs the gate".

## Risks / Trade-offs

- [Authoring a plan inside `/ship` from a diff alone, with a cold session] → `new-plan.md` already asks when intent cannot be resolved. Its tasks record true state, and any unchecked one goes through `/apply` before the archive.
- [Archiving on `main`'s working tree before any branch exists] → `openspec archive` only moves files. Step 3's `/save` cuts the branch and stages the archive with the code, as the pull-in path already does.
- [Part 2 changes how VERSION is set] → this change bumps VERSION by today's rule. If *Release collisions* publishes first, rebase onto its `## Next` convention at publish.
- [Fewer plan links after saves could bring back "I can't find the plan"] → the link still prints whenever plan content changes, and `/ship`'s report keeps the archived plan's link.
