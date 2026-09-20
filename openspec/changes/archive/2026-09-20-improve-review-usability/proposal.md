# Improve review usability

**Status:** ready-to-ship
**Open questions:** none

## Why

Review pages can separate explanations from their visuals, show unrelated content, and block change navigation while the reviewer adds notes. Reviewers need to read the full change text, understand its workflow, and leave feedback in one clear scrolling view on a phone or desktop.

## What Changes

- Give each What Changes item its own focused view with its full text above its visual, consistent spacing, and ordinary vertical scrolling. Use the page's single change list beside the content on desktop and behind a Changes button on mobile, with Previous and Next controls. Do not repeat that list inside a visual. (review.html#/focused/default/reading)
- Show workflow steps as connected cards in order, with each card's title, short description, change label, and expandable Details inside it. Show labeled branches that split and rejoin when a workflow has more than one path. Stack workflows and comparisons at narrow widths so the page stays readable without sideways scrolling. (review.html#/workflow/default/ordered)
- Make the change list navigation only: clicking its labels never opens a note, including in annotation mode. Keep visual interaction within the selected What Changes item; Details and state controls stay usable while a click on an annotatable step starts a note. (review.html#/annotation/editor/controls)
- Keep unfinished notes as drafts attached to their original change item, visual, state, and target when the reviewer moves elsewhere. Show draft indicators, require an explicit Save to include feedback, and copy saved notes only. (review.html#/drafts/default/retained)
- Apply the new layout and interactions to pages created from the updated shared kit. Guard visual visibility against layout-class collisions and add repeatable coverage for layout, navigation, and drafts. (review.html#/rollout/new-pages)

**Non-goals:** Pan or zoom controls, dragging or rearranging content, an overview board, upgrading existing or archived review pages, a new hosting service, and collaborative or server-stored notes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: Focused change views, responsive workflows and details, annotation-safe navigation, draft retention, and generation-only rollout.

## Impact

The implementation changes `.agents/skills/plan/references/review-kit.html`, its authoring guidance in `.agents/skills/plan/SKILL.md` and `openspec/config.yaml`, and review behavior coverage in the existing `app/` test suite. Browser coverage can also require test-only dependency and CI setup changes in `app/` and `.github/workflows/test.yml`. The `.claude` path refers to the same skill files through a symlink. The payload release includes `VERSION` and `CHANGELOG.md`. No external API or runtime dependency is needed in generated pages. Existing review files retain their embedded kit and are not rewritten.

## Decision log

- 2026-09-20: Asked what “worktrees” meant → user clarified **workflows**.
- 2026-09-20: Asked how to organize changes → chose one focused view per What Changes item with a persistent change list; related screens stay inside that item.
- 2026-09-20: Asked what dragging meant → initially chose moving the viewing area and zooming, without rearranging content. Later custom answer superseded this: pan and zoom are not needed if ordinary scrolling is friendly and clear.
- 2026-09-20: Asked how to explain workflows → chose a step diagram with clearly marked changes and clickable details.
- 2026-09-20: Asked what a step click does during annotation → chose starting a note, with a separate Details action for inspection; navigation remains usable.
- 2026-09-20: Asked what happens to unfinished text on navigation → chose retaining a draft on the original change, with explicit Save before it enters copied feedback.
- 2026-09-20: Asked which pages receive the change → chose new pages only; existing review files keep their current behavior.
- 2026-09-20: Asked about device support → custom answer required good UI on both mobile and desktop, ordinary scrolling, and the actual What Changes text at the top of every change for easy reading.
- 2026-09-20: Explore-to-plan transition → no further questions; material choices above are settled.
- 2026-09-20: One focused “page” → assumed one routed view inside the existing standalone HTML file (preserves offline opening and current links).
- 2026-09-20: Workflow details → assumed in-flow expandable details, rather than a separate side panel (keeps the context readable on both device sizes). Later review refined this to place Details inside each step card.
- 2026-09-20: Draft lifetime → assumed browser-local persistence across reloads when storage is available, with an in-memory fallback (matches the existing saved-note model and protects unfinished work).
- 2026-09-20: Scroll on changing an item → assumed scroll to the selected item's full text; opening or closing step details preserves the current position (makes the new context clear without moving the page unnecessarily).
- 2026-09-20: Phone entry → assumed the existing change-list-first behavior remains; selecting an item opens its focused view (preserves the current entry contract).
- 2026-09-20: Repeated review behavior → use deterministic shared kit code and automated regression coverage; the author supplies the visual content and reasoning, not a new layout implementation on every run.

- 2026-09-20: Review assumptions → keep step details in the reading column and preserve the existing phone Changes sheet; these use the current navigation model and fit both device sizes. Frequency estimates in design.md are planning assumptions, not observed usage.
- 2026-09-20: Critic found an oversized desktop navigation column, shared Details destinations, and inconsistent sample note context → use the kit's existing asymmetric layout for the mockup, give each step its own details, and keep sample target context explicit. These are review-layout assumptions; they do not change the selected scope.
- 2026-09-20: User reviewed the mockup and rejected annotation on the outer What Changes list, cross-change links inside a visual, and the second What Changes list drawn within the visual. Each item now has one self-contained view; only the outer list and Previous/Next select another item. The current planning file uses the older embedded kit until its source is updated during implementation.
- 2026-09-20: User found the workflow preview's steps overlapping and asked how a flow with multiple branches would look → use block steps with clear gaps, and add a split/three-path/rejoin example inside the same change's visual. The branch labels name the conditions so the phone stack reads as alternatives, not a sequence.
- 2026-09-20: User found the revised straight steps harder to read than the three-way branch cards → make every sequence step a connected card with its title, description, change label, and Details inside the same border. The separate Details action still works during annotation.
- 2026-09-20: The shared kit, authoring rules, browser regression suite, and release entry now implement the approved new-pages-only plan. The earlier branch named `explore-review-html-ux` was renamed to `improve-review-usability` so the branch and change match; CI verification remains the final implementation task.
- 2026-09-20: The `/save` checkpoint opened PR #88 and CI passed after two browser-test timing and selector fixes. The full 17-task implementation is ready for archive and merge.
- 2026-09-20: `/ship` archived the complete change after confirming the delta requirements were already present in `openspec/specs/ux-wireframes/spec.md`; the archive move is the final PR checkpoint before merge.
