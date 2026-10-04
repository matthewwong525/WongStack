# Tasks

## 1. Drawing guide (skill)

- [x] 1.1 Rewrite `.agents/skills/plan/references/drawings.md` by design.md: an opening line to pick the pattern by what the bullet explains; *Steps* (usual path straight, failures in a row below), *Back and forth*, *States*; keep *Side by side* and *Comparison table*; turn *Screen* into *Before and after* covering a changed flow or screen with `+` on new parts, keeping the low-fidelity rule and the `wiki/ux-principles.md#the-review-file` link; drop *Titled frame* and *Split and join*. Verify every box line is padded and no line passes 56 columns.
- [x] 1.2 Run `node scripts/measure-context.mjs --check` and trim the guide's own wording until it passes.

## 2. Docs and release

- [x] 2.1 `wiki/ux-principles.md`, *The review file*: the list of what one drawing can be names steps, a back-and-forth, states, and a before-and-after, linking the guide; no pattern detail copied. Verify the page's links resolve.
- [x] 2.2 `CHANGELOG.md`: add `## Next (minor) — Clearer drawings in plans` above the newest entry, in plain words, with an **Updating.** note that no action is needed.
- [x] 2.3 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, and `node scripts/check-openspec-config.mjs`; all pass.
