<!-- openspec-archive v1 2026-09-27-review-notes-stop-at-plan -->
<!-- file proposal.md utf8 5821 -->
# Review notes update the plan and stop

**Status:** ready-to-ship
**Branch:** fix/review-copy-notes-auto-apply
**Open questions:** none

## Why

When you copy notes from a review page and paste them into chat, the assistant sometimes updates the plan and then goes straight on to build it. You never get to see the updated plan first. The copied text starts with `/continue`, which is the command for "pick this up and keep going", so building is what it was told to do.

## What Changes

- **Pasted notes change the plan, then stop.** The assistant updates the plan to match your notes and rebuilds the review page. Then it shows you the new page and asks *build it now?*, the same stop you get after any new plan.
  ```text
  review page
      │ Copy notes
      ▼
  paste in chat
      │
      ▼
  plan updated
  review page rebuilt
      │
      ▼
  "Build it now?" ◀── you decide
  ```
- **The copied text is a plain request.** No command at the top. It asks, in plain words, to update the plan and not build yet. Each note is a bullet that starts with where it points: the Why, a change number, or a decision number, plus a few words of that text.
  ```text
  before
  /continue add-login
  Review notes from review.html (2):
  1. #/2 · item "Save the…" — Say why.
  2. #/decisions/1 · decision "…" — …

  after
  Update the plan add-login with
  these notes from the review page.
  Don't build yet.
  - Change #2 ("Save the…"): Say why.
  - Decision #1 ("…"): …
  ```
- **The page says where the notes go.** After you tap Copy notes, the message reads *Paste them into chat to update the plan.*

**Non-goals:** No change to how you add, edit, or save notes on the page. Notes copied from a page made before this update are not treated specially. Notes are pasted where the plan is open; loading a saved plan elsewhere first is out of scope.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: the copied block is a plain request to update the plan and not build, with one bullet per note by change number; pasted notes reconcile the plan and stop for review instead of implementing; the PR body requirement stops naming `/continue` for notes, matching the body `/save` writes today.
- `payload-checks`: the browser-test scenario names the copied request instead of the `/continue` block.

## Impact

- `.agents/skills/plan/references/review-kit.html`: the copy block's header, its note lines, and the copy toast.
- `.agents/skills/plan/SKILL.md`: the description names pasted review notes; the Review notes section — skip the explore round, stop after the rebuild.
- `.agents/skills/continue/SKILL.md`: drops its pasted-review-block bullet.
- `scripts/retired-names.json`: retires the old marker `Review notes from review.html`.
- `scripts/tests/review-browser.test.mjs`: the copy test's expected block and toast.
- `openspec/specs/ux-wireframes/spec.md` (by delta, and its Purpose line directly), `openspec/specs/payload-checks/spec.md` (by delta), `wiki/ux-principles.md`.
- `VERSION` 25.3.0 → 25.4.0 and a `CHANGELOG.md` entry.

## Decision log

- **2026-09-27** — Assumed: the copied block starts with `/plan <change-name>` rather than plain words with no command, because an explicit command reliably loads the plan skill that owns the notes procedure, and you said the `/continue` start is probably not needed.
- **2026-09-27** — Assumed: after the notes are in, the assistant stops at the review link and asks *build it now?*, because that is the stop every new plan already makes, and building without a look is the bug.
- **2026-09-27** — Assumed: the notes procedure stays in the plan skill's Review notes section rather than a new reference file, because it is one paragraph and the fix is its stop, not its size.
- **2026-09-27** — Assumed: `/continue` still accepts pasted notes and now stops after them, because review pages built before this release keep copying `/continue`.
- **2026-09-27** — Assumed: the marker line `Review notes from review.html (<n>)` keeps its wording, because both skills recognize a pasted block by it, and old and new pages then match one rule.
- **2026-09-27** — Asked whether the copied text needs a command at the top → chose plain words: "Update the plan <name> with these notes from the review page. Don't build yet.", then one bullet per note by change number. This replaces the `/plan <change-name>` start above. The plan skill's description names these notes so it still loads.
- **2026-09-27** — Assumed: each bullet keeps a short quote of the text it points at, because a change number can shift when the plan is edited, and the quote lets the assistant find the right spot.
- **2026-09-27** — Asked, in a review note on change 4, whether older review pages need handling → chose no; the change is removed. Only the new copy format is recognized; `/continue` drops its review-block bullet, and the old marker is retired.
- **2026-09-27** — Asked, in a review note on change 5, whether notes need to work in a new session → chose no; the change is removed. Notes are handled where the plan is open, with no detour through `/continue`.
- **2026-09-27** — Assumed: no repeatable fact to distill, because the three session facts describe this change, and its one lasting rule (copied text is a plain request) now lives in the review kit, `/plan`, and [the UX principles](../../../wiki/ux-principles.md).
- **2026-09-27** — Assumed: archived and checkpointed for ship. Built as planned, plus a `payload-checks` delta and a direct `ux-wireframes` Purpose edit, both still naming `/continue`. The browser test waits for the copy toast, which is set after the clipboard write resolves. Released as 25.4.0, because 25.3.0 landed on main while this was planned.

