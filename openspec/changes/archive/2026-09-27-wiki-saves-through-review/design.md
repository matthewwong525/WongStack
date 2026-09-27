# Design

## Context

`/save` routes a save whose every path is under `wiki/` through `save/references/prose-save.md`, which commits and pushes straight to `main`. `wiki/development/the-change-loop.md#the-prose-allowlist` owns the rule; `AGENTS.md`, `wiki/README.md`, `wiki/wiki-style.md`, and three specs repeat or rely on it. `/save` already has the general rule this change needs: *with no change selected, author one only if the session established code or a code plan*. What it lacks is a PR body for a save with no change, which today lives only in `prose-save.md`'s protected-branch fallback.

CI already does most of the rest. `.github/scripts/app-untouched.sh` answers `untouched=true` when every path is under `wiki/`, `openspec/`, or `mini-apps/apps/`, or ends in `.md`, and `test.yml` and `deploy.yml` skip the suite and deploy on it. Only the meta-only `payload.yml` runs everything on every push. Its script tests read skill Markdown, and `private-names.test.mjs` scans every tracked file, wiki included.

`/ship` Step 2 stops whenever no change record exists, so it can not merge a PR that needed no change.

## Goals / Non-Goals

**Goals:**
- One save route for every file edit, with no path test anywhere in `/save` or `/ship`.
- A change is authored for code only; other edits get a plain PR body.
- `/ship` merges work that needed no change.
- Payload checks skip code tests when only `wiki/` or `openspec/` changed.

**Non-Goals:**
- Changing `test.yml` or `deploy.yml`.
- Auto-merging.

## Decisions

- **Delete the route; don't rewrite it.** `save/SKILL.md` loses the `wiki/` row in its routing table, the allowlist paragraph in §1, and the direct-save report line in §5. The description drops "Wiki-only saves go to the default branch". §2's normal route gains one sentence: with no change, the PR body describes the edit in plain words with a `/ship` footer, and the change-body renderer is not used. Alternative, keeping a "wiki route" that happens to open a PR: rejected by the user; it is still an exception to read and maintain.
- **`prose-save.md` becomes `facts-save.md`.** It keeps only the facts-only save: facts to the store, a to-do's `thread` fact, no commit. The routing row reads "The session only produced facts, including a to-do that changed no repo file". `new-plan.md`'s "uses the prose route" becomes "uses the facts-only save". `retired-names.json` retires `prose-save.md` (allowing `scripts/fixtures/context-baseline.json`, the measured before-state) and `#the-prose-allowlist`.
- **Ship uses save's test, not a path test.** Step 2: when no rung selects a change, apply `/save`'s authoring test to the branch diff. Code or a plan for code → today's stop. Otherwise skip archive and distillation, go to Step 3's single `/save`. Step 4's walk already treats a missing preview as a skipped rung; no new text.
- **The change loop just loses a section.** *The prose allowlist* is deleted. *The gate* gains no replacement paragraph beyond one sentence that every file edit takes it, and that a change is needed for code only, linking `/save`. The source repo's rule that a payload wiki page needs a release bump already lives in `.agents/rules/payload.md`; check it still reads right. Pages that linked `#the-prose-allowlist` link `#the-gate`.
- **`docs_only` comes from the shared scope check.** `app-untouched.sh` gains a fifth output, `docs_only=true|false`: true only when every changed path is under `wiki/` or `openspec/`, false in every fail-safe branch and on an empty diff. Base-finding stays in one place. This decides which tests are relevant, not how work is saved.
- **`payload.yml` gates by step.** Checkout with `fetch-depth: 0`, run the scope step, and put `if: steps.scope.outputs.docs_only != 'true'` on lint, shellcheck, and the c8 suite. A step runs `node --test scripts/tests/private-names.test.mjs` only when `docs_only` is true, because the full suite already includes it. Release checks always run. A summary line says which set ran. `npm ci` and the OpenSpec install stay in every run.

## Risks / Trade-offs

- Wiki facts written mid-task now wait in an open PR until someone ships it → the save report gives the review page, and `/ship` makes merging one step.
- `/ship`'s "code or a plan for code" is a judgment, not a path list → it is the same judgment `/save` already makes, and a wrong call stops rather than merges.
- An `openspec/`-only branch skips script tests → strict spec validation and the config check still run, which are the checks specs need.
