<!-- openspec-archive v1 2026-09-15-add-review-html -->
<!-- file proposal.md utf8 13487 -->
# A review page for every change

**Status:** ready-to-ship
**Open questions:** none

## Why

A reviewer reads Why and What Changes and skims the rest. But a What Changes bullet is a sentence about something they cannot see: a screen, a flow, a rule's new text, a set of files. Today a UI change ships a wireframe on the side and every other change ships nothing to look at. `review.html` puts a picture behind every bullet: the list is the navigation, a click shows the visual, and the reviewer annotates in place and pastes the notes back as a `/continue` command.

## What Changes

- **Every change gets `openspec/changes/<name>/review.html`**. It replaces `wireframe.html`, which only UI-bearing changes got. One self-contained file: a sticky left panel with the proposal's Why and a numbered What Changes list, and a stage that shows one visual at a time. The landing view is the Why and the list; a click on a bullet shows its visual.
- **Four visual kinds ship in the kit**, `.claude/skills/plan/references/review-kit.html`, which replaces the wireframe kit. `screen` is the wireframe as it is today, with states, marks, and the lo-fi primitives unchanged. `flow` is lanes of steps, today and after. `diff` is before and after text with added lines marked. `tree` is a file list with added, edited, and removed markers. A bullet with nothing to draw gets a text stage showing the bullet in full, so a click never does nothing. Two bullets may share one visual.
- **A bullet links its visual** with a trailing `(review.html#/<visual>[/<state>][/<mark>])`. The state is optional and defaults; a segment that names no state is read as a mark. The panel shows each bullet's kind and anchor, highlights the marked elements when the bullet is chosen, marks the current bullet, and shows a dead anchor struck through with the reason.
- **`/save` resplices Why and What Changes** into the file from `proposal.md` on every checkpoint, through a new zero-dependency node script, `.claude/skills/save/scripts/sync-review-proposal.mjs`. No file, or no markers, is a reported no-op.
- **Annotate mode and Copy notes** on any visual and on the panel: a toggle in the chrome, a note box beside the clicked element, numbered pins, notes kept in localStorage under the change name, and a clipboard block whose first line is `/continue <name>`.
- **`/plan` runs a review stage for every change.** After design.md's first draft, a design subagent writes `review.html` with one visual per What Changes bullet and returns the bullet-to-anchor map; a critic checks that every anchor resolves, every declared state has markup, no state shows two primary actions, no visual is unreachable, and the file loads nothing from the network; one revision round. The main thread appends the anchors to the proposal's bullets in place and runs the sync script. The `## UX` section and `wiki/ux-principles.md` still govern `screen` visuals for UI-bearing changes; its `### Wireframes` subsection becomes `### Review`.
- **The page works on a phone.** Below a phone-width breakpoint the stage takes the full width, the What Changes list opens as a full-screen sheet from a Changes button, previous and next buttons in the chrome step through the bullets, the note box docks to the bottom of the screen with a 16px field so iOS does not zoom, and a diff stacks its columns. The same stepping and keyboard arrows work on a desktop.
- **Screens consider mobile.** A View toggle in the chrome walks any `screen` visual at phone width from a desktop; `phone-only` and `desktop-only` helpers let one screen carry both layouts; on a phone the phone layout is what shows. The review stage draws the phone layout first when the use-case brief says the job is done on a phone, and `wiki/ux-principles.md` says so where it asks about context of use.
- **`/continue` treats a pasted review block as an instruction** folded into the change through the update step before any task is worked.
- **Rename across the payload:** the plan skill, the PR body section (`## Review`), the `openspec/config.yaml` rules, `wiki/ux-principles.md`, the payload manifest, and the `ux-wireframes` spec's purpose. The kit gains guards for `file://` in WebKit browsers and an on-page error banner.
- **Release ritual:** `VERSION` 12.7.0 → 13.0.0, newest-first `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` passes.

**Non-goals:** no hosting of the file on a preview; no editing the proposal from the browser; no write-back of annotations to any file; no diagram library or any network load; no hand-drawn styling; no screenshots of real UI; no review page for changes already archived; no review page for this change itself, whose spike is its picture.

## Capabilities

### New Capabilities

- none.

### Modified Capabilities

- `ux-wireframes`: the file is `review.html` for every change, the What Changes list is its navigation, four visual kinds replace screens-only, bullets link visuals with an optional state, `/save` resyncs the proposal text, a reviewer annotates and copies notes as a `/continue` instruction, and the kit owns all of it.

## Impact

