## Context

See [proposal.md](proposal.md) for the problem, scope, and user decisions. The current standalone kit in `.agents/skills/plan/references/review-kit.html` parses the embedded proposal, resolves visual/state/mark fragments, and stores saved notes in the browser. `.agents/skills/save/scripts/sync-review-proposal.mjs` fills the proposal block. The closest existing screens are the kit's desktop stage and its phone Changes sheet; retain their navigation model.

Two current details shape the change. The global annotation click handler runs before the change-list handler, so a list click starts a note. The generic `.diff` grid rule can override `.visual { display:none }` if an author puts both classes on a section, splitting its caption and frame into columns. This is a plausible cause of the supplied screenshots, not a confirmed diagnosis of their source HTML. The current kit example correctly uses an outer `diff-visual` and an inner `diff`.

## Goals / Non-Goals

**Goals:** Make the active item, its complete text, and its visual one coherent view. Keep review controls operable during annotation. Retain drafts without promoting them into feedback. Support the same review job on phone and desktop with shared, deterministic kit behavior.

**Non-Goals:** See the proposal. This plan does not update the distributed kit. The review mockup pictures the proposed controls and includes a small local navigation fix so the current planning file can be reviewed. No framework, server, or new network dependency is required for generated pages.

## Decisions

### 1. Keep one document and make item selection explicit

Track the selected proposal item independently of the current visual/state/mark. The stage header renders the selected item's full parsed Markdown text, without its trailing machine anchor, before the visual. Use the same parsed source as the navigation list; do not author a second summary. Preserve bold, inline code, and links. A text-only fallback uses the same header, followed by a short explanation. Empty proposals show the existing empty message and disabled stepping controls.

Each What Changes item owns one unique stage visual. A visual may have several states, but its interactive controls only change that item's state, reveal its details, or edit feedback attached to that item. They never select another What Changes item. Only the single outer change list and its Previous/Next controls change the selected item. A direct link names that item's visual and optional state or mark. An invalid direct link uses the existing fallback instead of selecting an unrelated item.

Separate HTML files would duplicate navigation and browser storage. A board would reintroduce spatial navigation that the user removed from scope. A second change list inside each visual duplicates the page's navigation and makes the current item unclear, so visual authors do not draw one.

### 2. Use normal document flow and robust visual boundaries

The page scrolls vertically. Keep the desktop change list sticky with its own overflow for long lists; the main review content uses the page scrollbar. The selected full text stays above the visual in normal flow rather than occupying a large sticky header. On item selection, bring that header into view below the toolbar. Details toggles and note editing do not reset the page position.

Use one stage width and spacing scale for its header, caption, visual frame, and reasoning. Remove artificial screen minimum heights that produce blank space where the content is short. Let long text wrap and make grid/flex children shrink. Render each straight-flow step as one block card with its title, short description, change label, and Details inside the border. Put clear connectors and gaps between cards so nothing overlaps. At phone widths, stack comparison columns, workflow steps, and alternative branches in reading order. At desktop widths, a workflow may use a horizontal row only while it fits clearly; wrapping must not create ambiguous arrows or change the step order.

Scope layout primitives inside a visual frame. Make inactive visual hiding stronger than kind layout rules, and keep the active visual's outer shell a block. This protects against a `visual diff` class collision. Add an explicit fixture for that case rather than claiming to have reproduced the user's unavailable source page.

### 3. Keep the four visual kinds and add workflow details

Retain screen, flow, diff, and tree. A flow shows Today and Proposed sequences as connected cards with text labels for Added, Changed, and Removed, in addition to any color or strike-through. Each card shows a title and short description. Its expandable Details stays inside the card and gives the actor, action, and outcome. Use accessible disclosure controls with visible labels and expanded state. For a branching flow, draw the shared start, a labeled decision, two or more alternative paths with explicit conditions, an explicit join, and the common outcome. Place alternatives beside each other only while they fit; at phone width stack them under “Choose one path” and keep the join label below all alternatives. This preserves the meaning of a branch when connector lines cannot fit.

In ordinary viewing, a step body can open its details. In annotation mode, that same body starts a note; its separate Details control always remains a disclosure action. Details and state links keep the reviewer in the same item. Prefer native disclosure behavior or an equivalent small shared handler over author-written JavaScript. No model is needed to calculate spacing, navigation, or disclosure behavior on each generation.

