---
name: plan
description: Draft an OpenSpec change — proposal, artifacts, tasks, and a review page with text drawings — or a short to-do for work that changes no repo file. Use before implementation when a change needs a plan or a review, and when someone pastes notes from a plan's review page.
user-invocable: true
---

# /plan

Create an apply-ready OpenSpec change and its required `review.html`, the reviewer's offline page.

**Work that changes no repo file** gets no change and no page: after the bounded `/explore` pass, write a short numbered to-do in the conversation, marking each step that acts outside it `(outward)`. Write no file.

## Explore first

Invoke [`/explore`](../explore/SKILL.md) in bounded mode; [its exit round](../explore/SKILL.md#the-exit-round) is this plan's only question round. Log each decision as a Decision-log bullet: `**YYYY-MM-DD** — Asked <question> → chose <answer>.` for every earlier answer and the exit round, `**YYYY-MM-DD** — Assumed: <decision>, because <reason>.` for each inferred one.

When the exit round chose new workspaces, open one for each other part by [open a part in a new workspace](references/new-workspace.md) before drafting, report them, then plan only the part this chat keeps.

## Draft with the CLI

Follow the [CLI contract](references/openspec-cli.md#create-or-read-a-change) in the selected root or store: run `openspec new change "<name>"` only when needed; then, for each ready artifact in the transitive `applyRequires` set, apply `openspec instructions <id> --change "<name>" --json` and recheck status. Never mark a tasks file ready while its dependencies are absent. If `/apply` selected an incomplete change, complete that exact change; if planning blocks, report it to `/apply` without implementing.

Before tasks, weigh deterministic code for a repeated process, by [the principles](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai); raise it in the exit round if it changes scope. Testable behavior gets a coverage task; a prose-only change does not.

Write Why and What Changes for the person who asked, in [plain words](../explore/references/asking-the-user.md#write-in-plain-words): what they will see, get, or be able to do. Put file names, code, and commands in the design, specs, and tasks, which the page does not show. Capabilities and Impact may stay technical.

## Draw in the proposal, then build the page

Draw as you write; no second agent, no browser check. One What Changes bullet carries one drawing by default, plus a sketch of each new or restructured user-facing screen; draw more only where a bullet can not be understood without it. A drawing is a fenced `text` block indented inside its bullet, in plain characters, read top to bottom, about 40 columns wide for a phone.

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

It prints a status line, the plan's link line, and the next-step line, ready to copy as printed; [print the plan's link](../explore/references/asking-the-user.md#print-the-plans-link) says when the next-step line goes with it. Shorten any drawing line it warns is over 60 columns. Keep no other copy of the proposal's text. A clean build proves form, not that a drawing explains its bullet.

For screens, add a `## UX` design section: brief, flow, hierarchy, components, and a `### Review` subsection linking `review.html` and naming the items sketching each screen. Sketch phone work phone-first. UI-less changes omit it.

## Review notes

A message beginning `Update the plan <name> with these notes from the review page` is feedback on an existing change: no verb, no build. Skip [the explore round](#explore-first). Read artifact paths from `openspec status --change "<name>" --json`, by the [CLI contract](references/openspec-cli.md); when this checkout has no such change, say so and stop. Each bullet names its spot (`Change #2`) and quotes its text; when they disagree, go by the quote. Apply each note where it belongs, keep the artifacts coherent, and append one Decision-log line per note: what it changed, or why it was declined. For a substantial rewrite, use `openspec instructions <artifact-id> --change "<name>" --json`, then validate. Rebuild the page. Create no artifact the notes did not ask for. Then [finish](#finish) as a standalone `/plan`. Never start building from the notes.

## Finish

Group tasks by surface, in the CLI's checkbox template; a task needing CI or a deployed preview names `/save` to complete it. Validate with `openspec validate "<name>" --strict --no-interactive`; confirm the review page exists and every apply-required artifact is complete. Print [the plan's link](../explore/references/asking-the-user.md#print-the-plans-link) however `/plan` was invoked. Standalone, give the plan in a few plain lines above it and stop, ending with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): *Build it now (Recommended)*, *Review the plan*, or *Stop here*. Invoked by `/apply`, return the exact change name and let `/apply` implement it.
