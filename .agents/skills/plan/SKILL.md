---
name: plan
description: Draft a change's plan and review page, or a to-do for work changing no repo file; also takes pasted review notes.
user-invocable: true
---

# /plan

Create an apply-ready OpenSpec change and its `review.html` page. First run `node .claude/skills/explore/scripts/step-title.mjs set PLAN`.

**Change only plans and wiki pages**, and save a schedule to the app [after an OK](../schedule/SKILL.md); code waits for the person's go ([limits](../../../wiki/development/the-change-loop.md#what-each-step-may-change)).

**Work that changes no repo file** gets no change, page, or file: after the bounded `/explore` pass, write a short numbered to-do in chat, marking each step that acts outside it `(outward)` ([verbs for any work](../../../wiki/development/the-change-loop.md#verbs-for-any-work)).

## Explore first

Run [`/explore`](../explore/SKILL.md) in bounded mode; it asks by [the exit round](../explore/SKILL.md#the-exit-round). Log each decision in the Decision log: `**YYYY-MM-DD** — Asked <question> → chose <answer>.` for every answer, `**YYYY-MM-DD** — Assumed: <decision>, because <reason>.` for each inferred one.

New workspaces chosen → [open one per other part](references/new-workspace.md), report before drafting, and plan only this chat’s part.

## Draft with the CLI

Write every artifact in the planning set by [the CLI contract](references/openspec-cli.md#create-or-read-a-change), in the selected root or store. Complete in place an incomplete change `/apply` selected; a block goes back to `/apply`, unbuilt.

Before tasks, weigh deterministic code for a repeated process ([the principles](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai)); raise it in the exit round if it changes scope. Testable behavior, not prose, gets test authoring beside source tasks.

Why and What Changes use [plain words](../explore/references/asking-the-user.md#write-in-plain-words): what the person will see or do. Deleting/reshaping data, sending a message, or removing a key gets one line: it can't be undone; otherwise none. Put file names, code and commands in design/specs/tasks, hidden on the page. Capabilities and Impact may be technical.

## Draw in the proposal, then build the page

Draw as you write, with no second agent: one drawing per What Changes bullet by default, as a fence indented in its bullet by [the drawing guide](references/drawings.md). A card shows [the closest real result](../../../wiki/review-pages.md#a-card-shows-the-closest-real-result): a screen change gets [a prototype](../../../wiki/review-pages.md#the-prototype), a site this app doesn't run [a live one](../../../wiki/review-pages.md#a-website-prototype); notes update it too. Every plan lists [what the build needs](../../../wiki/review-pages.md#what-the-build-needs).

Build the page after drafting and each edit:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/plan/scripts/build-review.mjs" "<change-root>" --require-current --link
```

Copy its status, plan copy, link, and review lines as printed; [print the plan's link](../explore/references/asking-the-user.md#print-the-plans-link) says when the last goes. Fix warned drawings. Keep no other copy of the proposal's text: a second copy goes stale.

A change that adds or restructures a screen gets [a `## UX` design section](../../../wiki/ux-principles.md#the--ux-section-in-designmd); sketch phone work phone-first.

## Review notes

`Notes on the plan <name> from the review page` (also `Update the plan <name> with these notes`) updates its existing plan without an [explore round](#explore-first). A chat message about a waiting plan is handled the same way, after a bounded explore pass on only what it opens. Get paths from `openspec status --change "<name>" --json` ([contract](references/openspec-cli.md)); a missing change → report and stop. Trust quoted text over spot labels.

- **A question note** gets an answer, no edit or log entry; offer suggested edits only when standalone.
- **A change note** is applied coherently, each change or decline logged; validate, create only requested artifacts, rebuild and print the page's link.
- **Notes alone** [finish](#finish) without building. Sent with an explicit build or publish choice, they return to `/apply` or `/ship`, which goes on unasked: the person already chose. A material blocker stops.

## Finish

Lay out tasks so the build is written before it is checked ([why](../../../wiki/development/the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task)): group source and test authoring by surface, and put required checks in one final phase, not per-part `/save` tasks. A substantive deployed acceptance task names `/save` after implementation.

Run `step-title.mjs set PLAN --task "<proposal title>"`. Validate with `openspec validate "<name>" --strict --no-interactive`; confirm the review page and every apply-required artifact are complete. Standalone, end on [the plan's copy, link, and review line](../explore/references/asking-the-user.md#print-the-plans-link), asking nothing. Invoked by `/apply`, return the exact change name to it.