### 4. Handle review controls before annotation targets

Treat the outer change list as navigation only. Neither its labels nor its background starts a note, including in annotation mode. A draft badge on an item selects that item and opens its draft in the item's note area. Dispatch Previous/Next, Changes, Tools, in-item state controls, Details, and note-list actions before generic annotation targeting. Use keyboard-operable elements and visible focus; keyboard shortcuts must not intercept typing in inputs, textareas, or editable content.

The annotation toggle stays active until the reviewer turns it off or reloads the page. Clicking an annotatable target in the active visual starts a note while annotation is on. In-item state changes and resize preserve the selected item and any draft. Native touch scrolling must not create a note at the end of a drag gesture.

### 5. Store drafts separately from saved feedback

Use a versioned draft store alongside the existing saved-note store, scoped to the review's change name. A draft contains its proposal-item identity, visual, state, target identity and label, text, and optional saved-note identifier when editing existing feedback. Give authorable targets stable IDs where possible; retain the current path/label checks as a fallback. Do not rely on the current list index alone to identify a note after proposal reordering. Do not silently attach a draft whose target cannot be resolved to a different element.

Persist nonempty text while it is edited, and flush the draft before navigation, closing the editor, or page exit. Switching items hides the editor but leaves its draft on the original target. A visible draft indicator and note list reopen it. Save creates or updates saved feedback and clears that draft; Discard removes only the draft and leaves any previously saved note intact. Merely closing the editor keeps the draft. Empty new drafts are not retained.

Copy notes reads only saved records and preserves the current `/continue` text format. An unsaved edit to an existing note leaves its last saved text in copied feedback until Save is pressed. If storage is refused, retain notes and drafts in memory for the session without blocking the page; make the session-only lifetime clear near the note controls. No note content enters repository files automatically.

### 6. Preserve phone entry and make controls accessible

Retain the existing list-first phone landing behavior, compact toolbar, Changes sheet, and Previous/Next position counter. Choosing an item closes the sheet and exposes the full text at the top. Desktop keeps the list visible. The annotation editor is near the target on desktop and docks on phone; allow the page enough bottom room to reach content when the editor is open. Details, the editor, and navigation remain usable at 320px width and at larger text sizes.

Move focus to the selected heading after deliberate item selection, and return focus to disclosure or editor triggers on close. Changes and Tools expose expanded state. Saved and draft counts have text labels. The flow must be understandable without color, hover, or keyboard shortcuts.

### 7. Generate new pages; leave existing embedded kits alone

Update the kit, its fill instructions, the plan skill's author/critic guidance, and relevant design rules in `openspec/config.yaml`. Keep `wiki/` outside this change. Do not add an automatic page upgrader or change `/save` to replace old embedded CSS/JavaScript. The existing proposal sync script remains the single source of the embedded proposal text.

Use the actual test configuration in `app/package.json` and `app/vitest.config.ts`, rather than the stale config context that says no suite exists. Add behavioral tests that load the shared HTML and exercise routing, annotation dispatch, drafts, and clipboard content through the current test command. Use real-browser coverage for computed layout, visibility, scrolling, touch, and focus; a DOM emulator cannot prove those outcomes. Any necessary browser test setup must run in CI through the existing test entry, without a separate manual gate. Plan browser evidence at 320px, 390px, 760px, and desktop widths, including long text, long tokens, tall flows, and every editor state. Nothing builds locally; CI results come through `/save` during implementation.

## Risks / Trade-offs

- Old pages keep their faults → this is the chosen rollout scope; do not describe the update as repairing past files.
- A review of the review UI can appear to contain two sets of controls → draw the proposed content inside the single outer review shell; never draw a second change list.
- State links can appear to change the selected item → require local state destinations and keep the outer list's current-item marker visible.
- Storage can fail on `file://` → guard access, retain session state, and state its lifetime without breaking review.
- Expanding details creates a longer page → keep each section close to its step and collapsed initially; ordinary scrolling remains the main navigation.
- Draft targets can move after a proposal edit → use stable IDs where available, verify labels, and show unresolved drafts instead of reattaching them silently.
- Layout checks in a DOM emulator give false confidence → require a real browser for viewport and computed-visibility checks.

## Migration Plan

