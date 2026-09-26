---
name: plan
description: Draft an OpenSpec change with a proposal, required artifacts, tasks, and a standalone review page with text drawings, or write a short to-do for work that changes no repo file. Use before implementation when a change needs a plan or a review.
user-invocable: true
---

# /plan

Create an apply-ready OpenSpec change and its required `review.html`. The page is the main human review surface: one scrolling document with Why, the What Changes items with their text drawings, and the decisions labeled *asked* or *assumed*. It works offline, on a phone; the reviewer taps an item to add a note and copies the notes into `/continue`.

**Work that changes no repo file** — research, an errand, a message — gets no OpenSpec change and no page. Run the bounded `/explore` pass below, then write a short numbered to-do in the conversation and mark each step that acts outside it `(outward)`. Write no file.

## Explore first

Invoke [`/explore`](../explore/SKILL.md) in bounded mode. Read prior answers and investigate only gaps. The exit round may ask at most one final group for this transition; a completed exit round cannot be repeated. Once settled, fill cheap details with recorded assumptions and ask nothing more during this plan. Record each decision as its own Decision-log bullet: `**YYYY-MM-DD** — Asked <question> → chose <answer>.` for every earlier answer and the exit round, and `**YYYY-MM-DD** — Assumed: <decision>, because <reason>.` for each inferred one. The review page labels a bullet by its first word.

## Draft with the CLI

Follow the shared [CLI contract](references/openspec-cli.md): select the root or requested store, create a change with `openspec new change "<name>"` only when needed, and read `openspec status --change "<name>" --json`. For each ready artifact in the transitive `applyRequires` set, read `openspec instructions <id> --change "<name>" --json`, apply its template and rules, then recheck status. Read dependency files from disk. Honor conditional skips and `skip_specs` when the artifact's instruction allows them. Do not mark an existing tasks file ready while its dependencies are absent.

If `/apply` selected an incomplete change, complete that exact change rather than creating another. If planning blocks, report it to `/apply` without beginning implementation. A standalone `/plan` stops for review after producing and validating the artifacts.

Before tasks, decide whether a repeated process belongs in deterministic code. Use the judgment in [`agent-knowledge-center.md`](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai). A change to testable behavior gets a coverage task beside the related implementation; a prose-only change does not.

## Draw in the proposal, then build the page

Draw while you write the bullet; there is no second agent and no browser check. By default, one What Changes bullet carries one drawing: the flow, diff, file tree, or screen that makes the change clear. Sketch each new or restructured user-facing screen. Add a further drawing only where a bullet can not be understood without one; the other bullets stay text.

A drawing is a fenced `text` block indented inside its bullet, in plain characters. Read it top to bottom, and keep it about 40 columns wide: the reviewer is often on a phone, and the page fits a drawing to the screen before they zoom in.

    - **Save goes through one gate.** …
      ```text
      /apply ──▶ archive
                   │
                   ▼
              one /save ──▶ CI
      ```

Build the page once the proposal is drafted, and again after any later edit to it:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/plan/scripts/build-review.mjs" "<change-root>" --require-current
```

The builder reads the proposal directly and writes a standalone page from the fixed kit; do not keep another copy of Why, What Changes, or the drawings. It stops on a missing section or an unclosed fence, and warns about a drawing line wider than 60 columns: shorten that line. A clean build proves the page is well formed, not that a drawing explains its bullet; the reviewer's notes do that.

For screens, add a `## UX` design section with a brief, flow, hierarchy, components, and a `### Review` subsection that links `review.html` and names the items that sketch each screen. Sketch phone work phone-first. UI-less changes omit this section.

## Finish

Write tasks grouped by the surface they touch, following the CLI's checkbox template. A task needing CI or a deployed preview names `/save` as its means of completion. Validate with `openspec validate "<name>" --strict --no-interactive`. Confirm the review page exists and all apply-required artifacts are complete. Standalone `/plan` presents the page and stops, ending with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step) — implement it now *(Recommended)*, revise the plan first, or stop here. When invoked by `/apply`, return the exact change name and let `/apply` implement it.
