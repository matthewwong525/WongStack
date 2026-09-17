# Read a wrapped What Changes bullet as one bullet

**Status:** ready-to-ship
**Open questions:** none

## Why

A hard-wrapped What Changes bullet loses its picture, and nobody is told. The review kit's parser reads the section one line at a time and assumes one bullet is one line, so a wrapped bullet's trailing `(review.html#/…)` anchor — which sits at the end of the bullet, hence on its last line — is never seen. The page then reports `no visual`, a state the kit uses deliberately elsewhere, so the reviewer cannot tell a broken bullet from an intentional one. Wrapping a Markdown list item is ordinary, and every other reader of `proposal.md` renders it correctly.

## What Changes

- **A wrapped bullet is folded back to one bullet before parsing.** `parseProposal()` joins each continuation line onto the bullet above it, so the anchor is read from the end of the whole bullet instead of the end of a line. (review.html#/parse/after/fold)
- **A blank line still ends a bullet**, so the `**Non-goals:**` paragraph below the list reaches the tail slot exactly as today, and an unwrapped proposal parses byte-identically. (review.html#/parse/after/boundary)
- **The authoring header says a bullet may wrap.** Step 4 of the kit's fill instructions states that the anchor is read from the end of the whole bullet, so the rule stops being folklore. (review.html#/header)
- **Release ritual:** `VERSION` 15.0.0 → 15.0.1 and a newest-first `CHANGELOG.md` entry. (review.html#/files/release)

**Non-goals:** no new validation or warning machinery in `sync-review-proposal.mjs` or the page; no retro-fix of the `review.html` copies already in `openspec/changes/archive/`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: the bullet-to-anchor rule gains the wrapping case — the anchor is read from the end of the bullet, not the end of a line.

## Impact

- `.agents/skills/plan/references/review-kit.html` — `parseProposal()` gains a fold pass; the authoring header gains one line in step 4. (`.claude/` is a symlink to `.agents/`: one file, not two.)
- `VERSION`, `CHANGELOG.md` — the release ritual for a payload edit.
- `openspec/specs/ux-wireframes/spec.md` — one requirement gains two scenarios, synced at archive.
- Every future change's `review.html` is a copy of the fixed kit. Copies already written keep the old parser.

## Decision log

- **2026-09-17** — asked: fold rule, blank-line-aware or the indented-only patch from the bug report → chose **blank-line-aware**. A harness over the parser's exact logic showed the indented-only rule repairs hanging-indent wrapping but leaves unindented ("lazy") wrapping broken at 0 of 2 anchors, which is what a plain hard-wrap at a column limit produces. The blank-line-aware rule repairs both and is a no-op on unwrapped input.
- **2026-09-17** — asked: scope, the fold plus a line in the authoring header, or also a loud signal for any unanchored bullet → chose **fold plus the header line**. It repairs the reported failure completely, adds no machinery, and stays a patch release.
- **2026-09-17** — retro-fixing the five archived `review.html` copies → assumed no. The archive is the immutable record of what shipped; those pages stay as they were reviewed.
- **2026-09-17** — version increment → assumed **patch** (15.0.1). The fix repairs behaviour and adds no surface; the header line documents a rule that was already meant to hold.
- **2026-09-17** — a hard-wrapped `**Non-goals:**` paragraph still renders as one `<p>` per line → assumed out of scope. It is pre-existing, cosmetic, and untouched by the fold, which only joins lines that follow a bullet.
- **2026-09-17** — Implemented and released 15.0.1. The proof runs the real `parseProposal()` source, extracted from the kit before and after the change, over three proposals: the kit's own unwrapped example (output byte-identical, both deliberate signals intact), a hanging-indent wrapped one, and an unindented one. Anchors go 0 of 3 to 3 of 3 on both wrapped inputs. A wrapped copy of this change's own `review.html` was then opened in a browser under each parser: 4 of 4 bullets showed `no visual` with 8 stray paragraphs before, 4 of 4 resolve with a clean tail after. Payload links, OpenSpec config, and change validation pass.
- **2026-09-17** — This change's own `review.html` carries the patched parser, not the one it was copied from, so the change does not ship a page with the defect it repairs.
