---
name: plan
description: Draft an OpenSpec change with a proposal, required artifacts, tasks, and a standalone review page with text drawings, or write a short to-do for work that changes no repo file. Use before implementation when a change needs a plan or a review.
user-invocable: true
---

# /plan

Create an apply-ready OpenSpec change and its required `review.html`. The page is the main human review surface: one scrolling document with Why, the What Changes items with their text drawings, and the decisions labeled *asked* or *assumed*. It works offline, on a phone; the reviewer taps an item to add a note and copies the notes into `/continue`.

**Work that changes no repo file** — research, an errand, a message — gets no OpenSpec change and no page. Run the bounded `/explore` pass below, then write a short numbered to-do in the conversation and mark each step that acts outside it `(outward)`. Write no file.

## Explore first

Invoke [`/explore`](../explore/SKILL.md) in bounded mode; [its exit round](../explore/SKILL.md#the-exit-round) is the only question round, and nothing more is asked during this plan. Record each decision as its own Decision-log bullet: `**YYYY-MM-DD** — Asked <question> → chose <answer>.` for every earlier answer and the exit round, and `**YYYY-MM-DD** — Assumed: <decision>, because <reason>.` for each inferred one. The review page labels a bullet by its first word.

## Draft with the CLI

Follow the shared [CLI contract](references/openspec-cli.md): select the root or requested store, create a change with `openspec new change "<name>"` only when needed, and read `openspec status --change "<name>" --json`. For each ready artifact in the transitive `applyRequires` set, read `openspec instructions <id> --change "<name>" --json`, apply its template and rules, then recheck status. Read dependency files from disk. Honor conditional skips and `skip_specs` when the artifact's instruction allows them. Do not mark an existing tasks file ready while its dependencies are absent.

If `/apply` selected an incomplete change, complete that exact change rather than creating another. If planning blocks, report it to `/apply` without beginning implementation. A standalone `/plan` stops for review after producing and validating the artifacts.

Before tasks, decide whether a repeated process belongs in deterministic code, by [the principles](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai); when that fork changes the scope, raise it in the exit round. A change to testable behavior gets a coverage task beside the related implementation; a prose-only change does not.

Write the proposal's Why and What Changes for the person who asked, at [the reader's level](../explore/references/asking-the-user.md#write-at-the-readers-level). For a non-technical reader, say what they will see, get, or be able to do; put file names, code, and commands in the design, specs, and tasks, which the page does not show. Capabilities and Impact may stay technical.

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

The builder prints its status line, then the page's absolute path. The builder reads the proposal directly and writes a standalone page from the fixed kit; do not keep another copy of Why, What Changes, or the drawings. It stops on a missing section or an unclosed fence, and warns about a drawing line wider than 60 columns: shorten that line. A clean build proves the page is well formed, not that a drawing explains its bullet; the reviewer's notes do that.

For screens, add a `## UX` design section with a brief, flow, hierarchy, components, and a `### Review` subsection that links `review.html` and names the items that sketch each screen. Sketch phone work phone-first. UI-less changes omit this section.

## Review notes

A `/continue` instruction that begins `Review notes from review.html` is feedback on an existing change. Read its artifact paths from `openspec status --change "<name>" --json`, by the [CLI contract](references/openspec-cli.md). Apply each note where it belongs — the proposal and its drawings, design, delta specs, tasks — and keep them coherent. Append one Decision-log line naming what each note changed or why it was declined. For a substantial rewrite, use `openspec instructions <artifact-id> --change "<name>" --json`, then validate. Rebuild the page (above) before implementing. Create no artifact the notes did not ask for.

## Finish

Write tasks grouped by the surface they touch, following the CLI's checkbox template. A task needing CI or a deployed preview names `/save` as its means of completion. Validate with `openspec validate "<name>" --strict --no-interactive`. Confirm the review page exists and all apply-required artifacts are complete. Standalone `/plan` presents the plan in a few plain lines and stops. Just above the last question, write *Click here to see the plan:* and a Markdown link to the path the builder printed. End with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step) — build it now *(Recommended)*, change the plan first, or stop here. When invoked by `/apply`, return the exact change name and let `/apply` implement it.
