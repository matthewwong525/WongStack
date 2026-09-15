---
slug: add-review-html
started: 2026-09-14
updated: 2026-09-15
consolidated:
---

# From a wireframe on the side to a review page per change

## How the idea moved, in the user's words

The session started as a follow-on to #77 (`wireframe.html`). The user's opening frame:

> "realistically we only look at the 'Why' and the 'What Changes' section in the proposal, so i'm
> thinking of having a super UI friendly way to see the why and what changes and have the wireframe
> together in the html… i want a 10x improvement compared to viewing through proposal.md"

They also floated, unsure it was possible: annotate the HTML, press a button, get the annotations on
the clipboard to paste into Claude. It is possible, and it shipped.

A day later they reframed it, and the reframe is the change:

> "i think it might be helpful if we have the what changes and you can click into it and it'll show a
> visual of the change whether that be a wireframe or something else."

That inverted the design. The first plan kept the wireframe as the stage and bolted a proposal panel
on the side. The user's version makes **the What Changes list the navigation** and the wireframe just
one kind of picture. That is strictly better, and it is why the first change folder
(`wireframe-review-surface`) was deleted unbuilt and replaced by `add-review-html`. Nothing had been
committed, so there was no history to preserve.

Then, from a phone screenshot of the spike:

> "Can you also make this mobile friendly as well a lot of development is done on the phone and also
> for development ui/ux mobile should be taken into consideration"

Read as two requests, and both were built: the review page reflows for a phone, **and** screens get a
phone view so the wireframes themselves consider mobile.

## Decisions the user made

Every fork went to them as an `AskUserQuestion` round, and they took the recommended option each
time. The ones that reversed an earlier answer are the interesting ones:

- **Scope flipped.** Day one: UI-bearing changes only. Day two: every change. The reframe forced it —
  a visual per bullet only pays off when every change has the file, since most bullets in most
  changes are not screens.
- **The file was renamed** from `wireframe.html` to `review.html`, because wireframes became one kind
  among four. Cheap now (nothing downstream has a wireframe yet), expensive later.
- **Four visual kinds**: `screen`, `flow`, `diff`, `tree`. They chose this over "screen and diff only"
  and over "screen plus a text stage for everything else".
- **The proposal text is synced by a script at `/save`**, not copied by the model at `/plan` time.
  Their reasoning matched the recommendation: the PR body already works that way and never drifts.

## Two spikes, and why they were worth it

Both spikes were untracked files at the worktree root, driven with `agent-browser` from `file://`,
and deleted once their content reached the kit. Neither was a demo — each one found something
thinking had not.

**Spike 1 (`annotate-sample.html`) proved the interaction and then failed in the user's browser.**
Headless Chrome passed; the user opened it and got the chrome over a blank grey stage. Cause: a
top-level statement threw before the first render. Two `file://` calls WebKit can refuse are the
suspects — `localStorage` access and `history.replaceState` — and both are now guarded with
fallbacks. A `window` error listener writes any future failure into the panel with its line number,
so the next one names itself instead of showing grey. The script also avoids optional chaining and
optional catch binding. **This is the standing lesson: a `file://` page that must open anywhere
cannot assume storage or history, and needs an on-page error banner, because there is no console to
read on someone else's phone.**

**Spike 2 (`review-sample.html`) proved the bullet-driven model** and exposed two routing defects: a
bullet whose anchor omitted the state stored its mark in the state slot (so the panel never lit the
bullet), and a flow used one word for both a state and a mark. The second is now a rule in the kit's
fill instructions and on the critic's list: **a mark must never share a name with one of its visual's
states**, or the router reads it as the state and highlights nothing.

## The defect the kit found in itself

Worth remembering beyond this change. The kit's header comment documents the fill rules, and those
rules describe the `proposal:start` / `proposal:end` markers. Written literally, that put a `-->`
inside the header comment, which closed it early. The browser then parsed the remaining prose as
markup, opened a `<title>` element at the first mention of the tag, and swallowed ninety lines into
the document title — and the page reads the change name from the title, so "Copy notes" produced
`/continue <the entire header comment>`.

**Any HTML file whose comments discuss HTML has this hazard.** The fix is to name such markers in
words, and the build now asserts the header holds exactly one comment-close.

## What the reviewer actually does now

Open `review.html` from a clone (or a phone), read the Why, click a change, see the picture with the
changed parts outlined, turn on Annotate, click anything, type. Press Copy notes and paste the result
into Claude: it is a `/continue <change>` command, and `/continue` now folds a pasted review block
into the change's artifacts through `openspec-update-change` before working any task. That closes the
loop from reading a plan to changing it without a PR round trip.

## Open threads

- **The WebKit confirmation is still outstanding for the kit itself.** The user confirmed spike 1
  rendered on their phone after the guards, and the kit carries the same guards plus the phone layout
  verified in Chrome's 390×844 viewport — but nobody has opened the shipped kit in a WebKit browser.
- **This change ships no `review.html` of its own**, recorded as a non-goal. The kit's example content
  is the demo. Once a change plans with the new stage, that will be the first real one to look at.
- **No test harness exists for payload scripts.** `sync-review-proposal.mjs` was checked by hand on
  scratch copies across six cases. If a second payload script lands, a tiny runner is worth it.
- **Four kinds may not be enough forever.** The rule written into the design is: do not add a fifth
  until three changes have wanted the same one.
- **`improve-openspec-plans`** was active in this repo throughout and is unrelated; it stayed
  untouched.

## Process notes

- **Bare `/ship` again arrived on a planned-but-unimplemented change** (0 of 26 tasks) *and* on a
  branch whose name did not match the change (`interactive-proposal-viewer` vs `add-review-html`).
  Both were fixed before anything was archived: the branch was renamed, and `/apply` was pulled in via
  the "never merge as a way of stopping" rule. **This is the second time in two changes.** The written
  pull-in still covers only `/ship <intent>`. Stating the bare-`/ship` case outright, and having
  `/ship` reconcile a branch/change name mismatch by renaming, would remove the need to reason it out
  each time.
- **The capability keeps the name `ux-wireframes`** even though it now covers review pages. OpenSpec
  cannot rename a capability, and the walk-to-verify rename set the precedent by keeping
  `staging-walkthrough`. Only the Purpose line changed.
