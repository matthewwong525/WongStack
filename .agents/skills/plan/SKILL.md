---
name: plan
description: Draft a change's plan and review page, or a to-do for work changing no repo file; also takes pasted review notes.
user-invocable: true
---

# /plan

**Selected schedule:** [route its record](../save/references/schedule-records.md) before code or checkout.

Create an apply-ready OpenSpec change and its required `review.html`, the offline review page.

**Work that changes no repo file** gets no change, page, or file: after the bounded `/explore` pass, write a short numbered to-do in chat, marking each step that acts outside it `(outward)` ([verbs for any work](../../../wiki/development/the-change-loop.md#verbs-for-any-work)).

## Explore first

Run [`/explore`](../explore/SKILL.md) in bounded mode; it asks by [the exit round](../explore/SKILL.md#the-exit-round). Log each decision in the Decision log: `**YYYY-MM-DD** — Asked <question> → chose <answer>.` for every answer, `**YYYY-MM-DD** — Assumed: <decision>, because <reason>.` for each inferred one.

New workspaces chosen → [open one per other part](references/new-workspace.md), report before drafting, and plan only this chat’s part.

## Draft with the CLI

Write every artifact in the planning set by [the CLI contract](references/openspec-cli.md#create-or-read-a-change), in the selected root or store. If `/apply` selected an incomplete change, complete that exact change; if planning blocks, report it to `/apply` without implementing.

Before tasks, weigh deterministic code for a repeated process ([the principles](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai)); raise it in the exit round if it changes scope. Testable behavior gets test authoring beside source tasks; prose-only changes do not.

Why and What Changes use [plain words](../explore/references/asking-the-user.md#write-in-plain-words): what the person will see or do. Deleting/reshaping data, sending a message, or removing a key gets one line saying it can't be undone; otherwise none. Put file names, code and commands in design/specs/tasks, hidden on the page. Capabilities and Impact may be technical.

## Draw in the proposal, then build the page

Draw as you write, with no second agent or browser: one drawing per What Changes bullet by default, plus a sketch of each new or restructured user-facing screen; more only where a bullet needs it. A drawing is a fence indented inside its bullet, by [the drawing guide](references/drawings.md): `mermaid` for a flow, `screen` for a screen, `svg` for arrows, a Markdown table for a table.

    - **Save goes through one gate.** …
      ```mermaid
      flowchart LR
        apply["/apply"] --> archive --> save["one /save"] --> CI
      ```

Build the page after drafting and after each later edit:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/plan/scripts/build-review.mjs" "<change-root>" --require-current --link
```

Copy its status, link, and review lines as printed; [print the plan's link](../explore/references/asking-the-user.md#print-the-plans-link) says when the last goes. `--link` makes the link [a reply link](../../../wiki/development/reply-links.md) where one opens. Fix warned drawings. Keep no other copy of the proposal's text: a second copy goes stale.

A change that adds or restructures a screen gets [a `## UX` design section](../../../wiki/ux-principles.md#the--ux-section-in-designmd); sketch phone work phone-first. UI-less changes omit it.

## Review notes

`Notes on the plan <name> from the review page` (also `Update the plan <name> with these notes`) updates its existing plan without an [explore round](#explore-first). A chat message about a waiting plan is handled the same way, after a bounded explore pass on only what it opens. Get paths from `openspec status --change "<name>" --json` ([contract](references/openspec-cli.md)); a missing change → report and stop. Trust quoted text over spot labels.

- **A question note** gets an answer, with no edit or log entry; offer suggested edits only when standalone.
- **A change note** is applied coherently, each change or decline logged. Substantial rewrites follow CLI instructions; validate, create only requested artifacts, rebuild and print the page's link.
- **Notes alone** [finish](#finish) without building. Sent with an explicit build or publish choice, they return to `/apply` or `/ship`, which goes on unasked: the person already chose. A material blocker stops.

## Finish

Lay out tasks so the build is written before it is checked ([why](../../../wiki/development/the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task)): group source and test authoring by surface, and put required checks in one final verification phase, not per-part `/save` tasks. Source review completes implementation boxes, not passing tests. A substantive deployed acceptance task names `/save` after implementation.

Validate with `openspec validate "<name>" --strict --no-interactive`; confirm the review page exists and every apply-required artifact is complete. Standalone, sum up the plan in a few plain lines, then end on [the plan's link and review line](../explore/references/asking-the-user.md#print-the-plans-link), asking nothing. Invoked by `/apply`, return the exact change name and let `/apply` implement it.