Implement and test the shared kit and generation guidance, then update `VERSION` and `CHANGELOG.md` with the payload release. Run the payload link and OpenSpec config checks. `/save` supplies the CI result. Future `/plan` runs copy the revised kit; existing active and archived pages keep their embedded version. A rollback restores the earlier kit for future generation without deleting local saved notes or drafts.

## UX

### Use-case brief

A reviewer must understand each proposed change and return clear feedback. Done means the reviewer has inspected the relevant items, saved finished notes, and copied them into the agent conversation. The same job must work on desktop and phone, including interruption while writing. Assume a few review sessions per week and several item switches in each session; these are planning assumptions, not measured use. The common path is read, inspect, note, and continue. Edge cases are no notes, text-only items, storage refusal, a moved draft target, and an unsaved edit to saved feedback. Mirror the existing kit's desktop stage and phone Changes sheet, and the archived `phone-review-opens-change-list` review. No separate component system applies to this standalone HTML.

### Flow

Open the review → choose an item from the single change list (the phone starts with Changes) → read its full text → inspect its visual, states, and optional step details without leaving that item → turn on annotation → click a visual target → save a note. The outer list or Previous/Next selects another item. A separate Details action remains available during annotation. Moving away from the editor retains a draft on its original target; the draft badge returns to it. Copy skips drafts, including unsaved edits to an existing saved note. Storage refusal keeps the session usable and states the shorter lifetime.

### Hierarchy

- Focused change: full proposal text first, visual next, optional details and notes afterward. The next review action is primary; desktop navigation remains beside the content and phone navigation opens from Changes.
- Workflow: connected Today and Proposed step cards, each with a title, summary, and any Added, Changed, or Removed label. Each Details control expands within its card. A branch view shows shared start, labeled paths, join, and common outcome. Comment is the next primary action.
- Note editor: target context, draft text, then Save as the sole primary action. Switching and Discard are secondary. On phone the editor docks below the target with enough page space to reach the content.
- Retained draft: original change and target are explicit. Resume draft is primary. Storage and target errors explain recovery without hiding the text.
- Saved feedback: saved and draft counts are distinct. Copy saved notes is primary; editing is secondary.
- Changes: the single outer list and Previous/Next select items. Its labels and background never start notes. A draft badge opens feedback on its own item.
- Copied confirmation: the command and handoff instruction appear inside the selected item's feedback area.

### Component inventory

Reuse the kit's toolbar, single Changes list, stage, state controls, four visual kinds, annotation targets in the visual, note list, and clipboard command format. Add a shared full-item header, accessible step disclosures, branch split/path/join primitives, draft badges, draft recovery, and storage-lifetime feedback. Keep spacing, responsive flow, control dispatch, and persistence in shared deterministic code. Visual authors supply content and stable targets; they do not create a second change list or a fresh event handler for each page.

### Review

The [review page](review.html) uses the current kit to picture five distinct change views. Its outer Changes list is the only change navigation. The planning file has a small local event fix so the list navigates during annotation; the distributed kit receives that behavior during implementation. The visual content remains a planning mockup.

- Focused view: [default](review.html#/focused/default/reading), [empty notes](review.html#/focused/empty-notes), [text-only](review.html#/focused/text-only).
- Workflow: [ordered steps](review.html#/workflow/default/ordered), [expanded details](review.html#/workflow/details), [three branches and join](review.html#/workflow/branches/branching).
- Annotation: [editor](review.html#/annotation/editor/controls), [idle](review.html#/annotation/idle), [editing saved feedback](review.html#/annotation/editing-saved).
- Drafts: [retained draft](review.html#/drafts/default/retained), [storage unavailable](review.html#/drafts/storage-unavailable), [unresolved target](review.html#/drafts/unresolved), [saved](review.html#/drafts/saved).
- Delivery scope: [new-page rollout](review.html#/rollout/new-pages).

Use View: Phone and View: Desktop for both layouts. The proposed implementation must also pass real-browser checks at the widths listed in Decisions; the mockup is not that evidence.

The revised mockup has one visual per item, no change list inside a visual, and no visual link that selects another item. Each workflow step is one connected card with a title, description, change label, and native Details disclosure inside it. The branch state shows three labeled alternatives between one decision and one join; the alternatives stack on a phone. The full proposal item remains above its picture. The outer list now navigates during annotation in this planning file. The distributed kit still needs the implementation tasks below.