- **Edited:** `.claude/skills/plan/SKILL.md` (the UX stage becomes the review stage), `.claude/skills/save/SKILL.md` (Step 4 runs the sync script), `.claude/skills/save/references/git-gate.md` (PR body `## Review`), `.claude/skills/continue/SKILL.md` (the pasted block), `openspec/config.yaml` (proposal, design, and tasks rules), `wiki/ux-principles.md` (`### Review` and the review file), `.claude/skills/wong-sync/references/payload-manifest.md` (kit and script names), `openspec/specs/ux-wireframes/spec.md` (purpose), `VERSION`, `CHANGELOG.md`. `.claude` is a symlink to `.agents`, so edits land on the `.agents/` paths.
- **Added:** `.claude/skills/plan/references/review-kit.html` (moved from `wireframe-kit.html` and extended), `.claude/skills/save/scripts/sync-review-proposal.mjs`.
- **Removed:** `.claude/skills/plan/references/wireframe-kit.html`; the untracked spike `review-sample.html` at the worktree root once its content is in the kit.
- **Downstream repos:** the next `/wong-sync` proposes the kit rename, the script, and the skill, config, and wiki edits. A target's stale `wireframe-kit.html` is the ordinary untouched-orphan removal case. A `wireframe.html` in a target's active change keeps working as a file but is not resynced; its author renames it or replans.
- **Risk:** every `/plan` now spends one more subagent pass drawing visuals. A bounded vocabulary keeps that pass short, and a prose-only bullet costs a diff block or a text stage.

## Decision log

- **2026-09-14** — `/explore` asked scope → chose UI-bearing changes only. Asked who keeps the Why / What Changes block in sync → chose a script at `/save`, like the PR body. Asked whether annotations ship now → chose now. The interaction was settled by a spike driven with agent-browser from `file://`: the clipboard API and localStorage are available, a bullet click switches screen and highlights the mark, an annotate click opens a note box without navigating, pins survive reload. The user opened that spike in a WebKit browser and got a blank stage; the two `file://` calls WebKit can refuse, `localStorage` access and `history.replaceState`, are now guarded, an error listener writes any failure into the panel, and the script avoids optional chaining and optional catch binding.
- **2026-09-15** — the user reframed: the What Changes list should be the navigation, and each bullet should open a visual, a wireframe or something else, with annotations kept. `/explore` asked scope again → chose every change, reversing the day before, because a visual per bullet only pays off when every change has the file. Asked the file name → chose `review.html`, since wireframes become one visual kind; nothing downstream has a wireframe yet, so the rename is cheap now. Asked the visual vocabulary → chose `screen`, `flow`, `diff`, `tree`. Assumed, not asked: the spec keeps its `ux-wireframes` path, as the walk-to-verify rename kept `staging-walkthrough`; the version is a major bump, as the walk-to-verify rename was 12.0.0; the state segment is optional and a non-state segment is a mark, so `#/list/search` and `#/list-rule/added` read naturally, at the cost that a mark must not share a name with a state; the landing view is the Why plus the list; this change ships no review page of its own. The change was recreated as `add-review-html` with the earlier folder removed, since nothing had been committed. A second spike, `review-sample.html`, showed all four kinds plus a text stage and a dead anchor, driven in Chrome: every bullet lights its own entry, the flow highlights its new steps, the diff highlights its added lines, deep links open the right visual and state, notes on a flow step and a diff line copy in the intended shape, and the document has zero network references. Two defects it exposed are fixed and carried into the tasks: a bullet with no state segment stored its mark in the state slot, and a flow used one word for a state and a mark. The user then opened the spike on a phone: it rendered, which closes the WebKit question from the day before, but the two-column layout was unusable at that width. They asked for the page to work on a phone, because much development happens there, and for the wireframes to consider mobile. Both are in scope: a phone layout for the page (full-width stage, the list as a sheet, previous and next stepping, a docked note box) and a phone view for screens (a View toggle, `phone-only` and `desktop-only` helpers, the phone layout first when the brief says phone). Assumed, not asked: one breakpoint at 760px; the stepping buttons stay on desktop too, with arrow keys.

- **2026-09-15** — implemented all 26 tasks. The kit is `.agents/skills/plan/references/review-kit.html`, `git mv`'d from `wireframe-kit.html` and rebuilt from the session's second spike: panel, landing, four visual kinds, text stage, `#/<visual>[/<state>][/<mark>]` routing, annotate-and-copy, the phone layout, and the phone view for screens. **One defect the kit's own header exposed, and it would have shipped into every review page:** the fill rules described the proposal markers by quoting them, so the header comment contained a literal `-->`, which closed the comment early — the browser then parsed the header's prose as markup, opened a `<title>` element at the first mention of the tag, and swallowed 90 lines into the document title. The change name is read from the title, so `/continue CHANGE-NAME` came out as the whole comment. The header now names the markers in words, and the build asserts the header holds exactly one comment-close. Worth remembering for any HTML file whose comments discuss HTML. Verified by driving the kit with agent-browser from `file://` at 1280×800 and at 390×844: every example bullet opens its visual with the right hash and marks, the dead example anchor renders dead, the text bullet opens the text stage, annotate does not navigate, notes survive reload and copy in the specified shape, no state declares markup it lacks, no state shows two primary actions, the document holds zero network references, nothing overflows at phone width, the Changes sheet opens and closes on a pick, the note box docks with a 16px field, and Phone view narrows a screen to 390px and swaps its `phone-only` elements. The sync script `sync-review-proposal.mjs` was checked on scratch copies across six cases: splice, idempotent re-run, proposal edited then re-run, idempotent again, a copy with the markers stripped, and a folder with no `review.html` — the last two report and exit 0. `VERSION` 13.0.0 (a payload file is renamed and a convention every target follows changes shape, the same grounds as the walk-to-verify 12.0.0), newest-first `CHANGELOG.md` entry including what a target with a `wireframe.html` in flight does, and `node scripts/check-payload-links.mjs` reports no dead links. The main spec's `wireframe.html` requirement text is left to the delta sync rather than hand-edited; only its Purpose line was changed directly, per task 4.4. This change still ships no `review.html` of its own, as the proposal's non-goals say: the kit's example content is the demo, and a reviewer opens the kit itself.

