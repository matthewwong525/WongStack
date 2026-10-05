# Tasks

## 1. Toolchain and the one stylesheet

- [x] 1.1 Record `npm ci`, `npm run build:app` and `npm test` times in `app/` before any edit. Then add `tailwindcss`, `@tailwindcss/vite` and the plugin in `vite.config.ts`; add the `@/` alias to `tsconfig.app.json`, `vite.config.ts` and `vitest.config.ts`. Verify `npm run build:app` succeeds; if the toolchain refuses a package, stop and report it.
- [x] 1.2 Add `app/components.json` (default style, neutral, CSS variables, Radix, lucide, the `@/` aliases) and `app/src/lib/utils.ts` by the shadcn command. Verify `npx shadcn@latest add button` from `app/` writes `src/components/ui/button.tsx` with no prompt.
- [x] 1.3 Write `app/src/index.css`: the Tailwind import, the animation import, shadcn's neutral tokens with the dark set under `prefers-color-scheme`, `--font-sans` as the device font, and a base layer for `color-scheme`, headings, links and the focus ring. Import it in `main.tsx`. Verify the built CSS holds both token sets.
- [x] 1.4 Add the exemptions for `src/components/ui/**` to `vitest.config.ts` coverage, `.jscpd.json`, `knip.jsonc` and the lint config, each with a comment saying why, exactly as the proposal's four `Check:` entries say. Verify a deliberately uncovered line in `src/lib/` still fails coverage, then remove it.
- [x] 1.5 Add `app/src/dom.test.setup.ts` with the three jsdom stubs the Radix parts need and list it in `vitest.config.ts` `setupFiles`. Verify the existing suite still passes with it loaded.

## 2. The frame, Home and the shared parts

- [x] 2.1 Restyle `Layout.tsx` with classes: the full-width bar, the brand link, *Sign out*, and `main` in its narrow column. Rewrite `app/src/style.test.ts`: `index.css` is the only `.css` under `src/`, `public/` has none, each extra file is named; `index.css` has `color-scheme: light dark` and a dark token block; the rendered frame keeps the narrow column and a bar with no max width. Verify the test fails with a stray `.css` file present, then passes without it.
- [x] 2.2 Move `Home.tsx`, `AppList.tsx`, `Tutorial.tsx` and `NotFound.tsx` onto the parts they need (added by the command), and delete `Home.css`, `AppList.css`, `Tutorial.css`. Update `Home.test.tsx`, `AppList.test.tsx`, `Tutorial.test.tsx` to query by role or text where they queried a class. Verify those tests pass with their assertions otherwise unchanged.
- [x] 2.3 Move `AssistantSetup.tsx` and `CopyText.tsx` onto the parts and delete their CSS. Verify the copy, the failed-copy fallback and the loading and error states in the existing tests.
- [x] 2.4 Delete `app/public/style.css` and its `<link>` in `index.html`. Verify with a search that no file under `app/` names `style.css`.

## 3. Hello and Tips

- [x] 3.1 Move `apps/hello/App.tsx` onto `Card`, `Label`, `Input`, `Button`; delete `Hello.css`. Keep the label, the announced greeting and the failed-response message. Verify `hello/App.test.tsx` passes.
- [x] 3.2 Move `apps/tips/App.tsx` onto the parts; delete `Tips.css`. Keep immediate recalculation, the selected tip's state and the guidance for empty or invalid input. Verify `tips/App.test.tsx` passes.

## 4. Access

- [x] 4.1 Rebuild `Table.tsx` on the `Table` parts with the container-query stacking, the visually hidden header row and `data-label` cells; restyle `View.tsx`'s view links and count, `Labels.tsx` as outline badges, and `Notices.tsx` on `Alert`. Verify `App.test.tsx`, `Roles.test.tsx` and `Grants.test.tsx` find the same tables, columns, rows and notices.
- [x] 4.2 Rebuild `RowMenu.tsx` on `DropdownMenu`, removing its own outside-click and Escape code; keep `RoleSelect.tsx` a real `<select>` in the `NativeSelect` part. Update the menu cases in `App.test.tsx` to open it the way the part listens for; keep every assertion on items per row state, Escape, and the role pick, undo and failed save. Verify those cases pass.
- [x] 4.3 Rebuild `Connect.tsx` on `Dialog`: the button beside the heading, the labelled popup, *Close*, Escape, outside click, steps loading on open. Verify the popup cases in `App.test.tsx`.
- [x] 4.4 Move the pages onto the parts: `Page.tsx`, `Confirm.tsx` (still inline), `SetFields.tsx`, `LevelChoice.tsx`, `PersonPage.tsx`, `RolePage.tsx`, `KeyPage.tsx`, `AppAccessPage.tsx`, `Owner.tsx`, `Own.tsx`, `People.tsx`, `Roles.tsx`, `Apps.tsx`, `Keys.tsx`, `App.tsx`. Keep `fieldset disabled` while saving and one solid button per page. Verify `PersonPage.test.tsx`, `Leaving.test.tsx`, `Roles.test.tsx`, `Grants.test.tsx`.
- [x] 4.5 Delete `Access.css`. Rewrite `access/style.test.ts` to render the parts and hold the same guarantees on their classes: no fixed pixel width, rows stack below the container width, the header row hidden from sight but present, no sideways scroll, the popup within the screen, the current view bold and underlined, radios on screen, a label bordered. Drop only the `.access-` selector assertion. Verify each kept assertion fails when its class is removed from the part, then passes.

