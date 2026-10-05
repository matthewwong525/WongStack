# Tasks

## 1. Database and server

- [x] 1.1 Add the managers table as one additive migration in `schema/migrations/`, named by the pipeline's timestamp rule, and add it to the migration list in `app/tests/employee-access/connections.ts`; verify the fixture's `database()` builds with it.
- [x] 1.2 In `policy.ts`, add `manages` to the `not_started` and `current` states, read in the same snapshot, leaving `role` as it is; add `policy.test.ts` cases: an active person with a manager row manages, a removed person, a person with no row and a service token do not, a manager's apps and key levels stay their own, a manager is still refused an unmapped route and a `kind: "owner"` route, and the checker manages on staging and not on production.
- [x] 1.3 In `core.ts`, admit a manager through the owner gate without ever creating the installation row for them, add `actor` and `owner` to `Core`, and make `audit()` in `sets.ts` write the actor; add `core.test.ts` cases: a manager gets a core with their own email as actor, a former manager and an ordinary employee get `owner_required`, and no row is created by a non-owner.
- [x] 1.4 In `members.ts`, accept `manager` on the people save with the limits in design decision 4, clear the switch on removal, and add `manager` per person and `viewer` to the status response; add `management.test.ts` cases: a manager adds a person and the sign-in list follows, edits a role, sets a level, and changes their own and another manager's set; a manager is refused making or unmaking a manager, removing a manager, removing themselves and changing the owner, with nothing written; the owner's untick refuses that person's next request; a removed manager added back is not one; each audit row names who acted.
- [x] 1.5 In `apps.ts`, add `manages` to the response for the `not_started` and `current` states; assert it for the owner, a manager and an ordinary employee in the existing response tests.

## 2. Access screen

- [x] 2.1 Carry `manages`, `manager` and `viewer` in the schemas in `app/src/lib/access.ts`; verify the existing fixtures in the Access tests still parse once updated.
- [x] 2.2 In `App.tsx` and `Owner.tsx`, show a manager what they can use, then one line naming the owner, then the four views; add `App.test.tsx` cases for the three sides: owner, manager, everyone else.
- [x] 2.3 In `PersonPage.tsx`, show the owner the *Managing* group with the tick and the full-trust line, send `manager` only from the owner, and show a manager a plain line on a manager's page with no tick; add `PersonPage.test.tsx` cases: the owner ticks and the save carries it, an untouched tick leaves the page unchanged for the leave question, and a manager's save never names `manager`.
- [x] 2.4 In `People.tsx` and `Notices.tsx`, mark managers beside the role line, name the owner once, leave *Remove* off a manager's row for a manager, add the stops-managing sentence to the owner's removal confirm, and give a manager the one-step-left-for-the-owner notice with nothing to copy; assert each in `App.test.tsx`.
- [x] 2.5 Add any style the group and the labels need to `Access.css`; verify `style.test.ts` holds it with none of its checks loosened and nothing marked by colour alone.

## 3. Practice list

- [x] 3.1 Make Dana a manager in `schema/seed.sql`; assert in `seed.test.ts` that the practice status lists Dana as one, with the same apps and key level as before.

## 4. Docs and release

- [x] 4.1 In `wiki/stack/employee-access.md`, add a *Managers* section (who picks, what a manager can and can't do, that it is full trust, that it gives no app or key) and correct each line that says only the owner manages people, roles or levels, the four views and the practice list included; verify with `node scripts/check-payload-links.mjs`.
- [x] 4.2 Add a `## Next (minor)` entry at the top of `CHANGELOG.md` in plain words, with an **Updating.** note that nothing needs doing by hand and nobody is a manager until the owner ticks them; verify the entry is the first one.

## 5. Verification

- [x] 5.1 Run the app's test chain (`npm test` in `app/`) and `node .github/scripts/checks.mjs --worktree`; fix what fails.
The preview walk is the publish step's own check, not a box here: walk the preview as the checker: open Dana's page and see the tick with its full-trust line, untick and save, see *Manager* gone from Dana's line in People, then tick it back; show the pictures, and name what only code tests cover: a manager's own view and every refusal.
