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
