---
name: plan
description: Draft a change's plan and review page, or a to-do for work changing no repo file; also takes pasted review notes.
user-invocable: true
---

# /plan

Create an apply-ready OpenSpec change and its required `review.html`, the reviewer's offline page.

**Work that changes no repo file** gets no change, page, or file: after the bounded `/explore` pass, write a short numbered to-do in chat, marking each step that acts outside it `(outward)` ([verbs for any work](../../../wiki/development/the-change-loop.md#verbs-for-any-work)).

## Explore first

Run [`/explore`](../explore/SKILL.md) in bounded mode; it asks by [the exit round](../explore/SKILL.md#the-exit-round). Log each decision in the Decision log: `**YYYY-MM-DD** — Asked <question> → chose <answer>.` for every answer, `**YYYY-MM-DD** — Assumed: <decision>, because <reason>.` for each inferred one.

When the exit round chose new workspaces, [open one per other part](references/new-workspace.md) and report them before drafting; then plan only the part this chat keeps.

Compare your own chat title to the task at initial planning and meaningful scope changes; [update it through Paseo](../../../wiki/development/the-change-loop.md#chats-coordinate-directly).

## Draft with the CLI

Write every artifact in the planning set by [the CLI contract](references/openspec-cli.md#create-or-read-a-change), in the selected root or store. If `/apply` selected an incomplete change, complete that exact change; if planning blocks, report it to `/apply` without implementing.

Before tasks, weigh deterministic code for a repeated process ([the principles](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai)); raise it in the exit round if it changes scope. Testable behavior gets a coverage task; a prose-only change does not.

Write Why and What Changes in [plain words](../explore/references/asking-the-user.md#write-in-plain-words) for the person who asked: what they will see, get, or be able to do. File names, code, and commands go in the design, specs, and tasks, which the page hides. Capabilities and Impact may stay technical.

## Draw in the proposal, then build the page

Draw as you write, with no second agent or browser check. One What Changes bullet carries one drawing by default, plus a sketch of each new or restructured user-facing screen; draw more only where a bullet can not be understood without it. A drawing is a fenced `text` block indented inside its bullet, drawn by [the drawing guide](references/drawings.md) ([what a sketch holds](../../../wiki/ux-principles.md#the-review-file)).

    - **Save goes through one gate.** …
      ```text
      /apply ──▶ archive
                   │
                   ▼
              one /save ──▶ CI
      ```

Build the page after drafting and after each later edit:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/plan/scripts/build-review.mjs" "<change-root>" --require-current
```

It prints a status line, the plan's link line, and the next-step line, to copy as is; [print the plan's link](../explore/references/asking-the-user.md#print-the-plans-link) says when the next-step line goes with it. Fix each drawing it warns about. Keep no other copy of the proposal's text. A clean build proves form, not that a drawing explains its bullet.

A change that adds or restructures a screen gets [a `## UX` design section](../../../wiki/ux-principles.md#the--ux-section-in-designmd); sketch phone work phone-first. UI-less changes omit it.

## Review notes

A message beginning `Notes on the plan <name> from the review page`, or the older `Update the plan <name> with these notes`, is feedback on an existing change: no verb, build, or [explore round](#explore-first). Read artifact paths from `openspec status --change "<name>" --json` ([the CLI contract](references/openspec-cli.md)); when this checkout has no such change, say so and stop. Each bullet names its spot (`Change #2`) and quotes its text; if they disagree, trust the quote. Answer a question note in chat, with no edit or log line, offering any edit it suggests in the closing question. Apply each other note where it belongs, keeping the artifacts coherent, and log one Decision-log line each: what it changed, or why it was declined. Rewrite an artifact substantially by its `openspec instructions <artifact-id> --change "<name>" --json`, then validate. Create no artifact the notes did not ask for. Rebuild the page. Then [finish](#finish) as a standalone `/plan`; never start building from the notes.

## Finish

Group tasks by surface in the CLI's checkbox template; a task needing CI or a deployed preview names `/save` to complete it. Validate with `openspec validate "<name>" --strict --no-interactive`; confirm the review page exists and every apply-required artifact is complete. Print [the plan's link](../explore/references/asking-the-user.md#print-the-plans-link), *Click here to see the plan:*, however `/plan` was invoked. Standalone, sum up the plan in a few plain lines above it and stop, ending with [the next step for a finished plan](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step). Invoked by `/apply`, return the exact change name and let `/apply` implement it.