- **2026-09-15** — archived for shipping. The `ux-wireframes` delta was folded into `openspec/specs/ux-wireframes/spec.md` at the previous checkpoint — 6 requirements modified in place keeping their original order, 9 appended — and re-verified requirement-for-requirement before the move: every added requirement present, every modified body applied, no scenario dropped, and no removals or renames in the delta. `openspec validate --specs` passes 30 of 30. The change now sits at `openspec/changes/archive/2026-09-15-add-review-html/`, ahead of the delegated final checkpoint and the squash-merge. One process note, and it is the second run in a row to hit it: bare `/ship` arrived on a planned-but-unimplemented change (0 of 26 tasks) **and** on a branch whose name did not match the change (`interactive-proposal-viewer` vs `add-review-html`). The written pull-in still covers only `/ship <intent>`, so the "never merge as a way of stopping" rule is what sent the run through `/apply`, and the branch was renamed by hand before any push. Stating the bare-`/ship` case outright, and having the runbook reconcile a branch/change mismatch itself, is worth a follow-up change.

<!-- end proposal.md -->
<!-- file design.md utf8 9535 -->
# Design: a review page for every change

## Context

See `proposal.md` — Why. The wireframe kit at `.claude/skills/plan/references/wireframe-kit.html` owns the chrome, `#/<screen>/<state>` routing, the state switcher, `data-go` navigation, and the callout and notes conventions; it becomes the review kit. `.claude` is a symlink to `.agents`, so every edit lands on an `.agents/` path.

Constraints that shape the approach:

- The file opens from `file://` with no server, now and years later from the archive. `fetch` of a sibling is blocked there and an iframe cannot be scripted across files, so everything is inline. WebKit browsers can refuse `localStorage` and `history.replaceState` on `file://`, which is what blanked the first spike in the user's browser.
- `/save` regenerates the PR body from the change on every checkpoint and stages `openspec/changes/<name>/` whole. The sync hooks into Step 4 after the plan sections are updated in place.
- Node is present wherever WongStack runs because the OpenSpec CLI needs it.
- The proposal rule keeps What Changes to a bullet list with bold, code, and links, which bounds the Markdown the panel renders.
- The proposal is drafted before any visual exists, so anchors are appended to its bullets after the file is written.

## Goals / Non-Goals

**Goals:**

- One file per change: read the argument, click a bullet, see the thing, annotate it.
- The panel never lags the proposal.
- A bounded visual vocabulary so the drawing pass is short and every file reads the same.

**Non-Goals:**

- Rendering arbitrary Markdown; the renderer degrades to plain paragraphs.
- Syncing notes between machines; the copied block is the transport.
- A fifth visual kind, until three changes have wanted the same one.

## Decisions

