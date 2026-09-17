## Context

`parseProposal()` in `.agents/skills/plan/references/review-kit.html` splits the spliced proposal into lines, groups them under `## ` headings, then walks the What Changes lines with `line.match(/^- (.+)/)`. A line that does not match goes to `tail` and renders as a paragraph below the list. The anchor is matched against that single line with a regex ending in `\s*$`.

Two constraints shape the fix. The kit's script must not use optional chaining or an optional catch binding and must not throw before the first render — a phone browser that refuses `localStorage` on `file://` still has to draw the page. And `sync-review-proposal.mjs` is a pure text splice by design: it copies `proposal.md`'s Why and What Changes in verbatim and makes no judgment, which is why the repair belongs in the reader, not the writer. See proposal.md — Why.

## Goals / Non-Goals

**Goals:**

- A bullet parses the same whether its author wrapped it or not.
- An unwrapped proposal parses byte-identically, so no existing page changes.
- The fold is small enough to read in place, with no new function and no new state outside the loop.

**Non-Goals:**

- Full Markdown list parsing. Nested sub-lists, ordered lists, and fenced blocks inside a bullet stay unsupported.
- A tail paragraph that is itself wrapped still renders one `<p>` per line. Pre-existing and untouched.

## Decisions

**Fold before the existing loop, don't rewrite the loop.** A pre-pass builds an `items` array of folded lines, and the existing `forEach` runs over `items` instead of the raw lines. Everything downstream — the anchor regex, `bullets`, `tail`, `renderPanel` — is unchanged, so the diff is a handful of lines and the blast radius is the fold rule alone. The alternative, teaching the anchor regex to span lines, was rejected: it would have to consume the following lines anyway, and the bullet's *text* would still be truncated.

**The boundary is the blank line, not the indent.** A non-blank line that is not itself a bullet and follows a bullet with no blank line between joins that bullet; a blank line closes it. The bug report proposed keying on indentation instead. A harness over the parser's exact logic showed why that is not enough: with hanging-indent wrapping both rules recover 2 of 2 anchors, but with unindented wrapping — what a plain hard-wrap at a column limit produces, and valid Markdown lazy continuation — the indent rule still recovers 0 of 2. The blank-line rule recovers both and leaves the `**Non-goals:**` paragraph in `tail`, because a blank line precedes it.

**One flag, no lookbehind.** The pre-pass carries a single `open` boolean rather than inspecting the previous item, so the rule reads as the state machine it is: a bullet opens, a blank line closes, and anything in between belongs to the bullet.

```js
const items = []; let open = false;   // fold a wrapped bullet back onto one line
(sections['What Changes'] || []).forEach(line => {
  if (/^- /.test(line)) { items.push(line); open = true; return; }
  if (open && line.trim()) { items[items.length - 1] += ' ' + line.trim(); return; }
  if (!line.trim()) open = false;
  items.push(line);
});
```

**Document the rule where the author is.** Step 4 of the authoring header gains a sentence saying the anchor is read from the end of the whole bullet, so a wrapped bullet is fine. The header already warns about the adjacent trap (a mark that shares a state's name); this sits beside it.

## Risks / Trade-offs

- **A sub-bullet indented under a What Changes item now joins its parent's text** instead of becoming a paragraph below the list → accepted. Neither rendering is right, and joining keeps the item's own anchor working; the kit's own example has no sub-bullets and the spec describes What Changes as a flat list.
- **A page written from the old kit keeps the old parser** → accepted and stated in the proposal's Non-goals. `review.html` is copied per change, so the fix reaches every future change and no archived one. The archive is the record of what was reviewed.
- **The fold cannot be verified by CI** — this repo has no test suite and nothing builds locally → mitigated by running the parser's exact logic in a standalone harness over three inputs (unwrapped, hanging-indent wrapped, unindented wrapped) before and after, and by opening the change's own `review.html`, which carries the fixed kit.

## Review

See [review.html](review.html) — `parse` (before/after the fold, with the `fold` and `boundary` marks), `header` (the step 4 diff), and `files` (what the release touches).
