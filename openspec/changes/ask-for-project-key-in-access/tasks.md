# Tasks

## 1. The app says why the project can't be handed out

- [x] 1.1 Confirm the checkout holds 35.2.0 or later: `VERSION`, and `app/src/apps/access/KeyPage.tsx` exists. If not, stop and report it. Verify by reading both.
- [x] 1.2 Add `codeStep(env)` to `app/worker/employee-access/code.ts`: `ready`, `key` (a GitHub `owner/name` with no token) or `setup` (anything else). Cover it in `code.test.ts`: a Cloudflare-kept project, GitHub with a token, GitHub without, no repository, a malformed name. Verify the new cases pass.
- [x] 1.3 Put `project` in the Access status where `keyCatalogue` is used, and in `statusSchema` in `app/src/lib/access.ts`, defaulting from the `code` key's `saved` when the field is absent. Cover the field in the Worker's management test and the default in a schema test. Verify both pass, and that no secret's value or name is in the status.

## 2. Access gives the project with one tick

- [x] 2.1 In `status.ts` add `PROJECT_REQUEST`; give `FinishStep` in `Notices.tsx` optional `say` and `request` props; add `ProjectStep` (owner and manager, `key` and `setup`, nothing when `ready`). Cover it in `status.test.ts` or a new `ProjectStep` test: each of the five outcomes, and that the copied text is `PROJECT_REQUEST`. Verify they pass.
- [x] 2.2 In `SetFields.tsx`, take `code` out of *Keys no ticked app uses* and render the *Project* group: the tick *Can install the project*, its muted line, and `ProjectStep` while the tick is on. Hide the group when the status lists no `code` key, and hide *Keys no ticked app uses* when nothing is left in it. Remove *Project code is shared separately.* from `PersonPage.tsx`. Update `PersonPage.test.tsx` and `Roles.test.tsx`: a new person's tick is off; ticking it saves `code: 'read'`; unticking saves none; the step shows only with the tick on and `project` not `ready`; a manager sees no copy button; a role's page has the same tick. Verify they pass.
- [x] 2.3 In `KeyPage.tsx`, show `ProjectStep` for the `code` key in place of *Ask your assistant for the key link.* Update `Grants.test.tsx`. Verify it passes, and that another unsaved key still reads the key-link line.
- [x] 2.4 Update `wiki/stack/employee-access.md` (*Give an app and its level in one place*: the tick, and the step under it) and `wiki/stack/employee-project.md` (*Who gets what*: where the project is given; *The owner's one step on GitHub*: Access asks for it, setup does not; keep the heading's exact text). Verify `node scripts/check-payload-links.mjs` passes.

## 3. Setup stops asking

- [x] 3.1 In `.agents/skills/wong-setup/scripts/provision.mjs`, stop pushing `CODE_KEY_TODO` in `projectCode()`, remove the constant, and fix the function's comment and the `access` help text. Update `scripts/tests/provision.test.mjs`: every case that expected `CODE_KEY_TODO` now expects it absent, `codeKey` still carries `status: 'missing'` with its steps on GitHub, and the missing-repository to-do is unchanged. Verify `node --test scripts/tests/provision.test.mjs` passes.
- [x] 3.2 In `.agents/skills/wong-setup/references/cloudflare.md`, delete the closing-report line about the read-only GitHub key, and reword *The project Connect hands out*: on GitHub the key is asked for in Access, and setup says nothing. Verify `node scripts/measure-context.mjs --check` passes and a search of `.agents/` and `wiki/` finds no *One step is left before teammates*.

## 4. The release and the person page

- [x] 4.1 Add `## Next (minor) — The project key is asked for when you share the project` at the top of `CHANGELOG.md`'s entries, in plain words, with an **Updating.** note: nothing by hand; a GitHub install with no key is asked in Access the first time someone is given the project. Verify `node scripts/check-retired-names.mjs` passes.
- [x] 4.2 Add to `wiki/people/matthew-wong.md`: ask for a key when it is first needed, not during setup. Verify the page stays linked from `wiki/people/README.md`.

## 5. Verification

- [x] 5.1 From `app/`, run `npm test` and `npm run build:app`. Verify both pass with coverage, dead-code and duplicate checks green.
- [x] 5.2 Run `node .github/scripts/checks.mjs --worktree`. Verify every step passes.
- [x] 5.3 Run `openspec validate "ask-for-project-key-in-access" --strict --no-interactive`. Verify it reports valid.
- [ ] 5.4 `/save`, then walk the preview at a computer width and a phone width: *Add person* shows the *Project* tick, off, with no *Project code is shared separately*; ticking it on a preview that holds no key shows the step with a working copy button; *Project code* opened from *Keys* shows the same step; a saved tick shows as *Read* in *Keys*. Verify with the walk's verdict in the pull request.