1. **The list is the navigation; the stage shows one visual.** The screen switcher goes; bullets replace it, and the state switcher appears only for a visual with more than one state. `data-go` still walks between screens. A screen no bullet or `data-go` reaches is the critic's dead-end check. The landing view is the Why and the numbered list, so the first thing on the stage is the argument.
2. **Four kinds, each a few CSS classes.** `screen` keeps every wireframe primitive and rule. `flow` is `.lane` rows of `.step` boxes and `.arrow`s with a today lane drawn dashed and muted; its states are `after` and `today`, and the inactive lane dims. `diff` is two labelled `<pre>` columns whose lines are `.line`, `.del`, or `.add`, with added lines bearing the accent bar. `tree` is a list whose items are `.add`, `.edit`, or `.del` with a `+`, `~`, or `−` marker and an optional why. A bullet with no anchor opens a text stage. Alternative: let the model write free HTML per bullet. Rejected because every file would look different and the critic's checks would stop being mechanical.
3. **Anchor `#/<visual>[/<state>][/<mark>]`, state optional.** The router reads the segment after the visual as a state if the visual declares it, else as a mark with the default state. So `#/list/search`, `#/list/empty/create`, `#/receive-flow/after/new`, and `#/list-rule/added` all read naturally. The canonical hash written back includes the state only for a multi-state visual. Cost: a mark must not reuse a state name; the critic checks it. The bullet record stores the resolved state and mark, not the raw segments, because the first spike stored the mark in the state slot and the panel never lit the bullet.
4. **Markdown inline, rendered by the kit; a script at `/save` fills it.** `.agents/skills/save/scripts/sync-review-proposal.mjs` takes the change root, extracts `## Why` and `## What Changes` up to the next `## `, and replaces the text between `<!-- proposal:start -->` and `<!-- proposal:end -->` inside `<script type="text/markdown" id="proposal">`. Exit 0 with a one-line message when there is no file or no markers; writes only when the content differs. `/save` runs it after 4a for an active change and against `CHANGE_ROOT` for an archived handoff; `/plan` runs it once the file exists. Invoked by repo-relative path like the other skill scripts.
5. **The review stage replaces the UX stage's file output and runs for every change.** Same three steps: design subagent, critic, one revision round, then append. The subagent reads the proposal, the draft design, the kit, and, for a UI-bearing change, `wiki/ux-principles.md` and the closest existing screens; it writes `review.html` with one visual per bullet and returns the bullet-to-anchor map, plus the `## UX` text when the change has a screen. The critic's mechanical list: every anchor resolves, every declared state has a block, one primary per state, no unreachable visual, no mark named like a state, no network reference, no CSS added to the kit. Step 3 appends the anchors to the proposal's bullets in place and runs the sync script.
6. **Annotate is a mode; pins attach to elements.** As settled by the first spike: a toggle and the `a` key, hover outline, note box beside the element (right if room, else below, else above), numbered pins, list in the panel, edit or delete from the pin, Escape closes. Annotatable elements now include `.step`, `.lane .label`, `.diff .line`, `.diff pre`, `.tree li`, `.caption`, and the text stage's paragraphs. A note stores the visual id, the state, a child-index path from the visual root, and a label; on render a label mismatch marks the pin as possibly moved. Row labels join cells with ` · `; a panel item is labelled `bullet`.
7. **Storage key `rv-notes:<change>`; clipboard with fallback.** All `file://` pages share one origin, so the change name is the key. `navigator.clipboard.writeText` when present, else `execCommand('copy')` on a hidden textarea, then a toast.
8. **Nothing at the top level may throw, and a throw is shown.** Storage access sits behind an accessor that falls back to memory; `replaceState` falls back to setting `location.hash`; a `window` error listener writes the message and line into the panel; no optional chaining or optional catch binding. Verification stays two-sided: agent-browser proves behaviour in Chrome, the user opens the file in their own browser for WebKit.
9. **One accent colour for reviewer affordances.** Marks, pins, the current bullet, added diff lines, added tree entries, and the Annotate button share one blue. Red stays for reasoning callouts. Screens stay grey.
10. **One breakpoint; the list becomes a sheet; stepping replaces scanning.** Below 760px the layout is a single column: the chrome carries a Changes button that opens the panel as a fixed full-screen sheet under the chrome, and choosing a bullet closes it. Previous and next buttons with a `3 / 7` counter step through bullets, on desktop too, with the arrow keys; from the landing, next opens bullet 1. The chrome's real height is written to a CSS variable on load and resize, because it wraps on a phone and the sheet and the sticky panel sit under it. The note box is docked to the bottom with a 16px textarea, since iOS zooms a smaller field. A diff stacks. Alternative: a separate mobile page. Rejected; one file, one layout with a breakpoint.
11. **A screen carries its phone layout in the same markup.** `body[data-viewport]` is `phone` or `desktop`; the toggle in the chrome sets it, shows only for a screen, and hides at phone width where the media query sets it. `phone-only` and `desktop-only` hide by viewport. Phone view narrows the frame to 390px. The design subagent draws the phone layout first when the brief says phone, using the helpers for what differs, and the critic checks each state at phone width for overflow. Alternative: a second screen per viewport. Rejected; it doubles the states and the primary-action count would drift between copies.
12. **The spec keeps its `ux-wireframes` path.** OpenSpec cannot rename a capability, and the walk-to-verify rename kept `staging-walkthrough`. Its Purpose line is edited directly in `openspec/specs/`.
13. **Major version.** A payload file is renamed and a convention every downstream target follows changes shape; the walk-to-verify rename was 12.0.0 on the same grounds. A reviewer who reads it as additive can make it 12.8.0 at no cost.

## Risks / Trade-offs

- **Every `/plan` draws visuals, including for a one-line prose change.** → The vocabulary bounds the pass; a prose change is one `diff` or a text stage.
- **The kit roughly doubles in size.** → Still one dependency-free file. The fill rules for screens are unchanged; the header comment says which parts are machine-filled or reviewer-only.
- **A mark named like a state resolves as the state.** → Named in the fill rules and the critic's list; the second spike hit it.
- **Anchors clutter `proposal.md` on a forge.** → The same anchors tasks use, as a trailing link a forge renders.
- **A regenerated file orphans notes.** → Pins show as possibly moved; the reviewer copies and clears.
- **Driving the file with agent-browser matches hidden visuals, and a reopened tab can serve a stale copy.** → Scope selectors to `.visual[data-active]`; reload after editing and check the page source carries the edit before trusting a run.
- **A target with a `wireframe.html` in flight.** → The file keeps rendering; it is not resynced. The changelog says to rename or replan.

## Migration Plan

Meta-repo: `git mv` the kit, then extend it; delete nothing else. Downstream: the next `/wong-sync` proposes the rename and the edits; the stale kit file is the ordinary untouched-orphan case.

<!-- end design.md -->
<!-- file tasks.md utf8 7600 -->
## 1. The kit (`.agents/skills/plan/references/review-kit.html`)

