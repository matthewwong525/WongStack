# Tasks

## 1. The frame

- [x] 1.1 Confirm the checkout holds 35.0.0: `app/src/components/ui/button.tsx` exists and `VERSION` is 35.0.0 or later. If not, stop and report it; nothing below applies to the older screens. Verify by reading both.
- [x] 1.2 In `app/src/Layout.tsx`, give `main` and the bar's contents the same container (`mx-auto w-full max-w-[60rem] px-4`). Update `app/src/style.test.ts`: the frame and the bar share one max width and left padding, and no page sets a negative margin. Verify the test fails with the old `max-w-lg` on `main`, then passes.
- [x] 1.3 Wrap the text and form pages in `max-w-lg`: `pages/home/Home.tsx`, `apps/hello/App.tsx`, `apps/tips/App.tsx`, `apps/AppPage.tsx`'s stopped states, `pages/not-found/NotFound.tsx`. Verify `Home.test.tsx`, `hello/App.test.tsx`, `tips/App.test.tsx` and `router.test.tsx` pass with their assertions unchanged.
- [x] 1.4 Delete `WIDE` from `apps/access/App.tsx` and keep `@container` on its root. Update `apps/access/style.test.ts`: Access has no width or margin of its own. Verify it fails with `WIDE` restored, then passes.

## 2. Access lists

- [x] 2.1 Add `summary(status, set)` to `apps/access/levels.ts`: the count line and the number of gaps. Cover it in `levels.test.ts`: no apps, one app, several apps and keys, a set with a gap. Verify the new cases pass.
- [x] 2.2 Make every row one line: People (`summary`, *Everything* for the owner, *Manager* beside *You*), Roles (summary, people count), Apps (uses, holders count), Keys (saved, used by, a count per level; an unsaved key's state in words). Truncate a long email with the full one in `title`. Update `App.test.tsx`, `Roles.test.tsx` and `Grants.test.tsx` to read counts and the gap mark where they read badges. Verify they pass, and that a row with a gap still shows it without opening the person.
- [x] 2.3 Move the heading into the views: `View.tsx` lays the four links and an `add` slot on one line; `Table.tsx` drops its visible `h2` and labels the table from the current link; Apps and Keys put their hint under the table. Update `style.test.ts` and `App.test.tsx`: each table is named by its view, and the add button is in the views' line. Verify they pass.

## 3. The side panel and the questions

- [x] 3.1 Add the `sheet` and `alert-dialog` parts with the shadcn command from `app/`. Verify both files land in `app/src/components/ui/` and `npm run build:app` succeeds.
- [x] 3.2 Turn `Page.tsx` into the sheet's frame, opened by the address and closed through the existing `hold` check; each view renders its list always and its item in the sheet. Mark the open row with `aria-current` and a leading bar. Drop the border from `Group` in `Fields.tsx`. Update `PersonPage.test.tsx`, `Roles.test.tsx`, `Grants.test.tsx` and `App.test.tsx`: the list is still in the document with an item open, the sheet is named by the item, and Escape, *Cancel* and *✕* return to the view's address. Verify they pass.
- [x] 3.3 Open an unsaved key in the sheet with its next step and the request to copy. Verify with a case in `Grants.test.tsx` or `App.test.tsx` for the owner and for a manager.
- [x] 3.4 Rebuild `Confirm.tsx` on `AlertDialog`: the way out focused first, the action solid. Update `Leaving.test.tsx` and the removal cases in `App.test.tsx`: the question is a dialog, an outside click does not answer it, *Keep editing* returns focus to the sheet with the change kept, and a removal still saves once. Verify they pass.

## 4. Connect

- [x] 4.1 Rewrite `components/AssistantSetup.tsx` as the one popup body: three numbered steps, who signs in, what to ask, the apps, and the two failure states with no mention of signing in. Give `CopyText.tsx` a button `variant` and the *Can't copy? Show the message* summary. Add `components/AssistantSetup.test.tsx` for loading, ready, not ready and failed; update `CopyText.test.tsx`. Verify they pass.
- [x] 4.2 Delete `apps/access/Connect.tsx`; stop rendering `AssistantSetup` in `apps/access/App.tsx`; reword `apps/access/app.json`'s description. Update `App.test.tsx` (no Connect button, and a person who manages nothing sees only what they can use) and `AppList.test.tsx` (the card still opens the popup). Verify they pass, and a search of `app/src` finds one caller of `AssistantSetup`.

## 5. Docs and the release

- [x] 5.1 Update `wiki/stack/employee-access.md`: one-line rows, the views as the heading, the side panel, questions as popups, no Connect button. Update `wiki/stack/mini-apps.md`: the frame and the readable width a page keeps inside it. Update `wiki/stack/employee-project.md` where it says where the prompt is copied from. Verify `node scripts/check-payload-links.mjs` passes.
- [x] 5.2 Add to `wiki/people/matthew-wong.md`: one left edge on every screen, list rows of one height, an item opens beside its list, one way to ask a question. Verify the page stays linked from `wiki/people/README.md`.
- [x] 5.3 Add `## Next (minor) — Screens that match` at the top of `CHANGELOG.md`'s entries, in plain words, with an **Updating.** note: nothing by hand, and a screen you built moves to the shared left edge at its own width. Check whether `payload-files.json` or `scripts/retired-names.json` names `apps/access/Connect.tsx` and update them if so. Verify `node scripts/check-retired-names.mjs` passes.

## 6. Verification

- [x] 6.1 From `app/`, run `npm test` and `npm run build:app`. Verify both pass with coverage, dead-code and duplicate checks green.
- [x] 6.2 Run `node .github/scripts/checks.mjs --worktree`. Verify every step passes.
- [x] 6.3 Run `openspec validate "uniform-screens" --strict --no-interactive`. Verify it reports valid.
- [ ] 6.4 `/save`, then on the preview record the three journeys in `.agents/verification/journeys/employee-onboarding/` again through `/verify`, and walk at a computer width and a phone width: Home, Hello and Access share a left edge; every People row is one line; a person opens in the panel with the list behind it; leaving with a change asks in a popup; Connect shows three steps from Home's card and Access has no Connect button. Verify the walk's comment shows each, in light and dark.
