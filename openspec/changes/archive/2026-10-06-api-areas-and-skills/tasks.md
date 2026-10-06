# Tasks

Build sections 1–5 together, authoring each group's tests and docs beside its code. Run nothing between tasks: no tests, no build, no `/save`. The boxes in 1–5 are checked by source review; section 6 is the one gate.

## 1. Worker: areas and levels

- [x] 1.1 Widen the catalogue in `app/worker/employee-access/catalogue.ts` to screen folders plus server folders ([design 1](design.md)), with each area's title, description and whether it has a screen; a server-only `api.ts` exports `title` and `description` ([design 2](design.md)). Author tests: a server-only folder is an area, one with no title fails by name, a main route mapped to an uncatalogued name fails by name, and Home's list still holds screens only.
- [x] 1.2 Add a migration under `schema/migrations/` giving `wong_access_grants` and `wong_access_role_apps` a `level` column defaulting to `write` ([design 3](design.md)), and update `schema/seed.sql` so the practice people hold differing area levels ([design 9](design.md)). Verify by a test that a row written before the migration reads back at `write`.
- [x] 1.3 Read a level per area in `currentPolicy()` and require it in `refusal()` by `needFor()`, before the key check ([design 4](design.md)): owner and verification token at `write`, a page visit and the app list at `read`, a refusal that names the area and level. Author tests: Look up runs a read and is refused a write, a lowered level governs the next request, a shared route needs each area at the level, unreadable data still denies.
- [x] 1.4 Carry a level per area through `sets.ts`, `grants.ts`, `members.ts`, `roles.ts` and `start.ts` ([design 5](design.md)): saves take a level or none, a role's holders read the role's levels, the first open records every built area at `write`, and a person given an area from the Apps view starts at `read`. Author tests for each save shape and for the first open.
- [x] 1.5 Confirm discovery hides an action the caller's area level refuses, in `app/worker/api/discovery.ts`, adding no field. Author a test: a person at Look up sees an area's read actions and not its changing ones, in the list, the single-action view and the OpenAPI document.

## 2. Worker: skills in Access

- [x] 2.1 Add a skills catalogue in `app/worker/employee-access/` that reads each `.agents/skills/*/actions.json` at build and resolves its ids to what the skill needs: a level per area, a level per key, and Project code ([design 6](design.md)). Author tests: the highest level wins per area and key, and an id no route registers or a missing title fails by skill name ([design 7](design.md)).
- [x] 2.2 Extend the Access status response with `areas` and `skills`, and the schemas in `app/src/lib/access.ts`. Verify by tests for an installation with no skill, one skill, and a no-screen area.
- [x] 2.3 Add the source-only `sample` server area and the hidden `sample-report` skill with its `actions.json` ([design 9](design.md)), in no payload list. Verify that `node scripts/check-payload-links.mjs` and the payload-files test still pass with both present.

## 3. Access screens

- [x] 3.1 Rework `levels.ts` for a level per area: what an app and a skill need, whether a set covers each, the gap lines, the row summary and `sameSet`. Author tests for an app gap by area, a skill gap by key, a skill gap by Project code, and a set that covers everything.
- [x] 3.2 Rebuild `SetFields.tsx` as the three parts ([design UX](design.md#ux)): *Start from* chips that fill an app at Look up and Read, or a skill at everything it needs; *Can reach* with a level per area and key, the *opens* line and the *new* mark; *Can't yet* with *Give what it needs*. Author tests: each press fills and marks without saving, a hand change clears the chip's mark, leaving asks first, and the saved set matches the list.
- [x] 3.3 Add the Skills view and a skill's panel, with their addresses in `address.ts` and the fifth entry in the view heading: the list, the empty state, and who can and can't run a skill with what each lacks. Author tests for each state and for Back and reload keeping the place.
- [x] 3.4 Show no-screen areas in the Apps list and its opened panel, marked *No screen*, with a level beside each tick; count skill gaps in the People and Roles rows' *! gap*. Author tests for a no-screen row and for a row whose only gap is a skill.
- [x] 3.5 Show the caller's own area levels in the view of someone who manages nothing. Author a test for a person at Look up.

## 4. The skill rule and its check

- [x] 4.1 Add `scripts/check-skill-actions.mjs` ([design 7](design.md)) and run it with the code checks when app code or a skill folder changed. Author tests in `scripts/tests/` with a skill that names a key's secret, one that calls an unlisted action, one that calls a memory read, and a clean one; verify the check passes on this repo's skills.
- [x] 4.2 Write *Build a skill on actions* in `wiki/stack/company-api.md` ([design 8](design.md)), and link it from `AGENTS.md`'s company-actions line and from *Where things go* in `.agents/rules/code.md`. Verify with `node scripts/measure-context.mjs --check` and `node scripts/check-payload-links.mjs`.

## 5. Docs and release

- [x] 5.1 Update `wiki/stack/employee-access.md` (areas and their levels, the five views, the panel's three parts, the Skills view, what the first open records), `wiki/stack/mini-apps.md` (a server-only area) and `wiki/stack/employee-project.md` (a skill needs Project code and the areas it calls). Verify every changed heading that another page links still resolves, with `node scripts/check-payload-links.mjs`.
- [x] 5.2 Add the `## Next (minor)` entry to `CHANGELOG.md` in plain words, with an **Updating.** note: nobody loses anything, a custom app folder with no screen needs a title, and a `POST` that only looks things up should be described as a read. Name the new spec in `.agents/skills/memory/references/areas.json`. Verify with `node .github/scripts/checks.mjs --worktree`.

## 6. Verification

- [x] 6.1 Run the app suite and the payload checks, then `/save` and wait for CI. Verify every check is green.
- [x] 6.2 On the preview, walk Access as the owner: lower a practice person's area to Look up and see a changing call refused by name; open a role, press the sample skill in *Start from*, save, and see it listed as able to run in Skills; see the `sample` area marked *No screen* in Apps and absent from Home. Verify with pictures of each.