- [x] 1.1 `git mv` `wireframe-kit.html` to `review-kit.html`; retitle the chrome `Review · CHANGE-NAME`; add the panel-plus-stage layout, the `<script type="text/markdown" id="proposal">` block with `<!-- proposal:start -->` / `<!-- proposal:end -->` markers, and the two reserved stages `_landing` and `_text`
- [x] 1.2 Add the panel and landing renderer: Why paragraphs; the numbered What Changes list with each bullet's kind and anchor, `dead` with the reason when it resolves to nothing, `text` when it has none; trailing paragraphs; a Notes heading and list; the landing stage shows the Why and the clickable list
- [x] 1.3 Extend routing to `#/<visual>[/<state>][/<mark>]`: a segment that names a state is the state, otherwise it is a mark with the default state; the canonical hash carries the state only for multi-state visuals; the bullet record stores the resolved state and mark; `#/change/<n>` opens bullet n; marks highlight; the current bullet is marked; the state switcher shows only for a visual with more than one state; `replaceState` falls back to `location.hash`
- [x] 1.4 Add the `flow`, `diff`, and `tree` primitives and the text stage per design decision 2, each accepting `data-mark` and an optional notes block; a flow's inactive lane dims per its state; keep every screen primitive as it is
- [x] 1.5 Add annotate mode per design decision 6 on every visual kind and the panel, with the note box beside the element and never over it, storage behind a guarded accessor under `rv-notes:<change>`, and stale detection
- [x] 1.6 Add Copy notes: `/continue <change>`, then `Review notes from review.html (<n>):`, then `<location> · <label> — <text>` per note; `navigator.clipboard` with an `execCommand('copy')` fallback and a toast
- [x] 1.7 Add the phone layout per design decision 10: the 760px breakpoint, the Changes button and the panel as a full-screen sheet that closes on choosing a bullet, previous and next buttons with the position counter and arrow keys, the chrome height written to `--chrome-h` on load and resize, the note box docked to the bottom with a 16px textarea, stacked diff columns, and `setSelectionRange` in the copy fallback for iOS
- [x] 1.8 Add the phone view for screens per design decision 11: `body[data-viewport]`, the View toggle shown only for a screen and hidden at phone width, `phone-only` and `desktop-only` helpers, the frame at 390px in phone view, and the example list screen carrying a phone layout with a callout that says why
- [x] 1.9 Add the on-page error banner and keep the script free of optional chaining and optional catch binding; confirm no top-level statement can throw before the first render
- [x] 1.10 Rewrite the kit's header comment: how to fill each visual kind, `data-mark` and the rule that a mark never shares a state's name, the proposal block is machine-filled, the panel and annotate layer are reviewer chrome; replace the example content with two screens, one flow, one diff, one tree, one text bullet, and one deliberately dead anchor
- [x] 1.11 Drive the kit with agent-browser from a `file://` URL after a fresh reload, scoping selectors to `.visual[data-active]`: landing shows Why and the list; each example bullet opens its visual with the right hash, marks, and current entry; the dead anchor renders dead; the text bullet opens the text stage; a deep link opens the right visual and state; an annotate click on a `data-go` button opens the note box and does not navigate; notes on a flow step and a diff line save, survive reload, and copy in the specified shape; the document holds no `src`, `link`, or `script` network reference; then at a 390×844 viewport: no horizontal overflow, the Changes sheet opens and closes on a pick, next steps the counter, the note box docks to the bottom, and on desktop the Phone view narrows a screen and hides its `desktop-only` elements
- [x] 1.12 Ask the user to open the kit in their own browser and confirm it renders, since the first spike's blank page came from a WebKit-only failure headless Chrome cannot reproduce
- [x] 1.13 Delete the untracked spike `review-sample.html` at the worktree root

## 2. The sync script (`.agents/skills/save/scripts/sync-review-proposal.mjs`)

- [x] 2.1 Write it with no dependencies: one argument, the change root; read `proposal.md`; take `## Why` and `## What Changes` up to the next `## `; replace the text between the markers in `review.html`; exit 0 with a one-line message when there is no file or no markers; write only when the content differs
- [x] 2.2 Check it by hand on a scratch copy of the kit and a proposal: run, the sections are spliced; edit the proposal and run, only the edit changes; run again, no diff; run against a folder with no file and a copy without markers, both report and exit 0

## 3. Skills

- [x] 3.1 `.agents/skills/plan/SKILL.md`: the UX stage becomes the review stage and runs for every change per design decision 5; the design subagent's reading list, outputs, and the bullet-to-anchor map; the critic's mechanical list; step 3 appends anchors to the proposal's bullets and runs the sync script; `### Wireframes` becomes `### Review`; the skill description says every change gets a review page
- [x] 3.2 `.agents/skills/save/SKILL.md` Step 4: after 4a, run `node "$ROOT/.claude/skills/save/scripts/sync-review-proposal.mjs" "$CHANGE_ROOT"` on every route that has a change, active or archived handoff; say the file is staged with the change folder
- [x] 3.3 `.agents/skills/continue/SKILL.md`: an instruction that starts with `Review notes from review.html` is folded into the change through `openspec-update-change` before any task is worked, and the Decision log records which notes changed what
- [x] 3.4 `.agents/skills/save/references/git-gate.md`: the `## Wireframe` PR body section becomes `## Review`, linking `review.html` and saying to open it, walk it, annotate, and paste the notes into `/continue`

