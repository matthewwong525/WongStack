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