<!-- end proposal.md -->
<!-- file design.md utf8 3338 -->
# Design

## Context

`review-kit.html` copies `/continue <name>` then `Review notes from review.html (<n>):`. `/continue` recaps, folds the block in by [`/plan`'s review-notes step](../../../.agents/skills/plan/SKILL.md#review-notes) "before implementing", and that step itself ends "Rebuild the page before implementing". Both texts read as *reconcile, then build*, so an agent sometimes runs `/apply` straight after. No text anywhere says to stop.

## Goals / Non-Goals

**Goals:**
- A pasted block ends at the rebuilt review link and the *build it now?* question.
- The block names its own intent, so even an agent that skims the skill reads "don't build yet".

**Non-Goals:**
- The note UI, note storage, locations, and labels.
- Blocks copied from pages built before this release, and notes pasted where the change is not checked out (both dropped at review).

## Decisions

- **The block is a plain request, with no command.** The user's own message carries the intent, the strongest instruction an agent reads. The plan skill's `description` names "notes pasted from a review page", so the skill loads without `/plan`. A `/plan <name>` start was dropped at review: it adds a command the person doesn't need.
- **Block format:**
  ```
  Update the plan <name> with these notes from the review page. Don't build yet.
  - Why, paragraph 1 ("<quote>"): <text>
  - Change #2 ("<quote>"): <text>
  - Change #1, drawing line 3 ("<quote>"): <text>
  - Decision #2 ("<quote>"): <text>
  ```
  `notesText()` derives the place from the note id and takes the quote from the saved label (the label minus its kind prefix). Saved labels keep their format, so stored notes stay attached. `/plan` recognizes the new header only.
- **`/plan` Review notes section** becomes the one owner of the stop:
  - A pasted block skips `/explore`: the notes are the reviewer's answers, and the exit round is spent.
  - The change is read from this checkout by `openspec status --change <name>`; if it is absent, say so and stop.
  - After the rebuild, finish as standalone `/plan` does: a few plain lines on what the notes changed, *Click here to see the plan:* with the builder's path, and the next-step question. Never invoke `/apply` from here.
- **`/continue` step 4** drops its pasted-review-block bullet: new pages never produce one. `Review notes from review.html` goes into `scripts/retired-names.json`, pointing at the new header, so no live file keeps the old marker.
- **Toast**: `Copied <n> notes. Paste them into chat to update the plan.`
- **The PR body requirement** drops "paste the notes into `/continue`"; `render-pr-body.mjs` already writes only "open from a clone to view and annotate offline", so no code changes there.
- **Release**: 25.3.0 → 25.4.0. The copy format is observable behavior, and the notes flow changes its stop.

## Risks / Trade-offs

- An agent may still over-reach despite the skill text. The third line of the block is the second guard: it sits in the user's own message, the strongest instruction the agent reads.
- A block copied from an older page still starts with `/continue` and may still build. Accepted at review: those pages are rare and short-lived.
- Notes pasted where the change is not checked out stop with a message rather than loading it; notes are usually pasted in the session that made the plan.

<!-- end design.md -->
<!-- file tasks.md utf8 2071 -->
## 1. Review page

- [x] 1.1 In `.agents/skills/plan/references/review-kit.html`, make `notesText()` emit the header `Update the plan <name> with these notes from the review page. Don't build yet.` and one `- <place> ("<quote>"): <text>` bullet per note, leaving saved labels unchanged, and make the copy toast say `Paste them into chat to update the plan.`
- [x] 1.2 Update `scripts/tests/review-browser.test.mjs`: the copy test's name and expected block, and an assertion on the toast text.

## 2. Skills

- [x] 2.1 In `.agents/skills/plan/SKILL.md`, add pasted review-page notes to the `description`, and rewrite the Review notes section: recognize the new header, skip `/explore`, stop with a message when the change is not in this checkout, and after the rebuild finish as standalone `/plan` with the review link and the next-step question, never invoking `/apply`. Drop "before implementing" from the section.
- [x] 2.2 In `.agents/skills/continue/SKILL.md` step 4, remove the pasted-review-block bullet.
- [x] 2.3 Add `Review notes from review.html` to `scripts/retired-names.json`, replaced by the header `Update the plan <name> with these notes from the review page`.

## 3. Docs and release

- [x] 3.0 Update the `ux-wireframes` Purpose line directly (a delta cannot change a Purpose), and add a `payload-checks` delta whose browser-test scenario names the copied request, found at build time.
- [x] 3.1 In `wiki/ux-principles.md`, say Copy notes produces a plain request, one bullet per note by change number, that updates the plan and stops before building.
- [x] 3.2 Bump `VERSION` to 25.4.0 and add a `CHANGELOG.md` entry, noting that pages built before it still copy `/continue` until their next build.
- [x] 3.3 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `openspec validate review-notes-stop-at-plan --strict --no-interactive`.
- [x] 3.4 Rebuild this change's review page and confirm Copy notes produces the new block, then run `/save` for CI to run the review tests.

<!-- end tasks.md -->
<!-- file specs/payload-checks/spec.md utf8 857 -->
## MODIFIED Requirements

### Requirement: The review page is tested in a real browser by the payload checks

The payload checks SHALL drive the plan review page in a real browser engine: taps and drags, the note editor, copied notes, drafts across a reload, refused storage, notes whose text moved, drawing zoom and fit, touch input, and layout at phone and desktop widths. The browser SHALL be one already on the CI runner when available; a download SHALL happen only in the meta-only workflow.

#### Scenario: A review-page regression fails the payload checks

- **WHEN** a change to the review kit stops a saved note from appearing in the copied request to update the plan
- **THEN** the payload checks fail

#### Scenario: The review page test is not shipped

- **WHEN** a repo takes the app scaffold
- **THEN** it receives no review-page browser test

<!-- end specs/payload-checks/spec.md -->
<!-- file specs/ux-wireframes/spec.md utf8 5831 -->
## RENAMED Requirements

- FROM: `### Requirement: The copied block is a `/continue` instruction`
- TO: `### Requirement: Pasted review notes update the plan and stop`

## MODIFIED Requirements

### Requirement: Pasted review notes update the plan and stop

When the agent receives a message whose first line begins `Update the plan <change-name> with these notes from the review page`, it SHALL load plan's review-notes procedure and reconcile those notes into the affected existing artifacts using CLI-provided paths. It SHALL record which notes changed what or why a note was declined. It SHALL refresh the review through the shared assembly path and SHALL NOT depend on a generated update skill. It SHALL NOT run an explore question round for the notes. When the change is not in the current checkout, it SHALL say so and stop. After the refresh it SHALL present the updated plan with a link to the review page, ask whether to build it now, and SHALL NOT implement any task until the person answers.

#### Scenario: A review block is pasted

- **WHEN** a reviewer pastes a copied review block for a change
- **THEN** the affected proposal (including its visuals), design, specs, and tasks are reconciled
- **AND** the Decision log records the disposition and the review shows the accepted changes
- **AND** the reply ends with the review link and the question whether to build it now, and no task is implemented

#### Scenario: The change is not here

- **WHEN** a reviewer pastes a review block in a checkout that does not hold the change
- **THEN** the reply says the plan is not open here, and nothing is changed or implemented

### Requirement: The PR body links the review page

The PR body that `/save` regenerates SHALL carry a `## Review` section linking `openspec/changes/<name>/review.html` on the branch when the file exists, saying to open it from a clone to view and annotate it, and SHALL omit the section when it does not. Tasks SHALL NOT need review anchors.

#### Scenario: The PR body links the file

- **WHEN** `/save` regenerates the PR body for a change with `review.html`
- **THEN** the body has a `## Review` section whose link resolves to the file on the branch

#### Scenario: No wireframe on the branch

- **WHEN** `/save` regenerates the PR body for a change without `review.html`
- **THEN** the body has no `## Review` section

### Requirement: A tap on an item offers a note

`review.html` SHALL have no annotate mode. Each Why paragraph, item text, and decision SHALL show a visible Note control while it has no note or draft; a tap or click on it SHALL open the note editor for that element. Once the element has a note or draft, its numbered pin or Draft pin SHALL take the Note control's place and open the editor. A mouse click without movement on that text, or a tap or click without movement on a line of a visual in the full-screen view, SHALL show an "Add note" option at that element; choosing it SHALL open the note editor for that element. A touch tap on text outside a control SHALL NOT show the option. A drag, a pinch, a wheel, or a tap on a link or control SHALL keep its normal action and SHALL NOT show the option. The editor SHALL appear beside the target on desktop without covering it, and SHALL dock on a phone. Saving SHALL attach a numbered pin to the element and add the note to the notes list. Saved notes SHALL persist across reloads on the same machine, keyed by change name, and SHALL NOT be written to any repository file. A copy action SHALL place on the clipboard a block with no command, whose first line is `Update the plan <change-name> with these notes from the review page. Don't build yet.`, and which then carries one bullet per saved note, in saved order, as `- <place> ("<quoted text>"): <text>`, where the place is `Why, paragraph <n>`, `Change #<n>`, `Change #<n>, drawing line <k>`, or `Decision #<n>`, and the quoted text is the quote from the note's saved label. The saved label format SHALL NOT change. After a successful copy the page SHALL say to paste the notes into chat to update the plan. A pin whose element no longer matches its saved label SHALL be shown as possibly moved. The Note control SHALL NOT be part of an element's label.

#### Scenario: Tap Note on a phone

- **WHEN** the reviewer taps the Note control of item 2 on a touch screen
- **THEN** the editor opens for item 2 with no second tap

#### Scenario: Tap an item

- **WHEN** the reviewer clicks the text of item 2 without moving
- **THEN** an "Add note" option appears at that text
- **AND** choosing it opens the editor for item 2

#### Scenario: Tap text on a phone

- **WHEN** the reviewer taps the text of item 2 on a touch screen
- **THEN** no "Add note" option appears and nothing else changes

#### Scenario: Scroll across an item

- **WHEN** the reviewer drags across item 2 to scroll
- **THEN** the page scrolls and no "Add note" option appears

#### Scenario: Note a drawing line

- **WHEN** the reviewer opens a drawing full screen, taps line 3, and chooses "Add note"
- **THEN** the full-screen view closes and the editor opens for that drawing line

#### Scenario: Use a zoom control

- **WHEN** the reviewer opens or folds a drawing, or taps a full-screen zoom button
- **THEN** that control acts and no "Add note" option appears

#### Scenario: Notes survive a reload

- **WHEN** the reviewer reloads the file
- **THEN** every saved note and pin is still there

#### Scenario: The notes are copied

- **WHEN** the reviewer activates Copy notes with two notes saved
- **THEN** the clipboard holds a block with no command, starting with the line asking to update the plan for `<change-name>` and not build yet, then two bullets, each with a place such as `Change #2`, a short quote, and the text
- **AND** the page says to paste them into chat to update the plan

<!-- end specs/ux-wireframes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-27

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 37026 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-27-review-notes-stop-at-plan</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session { color:var(--muted); font-size:13px; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-27-review-notes-stop-at-plan">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-27-review-notes-stop-at-plan</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">When you copy notes from a review page and paste them into chat, the assistant sometimes updates the plan and then goes straight on to build it. You never get to see the updated plan first. The copied text starts with <code>/continue</code>, which is the command for &quot;pick this up and keep going&quot;, so building is what it was told to do.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Pasted notes change the plan, then stop.</b> The assistant updates the plan to match your notes and rebuilds the review page. Then it shows you the new page and asks <i>build it now?</i>, the same stop you get after any new plan.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">review page</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">    │ Copy notes</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">    ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">paste in chat</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">    │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">    ▼</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">plan updated</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">review page rebuilt</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">    │</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">    ▼</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">&quot;Build it now?&quot; ◀── you decide</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The copied text is a plain request.</b> No command at the top. It asks, in plain words, to update the plan and not build yet. Each note is a bullet that starts with where it points: the Why, a change number, or a decision number, plus a few words of that text.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">before</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">/continue add-login</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">Review notes from review.html (2):</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">1. #/2 · item &quot;Save the…&quot; — Say why.</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">2. #/decisions/1 · decision &quot;…&quot; — …</span>

<span class="ln" data-note="item-2-line-7" tabindex="0">after</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">Update the plan add-login with</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">these notes from the review page.</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">Don't build yet.</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">- Change #2 (&quot;Save the…&quot;): Say why.</span>
<span class="ln" data-note="item-2-line-12" tabindex="0">- Decision #1 (&quot;…&quot;): …</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The page says where the notes go.</b> After you tap Copy notes, the message reads <i>Paste them into chat to update the plan.</i></div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> No change to how you add, edit, or save notes on the page. Notes copied from a page made before this update are not treated specially. Notes are pasted where the plan is open; loading a saved plan elsewhere first is out of scope.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the copied block starts with <code>/plan &lt;change-name&gt;</code> rather than plain words with no command, because an explicit command reliably loads the plan skill that owns the notes procedure, and you said the <code>/continue</code> start is probably not needed.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: after the notes are in, the assistant stops at the review link and asks <i>build it now?</i>, because that is the stop every new plan already makes, and building without a look is the bug.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the notes procedure stays in the plan skill's Review notes section rather than a new reference file, because it is one paragraph and the fix is its stop, not its size.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: <code>/continue</code> still accepts pasted notes and now stops after them, because review pages built before this release keep copying <code>/continue</code>.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the marker line <code>Review notes from review.html (&lt;n&gt;)</code> keeps its wording, because both skills recognize a pasted block by it, and old and new pages then match one rule.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether the copied text needs a command at the top → chose plain words: &quot;Update the plan &lt;name&gt; with these notes from the review page. Don't build yet.&quot;, then one bullet per note by change number. This replaces the <code>/plan &lt;change-name&gt;</code> start above. The plan skill's description names these notes so it still loads.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: each bullet keeps a short quote of the text it points at, because a change number can shift when the plan is edited, and the quote lets the assistant find the right spot.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked, in a review note on change 4, whether older review pages need handling → chose no; the change is removed. Only the new copy format is recognized; <code>/continue</code> drops its review-block bullet, and the old marker is retired.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked, in a review note on change 5, whether notes need to work in a new session → chose no; the change is removed. Notes are handled where the plan is open, with no detour through <code>/continue</code>.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: no repeatable fact to distill, because the three session facts describe this change, and its one lasting rule (copied text is a plain request) now lives in the review kit, <code>/plan</code>, and <a href="../../../wiki/ux-principles.md">the UX principles</a>.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: archived and checkpointed for ship. Built as planned, plus a <code>payload-checks</code> delta and a direct <code>ux-wireframes</code> Purpose edit, both still naming <code>/continue</code>. The browser test waits for the copy toast, which is set after the clipboard write resolves. Released as 25.4.0, because 25.3.0 landed on main while this was planned.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="What should change here?"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = n + (n === 1 ? ' note' : ' notes') + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as a plain request to update the plan ──
  function notesText() {
    const lines = ['Update the plan ' + CHANGE + ' with these notes from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length, buf = $('copybuf');
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    buf.value = notesText();
    const done = function () { toast('Copied ' + n + (n === 1 ? ' note' : ' notes') + '. Paste them into chat to update the plan.'); };
    const fallback = function () { buf.select(); if (document.execCommand('copy')) done(); else toast('Copy failed. Copy the notes list by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