## 4. Rules, wiki, and spec

- [x] 4.1 `openspec/config.yaml`: the proposal rule states the bullet anchor convention; the design rule says every change writes `review.html` from the review kit with one visual per bullet and the `## UX` section only for a screen; the tasks rule cites `review.html` anchors
- [x] 4.2 `wiki/ux-principles.md`: `### Wireframes` becomes `### Review`; the wireframe file section becomes the review file, covering the four kinds, marks, the panel, and annotate-and-copy, with what an author does and what the tooling does; the context-of-use bullet says a phone-first brief means the phone layout is drawn first and walked in Phone view, and the review stage's critic checks it at phone width
- [x] 4.3 `.agents/skills/wong-sync/references/payload-manifest.md`: `review-kit.html` replaces `wireframe-kit.html` in the reference-directory list with its paragraph updated, and the skill-scripts enumeration names `save/scripts/sync-review-proposal.mjs`
- [x] 4.4 `openspec/specs/ux-wireframes/spec.md`: edit the Purpose line to describe the review page
- [x] 4.5 Sweep for the old names: `grep -rn "wireframe" .agents wiki openspec/config.yaml README.md CLAUDE.md` and update every mention that describes current behaviour, leaving archives and the changelog history alone

## 5. Release

- [x] 5.1 `VERSION` 12.7.0 → 13.0.0 and a newest-first `CHANGELOG.md` entry that explains the review page, the four kinds, annotate-and-copy, the sync at `/save`, and what a target with a `wireframe.html` in flight does
- [x] 5.2 `node scripts/check-payload-links.mjs` reports no dead links

<!-- end tasks.md -->
<!-- file specs/ux-wireframes/spec.md utf8 15566 -->
## ADDED Requirements

### Requirement: The What Changes list is the navigation

`review.html` SHALL show a panel with the proposal's `## Why` and a numbered list of its `## What Changes` bullets, and a stage that shows one visual at a time. On open with no fragment the stage SHALL show the Why and the numbered list. Choosing a bullet SHALL show its visual with its marked elements highlighted and SHALL mark that bullet as current. A bullet with no anchor SHALL open a text stage that shows the bullet in full and says it has no visual. Two bullets MAY share one visual. The panel SHALL show each bullet's visual kind beside its anchor.

#### Scenario: The file opens

- **WHEN** a reviewer opens `review.html` from a clone with no server and no network
- **THEN** the panel shows Why and the numbered What Changes list, and the stage shows the Why and the list

#### Scenario: A bullet is chosen

- **WHEN** the reviewer clicks bullet 3, whose anchor is `#/receive-flow/after/new`
- **THEN** the stage shows the `receive-flow` visual in its `after` state with every `new` element highlighted, and bullet 3 is marked current

#### Scenario: A bullet has no visual

- **WHEN** the reviewer clicks a bullet with no anchor
- **THEN** the stage shows that bullet's text and says it has no visual, and the bullet is marked current

### Requirement: Four visual kinds

The kit SHALL provide four visual kinds, each self-contained: `screen`, the low-fidelity wireframe with its states, marks, and primitives; `flow`, lanes of steps with a today lane and an after lane; `diff`, before and after text with added lines marked; and `tree`, a file list with added, edited, and removed markers. Every kind SHALL accept `data-mark` on its elements and a notes block beside it. The design subagent SHALL choose the kind per bullet and SHALL NOT invent a fifth.

#### Scenario: A process change

- **WHEN** a bullet describes a change to a sequence of steps
- **THEN** its visual is a `flow` with a today lane and an after lane, and the changed steps carry a mark

#### Scenario: A text change

- **WHEN** a bullet describes a change to a rule, a config value, or prose
- **THEN** its visual is a `diff` whose added lines carry a mark

#### Scenario: A files change

- **WHEN** a bullet lists files added, edited, or removed
- **THEN** its visual is a `tree` with one entry per file and its marker

### Requirement: A bullet links its visual

A What Changes bullet with a visual SHALL end with `(review.html#/<visual>[/<state>][/<mark>])`. When the segment after the visual names one of its states it SHALL be read as the state; otherwise it SHALL be read as a mark and the state SHALL default. A mark SHALL NOT share a name with a state of the same visual. The panel SHALL render the bullet as a link and SHALL show an anchor that names no visual, state, or mark as dead with the reason. The URL fragment SHALL accept the same form so a view is addressable.

#### Scenario: The state is omitted

- **WHEN** a bullet's anchor is `#/list/search` and `search` is not a state of `list`
- **THEN** choosing it shows `list` in its default state with the `search` elements highlighted

#### Scenario: A deep link

- **WHEN** the file is opened at `review.html#/list/empty/create`
- **THEN** the `list` screen shows its empty state with the `create` elements highlighted and the matching bullet is current

#### Scenario: A dead anchor

- **WHEN** a bullet's anchor names a mark no element in that visual carries
- **THEN** the panel shows the anchor struck through with the reason and the critic names the bullet

### Requirement: The proposal text is resynced by `/save`

