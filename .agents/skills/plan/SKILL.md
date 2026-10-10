---
name: plan
description: Draft a change's plan and review page, or a to-do for work changing no repo file; also takes pasted review notes.
user-invocable: true
---

# /plan

**Selected schedule:** [route its record](../save/references/schedule-records.md) before code or checkout; preserve its store and pending question.

Create an apply-ready OpenSpec change and its required `review.html`, the offline review page.

**Work that changes no repo file** gets no change, page, or file: after the bounded `/explore` pass, write a short numbered to-do in chat, marking each step that acts outside it `(outward)` ([verbs for any work](../../../wiki/development/the-change-loop.md#verbs-for-any-work)).

## Explore first

Run [`/explore`](../explore/SKILL.md) in bounded mode; it asks by [the exit round](../explore/SKILL.md#the-exit-round). Log each decision in the Decision log: `**YYYY-MM-DD** — Asked <question> → chose <answer>.` for every answer, `**YYYY-MM-DD** — Assumed: <decision>, because <reason>.` for each inferred one.

When the exit round chose new workspaces, [open one per other part](references/new-workspace.md) and report them before drafting; then plan only the part this chat keeps.

## Draft with the CLI

Write every artifact in the planning set by [the CLI contract](references/openspec-cli.md#create-or-read-a-change), in the selected root or store. If `/apply` selected an incomplete change, complete that exact change; if planning blocks, report it to `/apply` without implementing.

Before tasks, weigh deterministic code for a repeated process ([the principles](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai)); raise it in the exit round if it changes scope. Testable behavior gets test authoring beside source tasks; prose-only changes do not.

Write Why and What Changes in [plain words](../explore/references/asking-the-user.md#write-in-plain-words) for the person who asked: what they will see, get, or be able to do. When the change deletes or reshapes data, sends a message, or removes a key, one plain What Changes line says it can't be undone; otherwise none. File names, code, and commands go in the design, specs, and tasks, which the page hides. Capabilities and Impact may stay technical.

## Draw in the proposal, then build the page

Draw as you write, with no second agent or browser. One What Changes bullet carries one drawing by default, plus a sketch of each new or restructured user-facing screen; draw more only where a bullet can not be understood without it. A drawing is a fenced `text` block indented inside its bullet, drawn by [the drawing guide](references/drawings.md) ([what a sketch holds](../../../wiki/ux-principles.md#the-review-file)).

    - **Save goes through one gate.** …
      ```text
      /apply ──▶ archive
                   │
                   ▼
              one /save ──▶ CI
      ```

Build the page after drafting and after each later edit:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/plan/scripts/build-review.mjs" "<change-root>" --require-current --link
```

It prints a status line, the plan's link line, and the next-step line, to copy as is; [print the plan's link](../explore/references/asking-the-user.md#print-the-plans-link) says when the next-step line goes. `--link` makes the link [a reply link](../../../wiki/development/reply-links.md) where one opens. Fix warned drawings. Keep no other copy of the proposal's text.

A change that adds or restructures a screen gets [a `## UX` design section](../../../wiki/ux-principles.md#the--ux-section-in-designmd); sketch phone work phone-first. UI-less changes omit it.

## Review notes

`Notes on the plan <name> from the review page` (also `Update the plan <name> with these notes`) pasted or sent from the page, updates a plan without a verb, build or [explore round](#explore-first). Get paths from `openspec status --change "<name>" --json` ([contract](references/openspec-cli.md)); missing change: report and stop. Trust each quoted text over its spot label. Answer question notes in chat without edits/log entries; offer suggested edits in the closing question. Apply other notes coherently, logging each change or reason for declining. Substantial rewrites follow CLI instructions; validate, create only requested artifacts, rebuild the page and [finish](#finish) standalone. Notes never start a build.

## Finish

Group source and test authoring by surface; complete all implementation before automatic tests or remote checks. Source review completes implementation boxes, not passing tests. Put required checks in a final verification phase, not per-part `/save` tasks. A substantive deployed acceptance task names `/save` after implementation; unavailable prerequisites remain blockers. Explicit early requests retain their reach. Validate with `openspec validate "<name>" --strict --no-interactive`; confirm the review page exists and every apply-required artifact is complete. Print [the plan's link](../explore/references/asking-the-user.md#print-the-plans-link) however `/plan` was invoked. Standalone, sum up the plan in a few plain lines above it and stop, ending with [the next step for a finished plan](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step). Invoked by `/apply`, return the exact change name and let `/apply` implement it.
