## 1. Shared review kit: reading and navigation

- [x] 1.1 In `.agents/skills/plan/references/review-kit.html`, render each selected item's full parsed text above its unique visual. Keep each visual's state changes local to that item; cover direct links, invalid links, empty proposals, and text-only fallbacks per review.html#/focused/default/reading and review.html#/focused/text-only.
- [x] 1.2 Keep the selected header, caption, frame, and reasoning aligned in normal vertical flow. Remove artificial blank height, wrap long content, stack narrow comparisons, and make inactive visual hiding immune to layout-kind classes per review.html#/focused/default/reading.
- [x] 1.3 Render ordered workflow steps as connected cards, each with a title, short description, change label, and independent Details disclosure inside the card. Add a reusable split/path/join layout for two or more labeled branches; stack alternatives clearly on phones per review.html#/workflow/default/ordered, review.html#/workflow/details, and review.html#/workflow/branches/branching.
- [x] 1.4 Keep the single outer list visible on desktop and retain the phone Changes sheet, compact toolbar, and Previous/Next controls. Make the list navigation only, keep the selected marker through local state changes, and add keyboard focus handling per review.html#/focused/default/reading.

## 2. Shared review kit: annotation and drafts

- [x] 2.1 Remove all outer change-list annotation targets. Dispatch change navigation, local state selection, Details, and note actions before generic visual annotation targeting. Keep annotation active while switching; a step-body click starts a note, and touch scrolling does not per review.html#/annotation/editor/controls.
- [x] 2.2 Add a separate draft model and guarded browser persistence with original item/visual/state/target identity. Retain nonempty drafts on item changes, state changes, target changes, editor close, and reload; provide a session-only fallback and unresolved-target recovery per review.html#/drafts/default/retained, review.html#/drafts/storage-unavailable, and review.html#/drafts/unresolved.
- [x] 2.3 Add attached draft indicators and draft-list actions. Save commits feedback, Discard removes the draft, and an unsaved edit preserves the existing saved note. Keep the editor and its actions reachable on phone with the keyboard open per review.html#/annotation/editor/controls and review.html#/annotation/editing-saved.
- [x] 2.4 Make Copy notes include saved records only, keep the existing `/continue` format and counts, and exclude unfinished edits until Save. Keep copied feedback in the selected item's review context per review.html#/drafts/saved.

## 3. Generation guidance

- [x] 3.1 Update the kit's fill instructions and `.agents/skills/plan/SKILL.md` author/critic guidance for one visual per item, no inner change list, no cross-item visual links, full-item headers owned by shared code, per-step details, stable note targets, ordinary scrolling, and phone/desktop checks per review.html#/rollout/new-pages.
- [x] 3.2 Update the relevant design rules in `openspec/config.yaml` to match the revised kit. Preserve the four visual kinds, existing anchors and proposal sync, and the new-pages-only scope. Do not regenerate existing reviews or edit `wiki/` per review.html#/rollout/new-pages.

## 4. Review behavior coverage in the existing test suite

- [x] 4.1 Add review-kit fixtures and tests under `app/`, reading the actual shared HTML. Wire their discovery and a minimal real-browser harness through the existing `npm test` entry and CI browser setup as needed, without a local build or a second manual gate per review.html#/rollout/new-pages.
- [x] 4.2 Add routing and interaction regression coverage for full wrapped item text, unique item visuals, local state links, direct links, empty/text-only items, current selection through local state changes, a non-annotatable outer list, annotation-active navigation, distinct step and branch details, and keyboard editing per review.html#/focused/default/reading, review.html#/workflow/branches/branching, and review.html#/annotation/editor/controls.
- [x] 4.3 Add draft and clipboard regression coverage for switching items/states/targets, closing and reopening, reload, refused storage, unresolved targets, Save, Discard, editing an existing note, and saved-only copy counts and content per review.html#/drafts/default/retained and review.html#/drafts/saved.
- [x] 4.4 Add real-browser layout and focus checks at 320px, 390px, 760px, just above the phone breakpoint, and desktop width. Exercise long text/tokens, all visual kinds, a deliberate outer visual/diff class collision, connected step cards with in-card Details, a three-branch split and join, expanded details, all editor states, touch scrolling, and the phone keyboard or reduced visible viewport. Assert no overlapping boxes, no inactive visual leakage, no page-level horizontal overflow, reachable controls, and correct heading focus per review.html#/workflow/branches/branching and review.html#/annotation/editor/controls.
- [x] 4.5 Add compatibility coverage that proposal sync still changes only its marked block on an older fixture and that generating a new page uses the revised kit. Do not rewrite actual existing or archived reviews per review.html#/rollout/new-pages.

## 5. Payload release

- [x] 5.1 Bump `VERSION` with the appropriate semver increment and add a newest-first `CHANGELOG.md` entry describing the new review UI and its new-pages-only scope per review.html#/rollout/new-pages.
- [x] 5.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and strict OpenSpec validation. Complete the normal `/apply` handoff to `/save` for the CI gate; no local build is required.
