# Tasks

## 1. The frame every screen shares

- [x] 1.1 Make `View.tsx` the shell for lists and pages: tabs with a count each, then one notice spot, then its children; render `Page.tsx` inside it with `People › <name>` where the back link was. Verify in `App.test.tsx` and `Leaving.test.tsx` that the tabs show on an opened person, role, app and key, and that a tab asks before leaving a changed page.
- [x] 1.2 Merge `Banners`, `Notices` and the saved box into one `Notices` part the shell renders once; keep each notice's words and its `status` or `alert` role. Verify the existing notice cases in `App.test.tsx` still find each one, once.
- [x] 1.3 Add `Table.tsx` (title, add spot, header cells) and the table, stacked-row and wider-page styles in `Access.css`; extend `style.test.ts` for: rows stack on a narrow screen, no pixel widths, only `.access-` selectors, the current tab still marked by more than colour. Loosen none of its checks.

## 2. People

- [x] 2.1 Render People as a table with the owner's row first, *You* on the viewer's row, and labels and the gap line in their cells; remove the `Owner:` line and the manager line in `Owner.tsx`. Update `App.test.tsx` for the owner row as owner and as manager, and that the owner's row has no control.
- [x] 2.2 Add `RowMenu.tsx` and move *Open*, *Try again*, *Remove* and *Add back* into it by row state; keep the remove confirm. Verify in `App.test.tsx`: each state's menu items, Escape closes it, a manager's menu on a manager's row has no *Remove*.
- [x] 2.3 Add `RoleSelect.tsx` and the `undo` path in `Owner.tsx`'s `save`: a pick sends the role alone, the notice names the change with *Undo*, and undo sends back the old role or the old own set. Verify in `App.test.tsx`: role to role, own set to role and back with the same apps and levels, a failed save says so, a click in the dropdown or menu does not open the row.
- [x] 2.4 Remove *Copy app link* from `People.tsx`, and `origin` from `lib/access.ts` and `members.ts` if nothing else reads it; update the tests and fixtures that name it. Verify with a search that no caller is left.

## 3. Roles, Apps and Keys

- [x] 3.1 Render Roles, Apps and Keys through `Table.tsx`, each row opening on its link or a click, with *Owner* first among holders and the how-to-add line in the add spot of Apps and Keys. Update `Roles.test.tsx` and `Grants.test.tsx` for the columns, the empty states and the click.
- [x] 3.2 Keep one row shape for a key that is not saved: the next step in its cells for the owner, for a manager, and on a preview. Verify the three existing cases in `Grants.test.tsx`.

## 4. Connect your assistant and the non-owner view

- [x] 4.1 Wrap `AssistantSetup` in a `<details>` beside the heading in `App.tsx`, open for a person who manages nothing; show `Own.tsx` only to them. Update `App.test.tsx`: closed for the owner and a manager, open for an employee, the prompt still copies, Home's box unchanged.

## 5. Practice list, docs and release

- [x] 5.1 Check `schema/seed.sql` has a removed person on the practice list and add one made-up row if not; verify with `seed.test.ts`.
- [x] 5.2 Update `wiki/stack/employee-access.md`: *Four views* and the sections under it for the tables, the row dropdown and undo, the menu, the one frame, the dropdown for connecting, and no app link; drop the lines about a manager's box and the owner line. Verify with `node scripts/check-payload-links.mjs`.
- [x] 5.3 Add a `## Next (minor)` entry at the top of `CHANGELOG.md` in plain words, with an **Updating.** note that nothing needs doing by hand and that the assistant brings an install's own changes to the Access screen onto the new one. Verify the entry is the first one.

## 6. Changes after the first preview

- [x] 6.1 Replace the Connect `<details>` in `App.tsx` with a button and a native `<dialog>` for the owner and a manager, closing on *Close*, Escape and a backdrop click; render `AssistantSetup` on the page for a person who manages nothing. Update `App.test.tsx`: the popup opens and closes, the prompt copies inside it, an employee sees the steps with no popup. Remove the `.access-connect` dropdown styles.
- [x] 6.2 Make the top bar span the screen in `app/public/style.css` and `Layout.tsx`, keeping each page's width and the wide Access page; add *Sign out* on the right, shown only when the status response says the site has a sign-in, and add that boolean to the response and its schema. Test: the link and its address with a sign-in, no link on an open site and on a local run, and the Worker's value for each.
- [x] 6.3 Update `wiki/stack/employee-access.md` for the popup, the page that owns the app's frame or `wiki/stack/cloudflare-access.md` for signing out, and the `## Next` changelog entry for all three; keep the wiki page under its word limit. Verify with `node scripts/check-payload-links.mjs`.

## 7. Verification

- [x] 7.1 Run the app's test chain (`npm test` in `app/`) and `node .github/scripts/checks.mjs --worktree`; fix what fails.
- [x] 7.2 After `/save`, walk the preview as the checker at a computer width and a phone width: People with the owner row, a role picked in a row and undone, the `⋯` menu, a person's page with the tabs showing, Roles, Apps, Keys, and the Connect dropdown opened. Show the pictures, and name what only code tests cover (a waiting sign-in, the non-owner view).
- [x] 7.3 Run the test chain and the worktree checks again after group 6; fix what fails.
- [ ] 7.4 After `/save`, walk the preview again at both widths: the full-width bar with *Sign out* on Home and Access, and the Connect popup opened and closed. Show the pictures; a person confirms the sign-out itself on the live app.