`review.html` SHALL carry the proposal's `## Why` and `## What Changes` as Markdown between a `proposal:start` marker and a `proposal:end` marker. The kit SHALL render paragraphs, bullet lists, bold, inline code, and links. `/save` SHALL replace the text between the markers with the current sections of `proposal.md` on every checkpoint whose change has the file, and SHALL report and change nothing when the file or the markers are absent. `/plan` SHALL fill the block once the file is written.

#### Scenario: The proposal changes after the file was written

- **WHEN** What Changes is edited during `/apply` and `/save` runs
- **THEN** the text between the markers equals the proposal's current Why and What Changes

#### Scenario: No file or no markers

- **WHEN** `/save` runs for a change without `review.html`, or with one that has no markers
- **THEN** nothing is written and the checkpoint reports it and proceeds

### Requirement: A reviewer annotates in place and copies the notes

`review.html` SHALL offer an annotate mode that is off when the file opens. When it is off, a click SHALL navigate as before. When it is on, a click on an element of the active visual or of the panel SHALL open a note box beside that element, never over it, without navigating, and the state switcher SHALL keep working. Saving SHALL attach a numbered pin to the element and list the note in the panel. Notes SHALL persist across reloads on the same machine, keyed by change name, and SHALL NOT be written to any repository file. A copy action SHALL place on the clipboard a block whose first line is `/continue <change-name>`, whose second line is `Review notes from review.html (<n>):`, and which then carries one numbered line per note as `<location> · <element label> — <text>`, where the location is `#/<visual>[/<state>]` or the panel. A pin whose element no longer matches its saved label SHALL be shown as possibly moved.

#### Scenario: Annotate mode intercepts a click

- **WHEN** annotate mode is on and the reviewer clicks a button that carries a navigation target
- **THEN** a note box opens beside the button and the stage does not change

#### Scenario: A note on a non-screen visual

- **WHEN** the reviewer saves a note on a step of a `flow`
- **THEN** a pin appears on that step and the note's location is the flow's anchor

#### Scenario: Notes survive a reload

- **WHEN** the reviewer reloads the file
- **THEN** every saved note and pin is still there and annotate mode is off

#### Scenario: The notes are copied

- **WHEN** the reviewer activates Copy notes with two notes saved
- **THEN** the clipboard holds a block starting with `/continue <change-name>` and two numbered lines, each with a location, an element label, and the text

### Requirement: The copied block is a `/continue` instruction

When `/continue <name>` receives an instruction that begins with `Review notes from review.html`, it SHALL fold the notes into the change's artifacts through the update step before working any task, and SHALL record in the Decision log which notes changed what.

#### Scenario: A review block is pasted

- **WHEN** the user runs `/continue add-po-search` followed by a copied review block
- **THEN** the change's proposal, design, or tasks are revised for the notes before implementation resumes, and the Decision log records it

### Requirement: The page works on a phone

Below a phone-width breakpoint, `review.html` SHALL show the stage at full width with no horizontal overflow, SHALL offer the What Changes list as a full-screen sheet opened from a button in the chrome and closed by choosing a bullet, SHALL offer previous and next controls that step through the bullets and show the position, SHALL dock the note box to the bottom of the screen with a text field of at least 16px, and SHALL stack a `diff`'s columns. The stepping controls SHALL also work at desktop width, with the left and right arrow keys.

#### Scenario: Opened on a phone

- **WHEN** the file is opened at a phone width
- **THEN** the stage fills the width, nothing scrolls sideways, and the list is behind a Changes button

#### Scenario: Stepping through changes

- **WHEN** the reviewer taps next twice from bullet 1
- **THEN** the stage shows bullet 3's visual and the chrome reads `3 / <n>`

#### Scenario: A note on a phone

- **WHEN** annotate mode is on at phone width and the reviewer taps an element
- **THEN** the note box appears docked to the bottom of the screen and the keyboard does not zoom the page

### Requirement: A screen can be walked at phone width

A `screen` visual SHALL be walkable at phone width. The chrome SHALL offer a View toggle, Desktop or Phone, whenever the active visual is a screen; at phone width the phone view SHALL apply without the toggle. The kit SHALL provide `phone-only` and `desktop-only` helpers so one screen carries both layouts. When the use-case brief says the job is done on a phone, the review stage SHALL draw the phone layout first and the critic SHALL check the screen at phone width.

#### Scenario: Phone view from a desktop

- **WHEN** a reviewer on a desktop chooses Phone with a screen on the stage
- **THEN** the frame narrows to phone width, `desktop-only` elements hide, and `phone-only` elements show

#### Scenario: A phone-first brief

- **WHEN** a design's brief says operators use the screen on a phone
- **THEN** the screen visual carries a phone layout, and the critic reports any state that overflows at phone width

### Requirement: The file cannot fail silently

The kit SHALL execute no statement at load time that can throw before the first render on `file://`; storage and history access SHALL be guarded with fallbacks. A script error SHALL be written into the panel with its line number. The script SHALL parse in an older embedded engine, using no optional chaining or optional catch binding.

#### Scenario: Storage is refused

- **WHEN** the browser refuses localStorage on `file://`
- **THEN** the file renders, notes work until reload, and no error is shown

#### Scenario: A script error

