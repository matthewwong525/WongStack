---
slug: fix-wrapped-review-bullets
started: 2026-09-17
updated: 2026-09-17
---

# A wrapped What Changes bullet lost its picture

## Where this came from

Not found here. A session working in a **target** repo (one WongStack is installed into) noticed
that a change's `review.html` showed `no visual` on every bullet, investigated, and wrote the case
up at `/root/wongstack-review-kit-bug.md` — 120 lines, framed as an upstream issue or PR body. That
session confirmed the target's `.claude/skills/plan/references/review-kit.html` was **byte-identical
to WongStack 15.0.0** (`062a0d5`), so the defect was in the template, not in anything the target had
done to it. It also measured the blast radius there: **1 of 7 review pages ever written** hit it —
the first one whose author happened to hard-wrap the bullets.

That report is the input to this change. It is a file outside the repo; the durable record is the
proposal, this note, and the CHANGELOG entry.

## What the report got right, and the one thing it missed

Root cause, verbatim-correct: `parseProposal()` walks `## What Changes` one line at a time, so a
wrapped bullet's lines 2..n fail `/^- (.+)/` and land in `tail`. The `(review.html#/…)` anchor is
appended at the **end of the bullet** — so on its last line — and the anchor regex ends in `\s*$`,
which is end-of-*line*. The anchor is therefore never tested.

The argument that this is the template's fault and not the author's is the part worth keeping:

- The constraint was **undocumented** — the kit's ~120-line authoring header covers kinds, states,
  marks, callouts, mobile and four hard rules, and even warns about the adjacent trap ("A MARK MUST
  NEVER SHARE A NAME WITH A STATE"), but never said a bullet must be one line.
- **Both failure signals fail to fire.** `dead link` needs an anchor that *parsed*; an unparsed one
  cannot be dead. `no visual` is a **deliberate** state the kit's own example proposal uses. So a
  broken bullet is indistinguishable from an intended one.

Where it fell short: its proposed 5-line patch keyed the fold on **indentation**. Running the
parser's real logic showed that repairs hanging-indent wrapping but leaves **unindented (lazy)
continuation** — valid CommonMark, and what a plain hard-wrap at a column limit produces — still at
0 of N anchors. The user chose the blank-line-aware rule instead, which covers both. The rationale
lives in the proposal's Decision log; it is not repeated here.

## Technique worth reusing: test the real source, not a transcription

The first harness retyped the parser's logic into a scratch file. That proves nothing about the
shipped code. The proof that ended up in the change **extracts the actual `parseProposal()` and
`inline()` source out of the kit file** (before and after, via `git show HEAD:` for the before),
stubs `document.getElementById('proposal').textContent` and `resolve()`, and runs it with
`new Function`. That turns "I believe it is a no-op" into a byte-comparison of the real function's
output. Files are under `/tmp/foldproof/` — scratch, not committed.

The browser half mattered too: a wrapped copy of this change's own `review.html`, opened under each
parser, showed 4 of 4 bullets as `no visual` with 8 stray paragraphs leaking raw anchors before, and
4 of 4 resolved with a clean tail after. That is the picture the target repo's author actually saw.

## Gotchas hit along the way

- **A filled `review.html` keeps the kit's whole authoring-header comment**, and that comment
  contains the literal text `<style>` and `<script>` (step 7: "Keep the `<style>` and `<script>`
  untouched"). So comparing a page against the kit with `text.index('<style')` matches **inside the
  comment** and silently compares the wrong span — it reported "not identical" for two files whose
  blocks were identical. Search from after the first `-->`.
- **The branch was renamed out from under the session.** The worktree opened on `wise-chicken`; the
  worktree manager renamed it to `fix/wongstack-wrapped-bullets` at 14:07, before any work started,
  so the session's opening git snapshot was already stale. A slashed branch name breaks the loop's
  `branch name = change name` tie — `/ship` Step 2 looks for `openspec/changes/$BRANCH/`. Renamed to
  `fix-wrapped-review-bullets`. `/root/.paseo/projects/workspaces.json` still records the old name;
  the rename is local, unpushed, and reversible.

## Open threads

- The **target repo still has the local fix uncommitted** on its `add-text-tutorial-submission-skill`
  branch (its own `proposal.md` / `review.html`). That work is not this repo's; once 15.0.1 is out,
  that repo can take it via `/wong-sync` instead, and its hand-patched `review.html` can go back to
  being a plain copy of the kit.
- **Pages already written keep their own copy of the parser.** Every `review.html` is a snapshot of
  the kit at plan time, so the fix reaches future changes only. The five copies under
  `openspec/changes/archive/` were deliberately left alone — the archive is the record of what was
  reviewed.
- Other malformed-anchor cases stay silent. The user explicitly scoped out a validator in
  `sync-review-proposal.mjs`, which is a pure text splice by design. If silence bites again, that is
  where the conversation restarts.
