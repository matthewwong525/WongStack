# Four silent failures from the review-page release

**Status:** ready-to-ship
**Open questions:** none

## Why

Shipping the review page in 13.0.0 left four defects, and every one of them fails *silently* — nothing errors, nothing logs, the artifact just quietly does less than it says. The worst has been live since that merge: one unquoted colon in `openspec/config.yaml` makes the whole file unparseable, so **every per-artifact rule in this repo has been ignored on every change drafted since**. The others blank a screen, let a critic pass a broken page, and leave stale highlight state behind. A silent failure is worth fixing at a higher priority than a loud one, because nobody reports it.

## What Changes

- **`openspec/config.yaml` parses again.** The design rule read `filled from .claude/skills/plan/references/review-kit.html: one visual per …`, and a colon-space inside an unquoted YAML scalar starts a mapping key, so the CLI warns and drops the entire config. Rephrased to remove it; the proposal, design, and tasks rules take effect again.
- **A screen state may be named anything.** The kit hid every `.state` block and revealed four by name (`default`, `empty`, `loading`, `error`), while `data-states` accepts any name and the fill rules say so. A screen declaring `annotating` or `phone` rendered an empty frame. The router now marks the matching block and one rule reveals it, so any name works.
- **The critic checks that a state *renders*, not that a block exists.** The old check looked for a missing `.state-<name>` block and passed a screen that had the block and still showed nothing — it passed the very defect above. It now judges the rendered state.
- **A bullet with no visual clears the previous highlight.** The text stage left `.marked` on the visual it came from. No visible effect today, because that visual is hidden, but it is state that outlives what set it.
- **A release check catches an unparseable config.** `scripts/check-openspec-config.mjs` asks the CLI to read the config and fails when it warns. The payload rule and the development docs name it beside the link checker, so the ritual catches this class rather than waiting for someone to notice missing rules.
- **Release ritual:** `VERSION` 14.0.0 → 14.0.1 (patch), newest-first `CHANGELOG.md` entry, both release checks pass.

**Non-goals:** no new visual kind; no change to the four kinds, the anchors, the annotate layer, or the phone layout; no re-litigating the 13.0.0 design; no YAML schema validation beyond "the CLI can read it"; no backfill of review pages for changes already archived.

## Capabilities

### New Capabilities

- none.

### Modified Capabilities

- `ux-wireframes`: a screen state may carry any name and SHALL render; the critic's state check is about rendering rather than markup presence; the text stage clears highlights.

## Impact

- **Edited:** `.claude/skills/plan/references/review-kit.html` (state reveal, `showText` highlight clear), `.claude/skills/plan/SKILL.md` (the critic's state check), `openspec/config.yaml` (the unparseable line), `.claude/rules/payload.md` and `wiki/development/README.md` (the release checks), `.claude/skills/wong-sync/references/payload-manifest.md` (the new script), `VERSION`, `CHANGELOG.md`. `.claude` is a symlink to `.agents`, so edits land on the `.agents/` paths.
- **Added:** `scripts/check-openspec-config.mjs`.
- **Downstream repos:** a target that synced 13.0.0 or 14.0.0 has the same broken `config.yaml` stanza and the same kit. The next `/wong-sync` proposes both fixes. A target whose review pages only used the four standard state names saw no symptom from the kit defect, but its config rules were being dropped just the same.
- **Risk:** low. The state change is two lines of CSS and three of JS, and every existing page keeps working because the four standard names are a subset of "any name".

## Decision log

- **2026-09-15** — found while generating a sample review page for the user to look at. Two of its nine entries opened a blank frame, because the sample declared `annotating` and `phone` states. Diagnosis by computed style rather than by reading markup: all three state blocks existed and all three computed `display:none`. That is what exposed the critic's check as testing the wrong thing — it verifies a block is present, which it was. Asked how to handle the kit fix → chose to ship it now as its own patch rather than folding it into later work. The config parse error was found immediately afterwards, when `openspec new change` warned that it could not read `config.yaml`; `git log` attributes the line to 4c045ed (#78), so the rules have been silently dropped since that merge. It was pulled into this change rather than filed separately, because it is the same class of defect from the same release, and a repo whose planning rules are silently off should not wait. Assumed, not asked: the version is a patch, since nothing gains or loses a capability; the fix keeps the four standard state names working, so no existing page changes; a detector script is worth adding because the payload rule already holds that a silent failure needs one, and this failure announced itself only as a warning nobody was reading.

- **2026-09-15** — implemented all 13 tasks. **The release check shipped broken on its first draft and the hand-test caught it.** `check-openspec-config.mjs` originally ran `openspec list`, which does not read the config at all, so it passed a file `pyyaml` rejected. Task 4.2 exists precisely to try the negative case, and it did its job: a sweep across `doctor`, `context --json`, `status`, `instructions` and `validate --specs` showed that only `doctor`, `context --json` and `instructions` surface the warning. The check now runs `openspec context --json` — read-only, needs no active change — and the reason is a comment in the script, because "ask the right command" is the whole correctness of it. Re-tested both ways: exit 1 with the CLI's own message on a reintroduced colon-space, exit 0 on the fixed file. The kit fix was proved by computed style on a scratch screen declaring `default annotating phone`, each state rendering only its own block, and the four standard names re-checked unchanged. A second self-inflicted slip, caught by reading the file back: inserting the new check into the payload rule's link-checker bullet left that bullet's trailing sentence describing the wrong script, so the two are now separate bullets. `VERSION` 14.0.1 (main had moved to 14.0.0 under #79, which retired `/improve` and `/dream`), newest-first `CHANGELOG.md` entry, and both release checks pass. The untracked `review-sample.html` was rebuilt on the fixed kit and re-driven: nine bullets, no blank state, highlights cleared by the text bullet.

- **2026-09-15** — archived for shipping. The `ux-wireframes` delta was folded into `openspec/specs/ux-wireframes/spec.md` at the previous checkpoint — 1 requirement modified in place (keeping all three of its existing scenarios and gaining one) and 3 appended — and re-verified requirement-for-requirement before the move, with an explicit guard that the MODIFIED block dropped no scenario the main spec still held. `openspec validate --specs` passes 29 of 29. The change sits at `openspec/changes/archive/2026-09-15-fix-review-kit-and-rules/`, ahead of the delegated final checkpoint and the squash-merge. Process note: this ship ran cleanly for once — the branch was cut from `origin/main` with the change name from the start, and all 13 tasks were implemented before `/ship` was reached, so neither of the two preconditions that tripped the previous two runs applied.