- **WHEN** a statement in the kit throws at load
- **THEN** the panel shows the message and line instead of a blank stage

## MODIFIED Requirements

### Requirement: A UI-bearing change carries one wireframe file

Every change `/plan` drafts SHALL carry `openspec/changes/<name>/review.html`. The file SHALL be self-contained: it SHALL load no script, style, font, or image from a network address, so it renders when opened from disk with no server. A change that adds or restructures a user-facing screen SHALL draw that screen as a `screen` visual and SHALL keep a `## UX` section in `design.md`; a UI-less change SHALL have no `## UX` section and no `screen` visual, and SHALL still have the file with its other visual kinds.

#### Scenario: A screen is added

- **WHEN** `/plan` drafts a change whose design adds a page or component
- **THEN** `review.html` exists when the plan is apply-ready and contains a `screen` visual for it
- **AND** the file is committed and archived with the change like `design.md`

#### Scenario: The file opens from disk

- **WHEN** a reviewer opens `review.html` from a clone with no server running and no network
- **THEN** every visual and state renders and navigation works

#### Scenario: A UI-less change

- **WHEN** `/plan` drafts a worker-only, CLI, library, or prose change
- **THEN** `review.html` exists with `flow`, `diff`, `tree`, or text visuals and no `screen`, and `design.md` has no `## UX` section

### Requirement: The wireframe covers the flow at low fidelity

A `screen` visual SHALL follow the design's flow: every screen in the flow appears, each with its empty, loading, and error states where the design names them. At most one primary action SHALL be visible at a time, counted per state rather than per screen, because markup outside a state block shows in every state; clicking it SHALL navigate to the next screen in the flow. The rendering SHALL be grey-box: no brand colours, no design-system tokens, no product typography.

#### Scenario: Every state is reachable

- **WHEN** the design's flow names a list screen with empty and error states
- **THEN** the file offers a state switch for that screen that shows each state
- **AND** each state is addressable by URL fragment `#/<screen>/<state>`

#### Scenario: The primary action navigates

- **WHEN** a reviewer clicks the screen's one primary action
- **THEN** the file shows the screen the flow says comes next

#### Scenario: Two filled buttons in one state

- **WHEN** a screen's header carries a primary action and its empty state adds an inline one
- **THEN** the critic counts two primary actions visible in the empty state
- **AND** the critique names it as a hierarchy violation and the revision round removes one

### Requirement: Screens carry the reasoning beside them

Each `screen` visual SHALL carry a notes block with the use-case brief in one line and numbered callouts that explain the layout choices that matter. Other visual kinds MAY carry a notes block. A reader SHALL get the intent without opening `design.md`.

#### Scenario: A reviewer reads a callout

- **WHEN** a visual marks an element with a numbered callout
- **THEN** the notes block below that visual has a matching numbered entry

### Requirement: The design text links the file instead of sketching

The `### Review` subsection of a UI-bearing `design.md` SHALL link `review.html` and list its screens and states by anchor. It SHALL NOT contain ASCII sketches. The brief, flow, hierarchy, and components subsections SHALL stay in `design.md` as text.

#### Scenario: The critic reads both

- **WHEN** the critic subagent reviews the review stage output
- **THEN** it reads the `## UX` text, when present, and the file
- **AND** it judges whether every screen serves the stated job from both

### Requirement: Tasks and the PR body point at the wireframe

A task that builds or edits something a visual shows SHALL cite it as a `review.html#/<visual>[/<state>][/<mark>]` anchor. The PR body that `/save` regenerates SHALL carry a `## Review` section linking `openspec/changes/<name>/review.html` on the branch when the file exists, saying to open it, walk it, annotate, and paste the notes into `/continue`, and SHALL omit the section when it does not.

#### Scenario: A UI task cites its screen

- **WHEN** `/plan` writes a task that builds a screen
- **THEN** the task names the anchor, for example `Build the list view per review.html#/list/default`

#### Scenario: The PR body links the file

- **WHEN** `/save` regenerates the PR body for a change with `review.html`
- **THEN** the body has a `## Review` section whose link resolves to the file on the branch

#### Scenario: No wireframe on the branch

- **WHEN** `/save` regenerates the PR body for a change without `review.html`
- **THEN** the body has no `## Review` section

### Requirement: The wireframe is filled from a fixed kit

The plan skill SHALL ship a review kit that owns the reviewer chrome, the routing, the panel and landing, the four visual kinds and their primitives, the callout and notes conventions, the mark highlight, and the annotate layer. The design subagent SHALL fill the kit with visuals and `data-mark` tags and SHALL NOT restyle it, add dependencies to it, or raise its fidelity. The proposal block SHALL be filled by the sync script, not by hand. The kit SHALL reach every repo that installs the plan skill.

#### Scenario: Two changes look alike

- **WHEN** two different changes produce review files from the kit
- **THEN** both show the same chrome, panel, primitives, pin and callout style, and differ only in visuals, marks, and proposal text

#### Scenario: The kit installs with the skill

- **WHEN** `/wong-sync` copies or adapts the plan skill into a target
- **THEN** the kit arrives with it under the skill's `references/` directory

<!-- end specs/ux-wireframes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-15

~~~
<!-- end .openspec.yaml -->
