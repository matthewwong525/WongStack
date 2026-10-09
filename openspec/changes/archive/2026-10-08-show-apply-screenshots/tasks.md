# Tasks

## 1. Apply skill

- [x] 1.1 Add preview screenshot capture and in-chat image display before the closing multiple-choice question in `.agents/skills/apply/SKILL.md`; source-review the two-view preference, one-view fallback, current-preview requirement, capture failure explanation, privacy, temporary storage, and unchanged nested `/ship` return.
- [x] 1.2 Preserve final-acceptance preview reuse and the existing helper/git/check boundaries while trimming wording to offset added instruction text; review the final skill against the design.

## 2. Wiki and release

- [x] 2.1 Update the owning `/apply` summary in `wiki/development/the-change-loop.md` to link the screenshot behavior; verify it agrees with the skill.
- [x] 2.2 Add `## Next (minor)` in `CHANGELOG.md`, with a plain Updating note and no hand edit to VERSION; verify the entry describes pictures before the choice.

## 3. Final verification

- [x] 3.1 After all prose edits, run strict OpenSpec validation and the existing local payload pre-check through `.github/scripts/checks.mjs --worktree`; report results as local and retain remote checks for delivery.
