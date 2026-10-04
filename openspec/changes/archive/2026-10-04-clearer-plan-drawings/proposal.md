# Clearer drawings in plans

**Status:** ready-to-ship

**Branch:** archify-plan-diagrams

**Open questions:** none

## Why

Plan drawings still tend to be one column of steps, which says no more than a numbered list. Archify, a tool that draws polished diagrams, picks the kind of drawing from the question being asked; its rules fit our text drawings, and the tool itself is too heavy for a plan page.

## What Changes

- **The usual path runs in one straight line, and what goes wrong sits in a row below it.** You see at a glance what normally happens and where it can fail.
  ```text
   publish ──▶ lands? ──▶ "it is live"
                 │ no
                 ▼
              say why ──▶ build a fix
  ```
- **A back-and-forth between two parties gets its own drawing.** It shows who asks whom, in order, such as you and the assistant, or your app and a payment service.
  ```text
   you              assistant
    │── ask ───────────▶│
    │◀──── a plan ──────│
    │── "build it" ────▶│
  ```
- **A thing that moves through stages gets its own drawing.** It shows where an order, a plan, or a request can stand, and what moves it on or back.
  ```text
   draft ──▶ saved ──▶ live
               ▲         │
               └── undo ─┘
  ```
- **A changed flow is drawn before and after, with a `+` on what is new.** Today only a changed screen is shown both ways.
  ```text
     BEFORE            AFTER
   save ──▶ live    save ──▶ check ──▶ live
                             +
  ```
- **The assistant picks the drawing by what the bullet explains.** The same guide serves drawings in chat while an idea is being thought through. Two little-used patterns, the titled frame and the split that joins again, make room for the new ones.
- **Unchanged:** drawings stay plain text that reads on a phone and takes notes line by line. Options side by side, comparison tables, and screen sketches stay as they are.

**Non-goals:** Adding Archify or any picture renderer to the plan page. A check that rejects a plain column of steps. Changing the page's size limits or the review page itself.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: a drawing takes the guide pattern that fits its bullet (steps with failures below, a back-and-forth, states, options, a table), and a changed flow is drawn before and after with new parts marked.

## Impact

- Skills: `.agents/skills/plan/references/drawings.md` (patterns swapped within the instruction-byte budget; `/explore` reads the same file).
- Docs: `wiki/ux-principles.md` (the review file's list of drawing kinds), `CHANGELOG.md`.
- No script, test, or app change.

## Decision log

- **2026-10-04** — Asked whether to plan the three drawing-guide additions found by studying Archify → chose to build and publish them in one go.
- **2026-10-04** — Assumed: Archify itself is not added, because a trial drawing came out as a 749 KB page against a 40 KB review page, was cut off at phone width, and it draws flows only, with no tables, screens, or chat drawings.
- **2026-10-04** — Assumed: the titled frame and the split-and-join patterns are dropped to make room, because skill instruction text has 14 bytes of headroom and the failure-row pattern covers a branch.
- **2026-10-04** — Assumed: no builder check flags a plain column of steps, because a short chain is sometimes the right drawing and a warning would force every plan off it.
- **2026-10-04** — Built: the guide's kept examples were shrunk to fit the size limit (two boxes side by side, a narrower table), and the `+` sits inline on the new part; all checks pass with 1 byte of headroom.
- **2026-10-04** — Archived for publishing as 30.9.0: the guide, the wiki line, and the changelog entry are in, and the spec gained one requirement.