## 5. The rule, the wiki and the update path

- [x] 5.1 Rewrite the **Styles** and **A mini app** bullets of `.agents/rules/code.md` as the design says, and the top comment of `index.css` to match. Verify every link in the rule resolves with `node scripts/check-payload-links.mjs`.
- [x] 5.2 Update `wiki/stack/mini-apps.md` (the tree, *Written like any page* with the add command, the shared-look paragraph), add Tailwind and shadcn rows to `wiki/stack/core-stack.md`, fix any piece `wiki/stack/employee-access.md` and `app/README.md` name. Verify with `node .github/scripts/checks.mjs --worktree`.
- [x] 5.3 Update `payload-files.json` for added and removed app files; add the one sentence on moving a target's own screens to `payload-manifest.md` with an offsetting cut; reword the stylesheet line in `catch-up.md`; add `app/public/style.css` to `scripts/retired-names.json`. Verify `node scripts/measure-context.mjs --check` and `node scripts/check-retired-names.mjs` pass.
- [x] 5.4 Replace the removed stylesheets in each journey's `sourcePaths` under `.agents/verification/journeys/` with the files that now hold those styles. Verify the journey files parse and name no deleted path.
- [x] 5.5 Add a `## Next (major)` entry at the top of `CHANGELOG.md` in plain words, with the **Updating.** note from the design. Verify it is the first entry.

## 6. Verification

- [x] 6.1 Run `npm test` in `app/` and `node .github/scripts/checks.mjs --worktree`; fix what fails. Record the after times for `npm ci`, `npm run build:app` and `npm test` beside the before times in the Decision log.
- [x] 6.2 `/save`, then walk the preview at a computer and a phone width, in light and dark: Home, Hello, the four Access views, a person's page, a role change with undo, the `⋯` menu by mouse and by keyboard, the connect popup, a removal question, and *Sign out*. Re-record the kept checks whose screens changed. Verify no screen scrolls sideways and nothing is unreadable in either mode.

## 7. Home: the Connect card and greyed apps

- [x] 7.1 Move the popup wrapper to `app/src/components/ConnectDialog.tsx`, taking its trigger as a child; Access's `Connect.tsx` passes its button. Verify the popup cases in `access/App.test.tsx` pass unchanged.
- [x] 7.2 In `AppList.tsx` and `Home.tsx`: remove the setup box from Home; add the Connect card last in the list, opening the popup; show each app an employee lacks as a greyed, focusable card with a *No access* badge whose click shows *Ask your admin for access to <title>.* under it and navigates nowhere. Keep the contact-your-employer line for an employee with no business apps and the first-request text when no apps are built. Update `AppList.test.tsx` and `Home.test.tsx`: held and lacked apps, the message on click and by keyboard, nothing greyed in the `legacy` and `not_started` states or for the owner, the Connect card opening and closing the popup, the loading and error states still withholding the list.
- [x] 7.3 Add a test beside `CopyText` or `AssistantSetup` that the text area carries the fixed-size class and its wrappers can shrink, for the overflow fixed after the first preview (the fix itself is already in `CopyText.tsx` and `AssistantSetup.tsx`). Verify it fails with the class removed.
- [x] 7.4 Update `wiki/stack/mini-apps.md` (*The home page lists the apps*: greyed cards, the Connect card, no box) and `wiki/stack/employee-access.md` where it says Home keeps its box; extend the `CHANGELOG.md` entry with the two Home changes. Verify with `node .github/scripts/checks.mjs --worktree`.
- [x] 7.5 Check `schema/seed.sql` gives a preview an employee who holds one app and lacks another; it does while Eli holds only the tip calculator. Verify with the seed's test.

## 8. Verification of the Home changes

- [x] 8.1 Run `npm test` in `app/` and `node .github/scripts/checks.mjs --worktree`; fix what fails.
- [x] 8.2 `/save`, then walk the preview at a computer and a phone width, light and dark: Home's list, the Connect card and its popup with the text inside its box, and a greyed card's message if the checker's sign-in can show one; name what it can't show.
