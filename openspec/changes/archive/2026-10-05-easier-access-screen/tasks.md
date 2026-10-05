# Tasks

## 1. Person and role pages

- [x] 1.1 In `SetFields.tsx`, show each ticked app's key levels under its tick, a short `uses …` beside an unticked app, and a second group for keys no ticked app uses; verify by reading the rendered groups in `PersonPage.test.tsx`.
- [x] 1.2 Make a key shared by two ticked apps show under both, in step, with a line saying the level is shared, and turn the gap line into a hint that names the fix; add cases to `PersonPage.test.tsx` and `Roles.test.tsx` for: tick gives Read, raise under the app saves Read & write, the shared key follows, an unticked app hides its picker.
- [x] 1.3 Update the existing person and role tests that find a key by the old Keys group; verify no test is skipped or deleted without a moved equivalent.

## 2. Lists and the non-owner box

- [x] 2.1 Add `Labels.tsx` and the array helpers and `gaps()` in `levels.ts`, and `holdersByLevel()` in `subjects.ts`; delete dotted-line helpers left without a caller; cover the new helpers in `levels.test.ts` and `subjects.test.ts`.
- [x] 2.2 Use labels in `People.tsx` and `Roles.tsx`, with the role name or *Own set*, the sign-in status beside the name, and one gap line per app that can't do its job; assert them in `App.test.tsx` and `Roles.test.tsx`.
- [x] 2.3 Group holders by level in `Keys.tsx`, show holders as labels in `Apps.tsx`, and make every list button say *Edit*; assert them in `Grants.test.tsx`.
- [x] 2.4 Use labels in `Own.tsx`; assert them in `App.test.tsx`.

## 3. Save result, leaving, and look

- [x] 3.1 Show the save result in a notice box in `Owner.tsx`, as an alert when it did not finish, and drop the empty paragraph; assert both in `App.test.tsx`.
- [x] 3.2 Add the `changed` flag to `Page.tsx` and each page, asking through `Confirm` on the back link, *Cancel* and the view switch, with `beforeunload` and `useBlocker` where a data router is present; test that staying keeps the change and that an untouched page leaves at once.
- [x] 3.3 Style the labels, the gap line, the nested pickers, the two groups and the level picker in `Access.css`; extend `style.test.ts` so labels wrap and a gap is marked by more than colour, loosening none of its checks.

## 4. The checker on previews

- [x] 4.1 In `policy.ts` and `core.ts`, count the checker as the owner when `WONG_ENVIRONMENT` is `staging`, with the token's `common_name` as subject; add `policy.test.ts` and `core.test.ts` cases: staging allows a read and a save, production refuses both, local is unchanged.
- [x] 4.2 Check `schema/seed.sql` gives the practice list what the walk needs (a role held by two people, an own-set person, a person with no level) and add a row only if one is missing; verify with `seed.test.ts`.

## 5. Docs and release

- [x] 5.1 Update `wiki/stack/employee-access.md`: *Four views* for the new page layout and labels, and the checker's reach on previews where it says the token never manages people; verify with `node scripts/check-payload-links.mjs`.
- [x] 5.2 Add a `## Next (minor)` entry at the top of `CHANGELOG.md` in plain words, with an **Updating.** note that nothing needs doing by hand; verify `node .github/scripts/checks.mjs --worktree` passes.

## 6. Verification

- [x] 6.1 Run the app's test chain (`npm test` in `app/`) and the worktree checks; fix what fails.
The preview walk is the publish step's own check, not a box here: walk the preview as the checker through People, a person's page, a role's page, Apps, Keys, a save with its *Saved* box, and the leave question; show the pictures, and name what only code tests cover (a key under an app, the shared key, the non-owner box).
