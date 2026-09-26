## 1. Working-tree check (.github/scripts)

- [x] 1.1 Add `--worktree` to `.github/scripts/app-untouched.sh`: compare the working tree, staged and untracked paths included, with the merge base of `HEAD` and `origin/<default>`, and print the same three lines. Add cases to `scripts/tests/app-untouched.test.mjs` for a prose-only tree, an uncommitted `app/` edit, an untracked mini-app file, and no merge base (fails safe to touched). Run `node --test scripts/tests/app-untouched.test.mjs`

## 2. Skills (.agents/skills)

- [x] 2.1 `/apply`: replace the completion `/save` with the host preview: `app-untouched.sh --worktree`, then `cf-preview.sh --alias "<change-name>"`, then report and ask *publish it?*, *save it*, or *change it more*. Keep the `/ship` return, the to-do path, and task-driven saves. Delete "The mini-app path", its bullet in "Pick the path by the work", and the mini-app words in the `description`. Verify with `grep -n -i "mini" .agents/skills/apply/SKILL.md`, which should find only the `/apps/<name>/` reporting line
- [x] 2.2 `/save`: delete the mini-app route row, the mini-app mention in step 5, and `references/mini-app-save.md`. Verify with `grep -rn -i "mini" .agents/skills/save/SKILL.md .agents/skills/save/references`, which should find nothing
- [x] 2.3 `/ship`: delete "Merge a mini-app pull request", its mentions in the intro, Step 2, and the report, and the mini-app words in the `description`. Verify with `grep -n -i "mini" .agents/skills/ship/SKILL.md`, which should find nothing
- [x] 2.4 Delete `save/scripts/mini-app-push.sh` and `scripts/tests/mini-app-push.test.mjs`. Remove the `mini-app` mode from `save/scripts/render-pr-body.mjs`. In `scripts/tests/checkpoint-helpers.test.mjs`, replace its body test with one that rejects `--mode mini-app`. Run `node --test scripts/tests/checkpoint-helpers.test.mjs`
- [x] 2.5 Drop the `mini-app-save` route and its note sentence from `scripts/fixtures/context-baseline.json`. Run `node scripts/measure-context.mjs --check` and `node --test scripts/tests/context-measurement.test.mjs`

## 3. Specs and orientation

- [x] 3.1 Edit the Purpose paragraphs of `openspec/specs/` `mini-apps`, `request-routing`, `ship-full-cycle`, and `apply-completion-handoff`, so none describes the mini-app shortcut or a completion save. Verify by reading each
- [x] 3.2 In the `WONG-STACK` block of `AGENTS.md`, rewrite the mini-app rule (a mini app in its own folder at `/apps/<name>/`, through the same loop) and check that the loop rule's second stop follows `/apply`'s preview. Verify that no line mentions a direct save, "no question round", or a save at the end of `/apply`

## 4. Docs (wiki)

- [x] 4.1 `wiki/development/the-change-loop.md`: in the diagram, "Just ask", the `/apply` and `/save` steps, and the "`/apply` never saves to stop" section, `/apply` ends with a host preview and `/save` is by hand or through `/ship`. Shrink "Mini apps" to where the files live plus a link. Delete "A mini-app save is the second direct route". Generalize the gate's host-preview sentence
- [x] 4.2 `wiki/stack/mini-apps.md`: keep the layout and rules. Replace the preview, save, and pull-request sections with one short section on the normal loop and the preview at `/apps/<name>/`. Restate the `DB`-only reason as defense in depth, and update the source-repo paragraph
- [x] 4.3 Update `wiki/stack/getting-started.md`, `wiki/stack/README.md`, `wiki/development/staging-walkthrough.md` if it says `/apply` saves, and the payload manifest's mini-app line
- [x] 4.4 Run `grep -rn -i "mini-app-push\|mini-app-save\|mini-app path\|straight to production\|completion save\|invokes /save once\|invoke the \*\*.save. skill\*\* once" --exclude-dir=node_modules --exclude-dir=archive .` and fix every hit outside `CHANGELOG.md`

## 5. Release

- [x] 5.1 Bump `VERSION` to 25.0.0. Add a `CHANGELOG.md` entry that covers what changed, the removed files, and "finish or save a half-built mini app before you sync"
- [x] 5.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `openspec validate mini-apps-take-the-loop --strict --no-interactive`, and `node --test scripts/tests/*.test.mjs`
