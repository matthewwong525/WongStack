<!-- openspec-archive v1 2026-10-08-apps-and-keys-apart -->
<!-- file proposal.md utf8 17126 -->
# Apps by a tick, keys by a level, and nothing between them

**Status:** ready-to-ship

**Branch:** simplify-keys-screens

**Open questions:** none

## Why

Access asks you to think about too many things at once. A person has areas, each at a level, and keys, each at a level, and an app only works when both line up, so the page needs warnings, starting points and a list of what a person can't do yet. You want two plain things that don't depend on each other: which apps a person can use, and what they may do with each key.

## What Changes

- **An app is a tick, a key is a level, and neither depends on the other.** You tick the apps a person can use. Separately, you pick *None*, *Read* or *Read & write* for each key. Areas, and their *Look up* and *Look up & change* levels, are gone.
  ```text
  what decides      │ BEFORE        │ AFTER
  ──────────────────┼───────────────┼────────────
  open Orders       │ area level    │ app tick
  refund in Orders  │ area + Stripe │ app tick
  assistant uses    │ Stripe level  │ Stripe level
  Stripe by itself  │               │
  ```
- **A ticked app does everything it was built to do.** Someone with Orders ticked can open it, look things up and change things, whatever keys Orders uses. An app no longer refuses a person because their level for a key is too low. So on the update, a person with an app ticked may be able to do more in it than before: check each person's apps afterwards.
- **A key's level decides only what a person's assistant may do with that key by itself.** That means the look-ups in Cloudflare, putting the project on their computer, and using a key directly. The *Keys* part of a person or role says so in one line.
- **A person opens to three things: their role, their apps, their keys.** *Start from*, *Can reach* and *Can't yet* go, and so do the `!` gap marks on the People and Roles lists. A role opens to the same two lists. Each key says beside its name whether it is saved, with the step left when it is not. *Can install the project* and *Can manage Access* stay where they are. Someone who manages nothing sees their own apps and key levels.
  ```text
    BEFORE                       AFTER
  ┌──────────────────────────┐ ┌──────────────────────────┐
  │ ana@example.com       ✕  │ │ ana@example.com       ✕  │
  │ Role [Their own set ▾]   │ │ Role [Their own set ▾]   │
  │ Start from               │ │ Apps                     │
  │ [Orders] [Refund]        │ │ [x] Orders  [ ] Payroll  │
  │ Can reach                │ │ Keys                     │
  │ Orders  (•) Look up      │ │ Stripe · Saved           │
  │ Stripe  (•) Read         │ │  ( ) None (•) Read       │
  │ Can't yet                │ │  ( ) Read & write        │
  │ ! Refund: Stripe R&W     │ │ Maps · Not saved yet     │
  │ [Save access] [Cancel]   │ │  ( ) None ( ) Read       │
  └──────────────────────────┘ │ [Save access] [Cancel]   │
                               └──────────────────────────┘
  ```
- **Access is two lists: People and Roles.** The Apps and Keys lists go. You set apps and key levels inside a person or a role, and nowhere else. The lists still say how much each has, such as *2 apps, 1 key*.
  ```text
    BEFORE                       AFTER
  ┌──────────────────────────┐ ┌──────────────────────────┐
  │ People Roles Apps Keys   │ │ People  Roles            │
  │           [Add person]   │ │             [Add person] │
  │ Who       Role  Has      │ │ Who       Role  Has      │
  │ ana@…     own   2 apps   │ │ ana@…     own   2 apps   │
  │ ben@…     Sales 1 app    │ │ ben@…     Sales 1 app    │
  └──────────────────────────┘ └──────────────────────────┘
  ```
- **A key's level alone decides direct use; the separate switch goes.** Once a key's service is set up for it, *Read* lets a person's assistant look things up with the key directly and *Read & write* lets it change things. There is no Off, Look-ups only or Look-ups and changes to pick, and no place in Access for it. So direct use is on for you on every such key from the update, and for anyone you give a level. To stop it for a person, set their level to *None*.
  ```text
  key level    │ direct look-up │ direct change
  ─────────────┼────────────────┼──────────────
  None         │ no             │ no
  Read         │ yes            │ no
  Read & write │ yes            │ yes
  ```
- **Anyone who could only look is unticked, and Access tells you who.** A tick can't say *look but don't change*, so a person or role held at *Look up* loses that app on the update. Nobody gains the power to change things by surprise. Access names each one until your next save there. That old *Look up* setting can't be brought back after that save; you tick the app again instead.
  ```text
  ┌──────────────────────────────┐
  │ People  Roles  Apps  Keys    │
  │                              │
  │ ! Unticked in this update    │
  │ They could only look, and    │
  │ a tick gives everything:     │
  │   kim@example.com: Orders    │
  │   Sales role: Payroll        │
  │ Tick an app to give it back. │
  │                              │
  │ Who          Role   Has      │
  │ kim@…        own    1 key    │
  └──────────────────────────────┘
  ```
- **Work with no screen sits inside an app or behind a key.** Work built only for skills and assistants is no longer something you give by itself. Inside an app, that app's tick covers it. Using a key, that key's level covers it. Work with neither can't be published, and the check names it.
  ```text
  work with no screen
     │
     ├─ inside an app ──▶ the app's tick
     ├─ uses a key ─────▶ the key's level
     └─ neither ────────▶ can't be published
  ```
- **The Skills list leaves Access.** Skills run exactly as before, and each call is still allowed or refused by the caller's apps and keys. Access just stops showing who can run each one.
- **Giving an app gives no key level.** Until now a new app also gave *Read* on each key it used. A key level now changes only when you change it.

## Non-goals

No change to who can sign in, roles or managers. No change to how *Read* differs from *Read & write*. No new way to let someone look at an app without changing it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `employee-onboarding`: Access has two views, People and Roles; an app grant is a tick that covers all of the app; area levels, no-screen areas and the three-part panel are removed; look-only grants end unticked and are named; work with no screen must belong to an app or a key.
- `key-access`: key levels are set only from a person or a role, a key's saved state shows there, and its direct-use choice is removed so the level alone decides a direct request; a key level governs only calls that belong to the key alone and direct use; an app's calls no longer check it; giving an app gives no level; the gap requirement is removed; key levels start with nobody holding one.
- `skill-actions`: Access no longer lists skills or works out who can run one; each call is still judged by the caller's apps and key levels.

## Impact

- Worker: `app/worker/employee-access/` (policy, catalogue, sets, grants, members, roles, start, status, apps, key-catalogue; `skills.ts` removed), `app/worker/apps/index.ts`, `app/worker/api/discovery.ts` tests; `schema/seed.sql`. No migration: the `level` column stays and only `write` counts.
- Screens: `app/src/apps/access/` (`SetFields`, `levels.ts`, `Labels`, `AppAccessPage`, `Apps`, `KeyPage`, `Notices`, `Own`, the view heading; `Skills.tsx` and `SkillPage.tsx` removed), `app/src/lib/access.ts`.
- Source-only: `app/worker/apps/sample/` and `.agents/skills/sample-report/` are removed, since they showed a no-screen area and the Skills list.
- Docs: `wiki/stack/employee-access.md`, `access-screens.md`, `mini-apps.md`, `company-api.md`, `employee-project.md`, `README.md`; `scripts/retired-names.json`.
- Payload release: `CHANGELOG.md` entry, **major**: an installed app's folder with no screen and no key stops passing the checks, and look-only grants end.

## Decision log

- **2026-10-08** — Asked whether key levels and screens should be different things with areas removed → chose yes, after reading what it costs: no look-only on an app, and no separate home for work with no screen.
- **2026-10-08** — Asked who can use work that has no screen → chose a key or an app guards it, and the checks refuse work with neither.
- **2026-10-08** — Asked what happens to anyone held at Look up on an app → chose untick them and say who.
- **2026-10-08** — Asked how much of a person's page goes → chose, in Matthew's words, "per person we get a dialog where we can give them access to screens or apps and we can set roles".
- **2026-10-08** — Asked whether Access should still warn when a ticked app needs a key level the person lacks → chose no warnings: "App access should have everything key access is something else. Like they are not related".
- **2026-10-08** — Asked whether a person with Orders ticked and Stripe at None can refund from Orders → chose yes: the tick gives all of Orders.
- **2026-10-08** — Asked which of Access's five lists stay → chose drop Skills.
- **2026-10-08** — Assumed: roles and managers stay as they are, because Matthew named roles as part of the person's page and nobody asked to change managers.
- **2026-10-08** — Assumed: the person still opens in the panel beside the list, not a new centred popup, because that panel is the dialog Access already has and every Access row opens the same way.
- **2026-10-08** — Assumed: the screens keep the word *app*, because Home, the Apps list and every other page already call a screen an app, and Matthew used both words.
- **2026-10-08** — Assumed: an assistant with an app ticked can call every action of that app, changes included, because the tick gives all of the app and a screen's call and an assistant's call are judged alike.
- **2026-10-08** — Assumed: a key level a person already holds stays as it is, because it still decides what their assistant may do with that key by itself.
- **2026-10-08** — Assumed: Access does not list the people whose apps can now do more, and the update note says to check, because every person with a ticked app that uses a key would be on that list and nothing was taken from them.
- **2026-10-08** — Assumed: the unticked notice clears at the next save in Access, because the earlier "everyone kept their access" notice clears the same way and a notice that never leaves stops being read.
- **2026-10-08** — Assumed: on an install where key levels have not started yet, they start with nobody holding a level, because apps no longer need one and a level given for an app's sake would only widen what an assistant can do.
- **2026-10-08** — Assumed: the Apps and Keys lists still say which apps use a key, as information only, because it tells the owner what a key is for.
- **2026-10-08** — Assumed: the source repo's sample no-screen folder and its sample skill are removed, because they exist only to show a no-screen area and the Skills list on a preview.
- **2026-10-08** — Assumed: this is a major release, because an installed app's folder with no screen and no key stops passing the checks.
- **2026-10-08** — Check: `app/src/apps/access/Skills.test.tsx` and `app/worker/employee-access/skills.test.ts` are deleted with the Skills list they tested; nothing they covered is left to check.
- **2026-10-08** — Check: `app/worker/employee-access/area-levels.test.ts` is deleted with area levels; its cases for who holds an app and what a key level refuses now live in `key-access.test.ts`.
- **2026-10-08** — Check: `app/worker/apps/sample/api.test.ts` and `app/worker/apps/sample/seed.test.ts` are deleted with the source-only sample folder they tested; `app/worker/apps/screenless.test.ts` covers a folder with no screen.
- **2026-10-08** — Asked, on the first preview, for a cleaner screen → chose only People and Roles as lists, with apps and keys set inside each: "we should only see people and rows here and then when we adjust the people and roles we'll be able to adjust the keys / apps within them".
- **2026-10-08** — Asked where a key's direct-use choice goes with no Keys list → chose a small Key settings panel, over dropping the switch or keeping the Keys list.
- **2026-10-08** — Assumed: nothing sets one app or one key for several people at once any more, because a role already does that and Matthew chose to set both inside a person or a role.
- **2026-10-08** — Assumed: Key settings also shows whether each key is saved and the step left, because the Keys list was the only place that said so.
- **2026-10-08** — Assumed: Key settings no longer says which apps use a key, because apps and keys are unrelated now and the line invites reading them together.
- **2026-10-08** — Check: `app/src/apps/access/Grants.test.tsx` is deleted with the Apps and Keys lists and the one-for-many save it tested. Its cases for a key's saved state, next step and direct-use choice now live in `KeySettings.test.tsx`; the unticked notice and the rows' links moved to `Roles.test.tsx`.
- **2026-10-08** — Assumed: Key settings opens at `people/keys` or `roles/keys`, because it opens over whichever list is showing and closing it returns to that list; the old `keys` and `keys/<id>` addresses show People like any unknown address.
- **2026-10-08** — Assumed: a save still names apps as given or not, because the person and role panels already send them that way and decision 13 asks for a plain list only where that is simpler.
- **2026-10-08** — Asked, on the second preview, why Key settings is needed → chose to drop the direct-use switch and the panel, so a key's level alone decides direct use.
- **2026-10-08** — Assumed: each key's saved state and its step left show beside the key where a person or a role is opened, because no other place in Access lists keys now.
- **2026-10-08** — Assumed: a choice already saved for a key is ignored, not deleted, because nothing reads it and going back a version finds it as it was.
- **2026-10-08** — Check: `app/src/apps/access/KeySettings.test.tsx` is deleted with the Key settings panel. Its cases for a key's saved state, its step when unsaved, the manager's reading of the owner's step and a preview now live in `PersonPage.test.tsx`, with the role's in `Roles.test.tsx`; its direct-use choice and its save have nothing left to check, and `direct.test.ts` holds that a saved choice changes nothing.
- **2026-10-08** — Assumed: a direct route keeps a mark in its mapping and the policy carries whether key levels have started, because the key-access spec says no direct request runs until they have, the owner's included, and the owner otherwise holds every key from the start.
- **2026-10-08** — Assumed: the local check run counts as done with two parts still failing, because both fail only until the save: one script test reads the deleted sample files from git's file list, and the retired-names check reads a spec the archive rewrites. The automatic checks after the save decide.
- **2026-10-08** — Assumed: the save and preview walk of task 7.3 are the publish run's own save and walk, because Matthew chose to publish and that run makes one save; the box is closed here and the walk's verdict stands in for it.
- **2026-10-08** — Asked, on the third preview, for fewer words on a person's panel → cut the lines under *Can install the project* and the keys, the *new person starts with no apps* line, and shortened the manager note.
- **2026-10-08** — Archived for publishing as 39.0.0, with main brought in through 38.2.1; the checkpoint after this entry is the one that merges.
- **2026-10-09** — Brought main in again through 38.3.0 after another release landed first; still numbered 39.0.0. The checkpoint after this entry is the one that merges.
- **2026-10-09** — Brought main in a third time, through 38.4.0, after another release landed first. The checkpoint after this entry is the one that merges.

<!-- end proposal.md -->
<!-- file design.md utf8 9561 -->
# Design

## Context

See [the proposal](proposal.md) for why. Today `refusal()` in `app/worker/employee-access/policy.ts` judges a mapped route twice: the caller's level for each area, then their level for each key the route lists, both by what the call does. The catalogue in `catalogue.ts` counts a server folder with no screen as an area. Access's panel, gap lines and Skills view all exist to reconcile the two checks. Area levels shipped in 37.1.0, two days before this plan, so few installs hold a lowered level.

## Goals / Non-Goals

**Goals:**

- One check per call: an app's call needs the app's tick; a key's own call needs the key's level.
- Less code than today in the policy, the sets, and the Access screens.
- An update that widens nobody's reach to change an app's own data.

**Non-Goals:**

- No table or column is dropped. No change to roles, managers, the sign-in list, direct use's choice, or how a call's need is worked out from its effect and method.

## Decisions

1. **An app's call checks the tick and nothing else.** `CurrentPolicy.apps` becomes a set of app ids. For a route mapped `{ apps, keys? }`, `refusal()` checks every mapped app is held and stops: no key level, no `need`. A route mapped `{ keys }` alone keeps today's check, by `need`, with direct use's choice after it. The refusal for a missing app stays `App access denied`; the area-and-level message goes. *Over* keeping the key check behind the tick: Matthew chose that a tick gives all of the app.

2. **Only `write` counts as a tick; no migration.** The policy query and `readSets()` read grant rows `WHERE level = 'write'`, so a row at `read` is not held. Every save writes `write`, which is the column's default. *Over* a migration that drops the column: every earlier migration here is additive so a Worker from before it keeps working, and SQLite can't drop a column under a `CHECK` without rebuilding the table.

3. **Rows at `read` are named, then cleared at the next save.** The status carries `unticked`: each person and role with a `read` row for a built app, with the app's title. `save()` adds two deletes, of `read` rows in `wong_access_grants` and `wong_access_role_apps`, to every batch, so the notice goes at the next save, as the *kept* notice did. *Over* a dismiss button and a table to remember it: one more control and one more store for a notice most installs never see.

4. **A folder with no screen is its keys' alone.** `handleApp()` and the registrations in `app/worker/apps/index.ts` map a folder that has `src/apps/<name>/app.json` to `{ apps: [name], keys }`, and one that has none to `{ keys }`. A screenless folder with a route that lists no key throws when the module loads, naming the file and the two fixes, so `npm test` fails before a publish; at run time such a route is refused for everyone, as a key-alone mapping with no key already is. The catalogue is the screen folders only: `serverFolders()`, `areas()`, and the `title` and `description` exports of a screenless `api.ts` go. *Over* keeping screenless folders as ticks: Matthew chose a key or an app.

5. **A set is a list of apps and a level per key.** `AccessSet` becomes `{ apps: string[]; keys: Levels }`. A save names apps as `Record<string, boolean>`, so the Apps view can still tick one app for several people without sending each whole set. `changedSet()` no longer gives Read on a new app's keys. The app form of `grants.ts` loses its `keys` part.

6. **Key levels start empty.** `startKeyLevels()` only turns the switch on. The `kept` count, its audit suffix and its notice go.

7. **Skills leave the status.** `skills.ts`, its test, the status's `skills` field, the Skills view and its address go. A skill's `actions.json` and `scripts/check-skill-actions.mjs` stay: the publish check reads the files itself and never imports `skills.ts`. `direct.test.ts` uses `listSkills()` for one case, which goes with it. `payload-files.json` drops both files.

8. **The status loses what the screens no longer show.** `areas` becomes `apps` (`id`, `title`, `description`), and `people[].apps` and `roles[].apps` become string lists. `appKeys` and a key's `usedBy` stay, as information. The self-service answer in `apps.ts` drops `areas` and keeps `apps` and `keys`.

9. **Discovery needs no edit.** It lists an action when `policyAllows()` passes, so a ticked app's actions all show. Its tests change to say so.

10. **The source-only sample goes.** `app/worker/apps/sample/`, `.agents/skills/sample-report/`, their seed rows, and the journeys *work built for a skill alone* and *the employer gives a skill in one press* are removed. The seed keeps one person with a `read` row, so a preview shows the unticked notice.

11. **Old names are retired.** `scripts/retired-names.json` gains *Look up & change* and the wiki anchors `#areas-and-their-levels`, `#the-skills-view`, `#an-area-with-no-screen` and `#a-set-has-three-parts`, each with its replacement.

12. **Two views, and one panel for keys.** `VIEWS` is People and Roles. `Apps.tsx`, `AppAccessPage.tsx`, `Keys.tsx` and `KeyPage.tsx` go. A new `KeySettings.tsx` is a `Page` at the address `keys`, opened over whichever list is showing by a *Key settings* button beside the add button: per key its saved state, its next step when unsaved, and its direct-use choice with the count it reaches. Its one save posts each changed choice to `direct`. The addresses `apps`, `apps/<id>` and `keys/<id>` are unknown addresses, handled as any other. This supersedes decision 5's Apps-view save and the key-page line in the UX notes below.

13. **The one-for-many save goes.** With no Apps or Keys page, nothing posts to `grants`: `grants.ts`, its route and its tests are removed, and a save names apps as a plain list again where that is simpler than given-or-not. The status drops `appKeys` and each key's `usedBy`; `key-catalogue.ts` keeps only what the key list needs.

14. **No direct-use choice; no Key settings.** This supersedes decision 12's panel. `KeySettings.tsx` and its test go, with the *Key settings* button and the `keys` address. In the worker, `lackingChoice()`, the policy's `direct` map and its read of `wong_access_key_direct`, `changeDirect()` and its `direct` save route go: a direct route is a key-alone route judged by `need` like any other. The table stays, unread. A key's status entry carries `direct` as a plain yes or no, whether its service is set up, so a person's key line can say the level also reaches the service directly. `SetFields.tsx` shows each key's saved state beside its name and its next step when unsaved, moved from the removed panel. The refusals *direct use is off* and *direct changes are off* go.

## UX

### Use-case brief

The owner or a manager decides who can do what a few times a month, at a desk or on a phone, when someone joins or a new app arrives. The job is "let Kim use Orders" or "let Kim's assistant look things up in Stripe". Done is one save. The common case is one tick; a key level is the edge case and sits lower on the same panel. Assumed: tens of people, under twenty apps, a handful of keys. This simplifies the closest existing screen, a person's panel in Access.

### Flow

Give an app: People or Roles → open a row → tick the app → *Save access*. Give one app to several: give it to their role. Set a key level: open a row → pick a level → *Save access*. After an update: read the unticked notice → open each name → tick or leave → save.

### Hierarchy

Panel: *Save access* is the one primary action. Apps come first, then Keys, then *Can install the project*, then *Managing*. The unticked notice sits in the notice spot above the list, marked `!` and words, never colour alone.

### Review

[Review page](review.html). The fourth item sketches a person's panel before and after; the fifth the two lists before and after; the seventh the People list with the unticked notice. Each fits phone width.

### Components

Existing: the view heading, `Table`, the side panel `Page`, `Tick`, `LevelChoice`, `Group`, `Notices`, `Labels`. Changed: `SetFields` becomes two groups; `levels.ts` loses gaps, starting points and area levels. Removed: `Skills`, `SkillPage`, `Apps`, `AppAccessPage`, `Keys`, `KeyPage`. New: none. Loading and failed reads keep the existing states.

## Risks / Trade-offs

- [Direct use is on for the owner, and on a preview for the checker, on every key set up for it] → Setting a key's service up is itself a reviewed step in `keys.ts`; the changelog's update note says it; a preview holds no real service key.
- [A person with an app ticked can now do what a key level held back] → The proposal, the changelog's update note and the key's own page say so; the owner unticks the app to stop it.
- [An installed app's screenless folder with no key fails the checks after the update] → The error names the file and both fixes; the update note says it first.
- [`read` rows linger on an install nobody opens Access on] → They are never held, so they give nothing; they clear at the first save.
- [A Worker from before this change reads a new save] → It reads `write` rows as Look up & change and key levels as before, so going back refuses nothing new.
- [Two edits to the same Access files in flight] → Bring `main` in before the first save, as the last Access rebuild needed.

## Migration Plan

No schema change. Publish; on each install the next request reads only `write` rows. Going back to the earlier version restores the area and key checks from the same rows, less any `read` rows a save cleared.

<!-- end design.md -->
<!-- file tasks.md utf8 12167 -->
# Tasks

Build sections 1–4 together, authoring each group's tests and docs beside its code. Run nothing between tasks: no tests, no build, no `/save`. The boxes in 1–4 are checked by source review; section 5 is the one gate. Bring `main` in before the first save.

## 1. Worker: one check per call

- [x] 1.1 In `app/worker/employee-access/policy.ts`, make `CurrentPolicy.apps` a set of app ids read from rows `WHERE level = 'write'`, and make `refusal()` stop at the app check for a route mapped to apps: no key level, no `need`, no area message ([design 1, 2](design.md)). A key-alone route keeps its level and direct-use checks. Rewrite `policy.test.ts` and `key-access.test.ts` for it and replace `area-levels.test.ts` with cases for: a held app with no key level runs a change that uses a key; a `read` row is not held; a key-alone change at Read is refused by name; the owner and the checker hold every app.
- [x] 1.2 In `catalogue.ts` and `app/worker/apps/index.ts`, make the catalogue the screen folders only, map a screenless folder's routes to their keys alone, and throw at load, naming the file and both fixes, when such a route lists no key ([design 4](design.md)). Remove `serverFolders()`, `areas()` and the screenless `title` and `description`. Update `catalogue.test.ts` and `apps/index.test.ts`: a screenless folder with a key is refused without the key's level and runs with it; one with no key throws by name.
- [x] 1.3 In `sets.ts`, `grants.ts`, `members.ts` and `roles.ts`, make a set a list of apps and a level per key, take app changes as given or not, stop giving Read on a new app's keys, drop the app form's `keys` part, and add the two deletes of `read` rows to `save()` ([design 3, 5](design.md)). Update `management.test.ts` and `key-saves.test.ts`: giving an app changes no key level; any save clears `read` rows; a role's holders read the role's apps.
- [x] 1.4 In `start.ts`, make `startKeyLevels()` only turn the switch on, and drop the `kept` count ([design 6](design.md)). Update `start.test.ts`: an install with people starts key levels with nobody given one, and a held level is kept.
- [x] 1.5 Remove `skills.ts` and `skills.test.ts`, and the `listSkills()` case in `direct.test.ts` ([design 7](design.md)). In `members.ts` and `apps.ts`, shape the status and the self-service answer by [design 8](design.md): `apps`, string lists for people and roles, `unticked`, no `skills`, `areas` or `kept`. Update `status.test.ts` for a person and a role with a `read` row, named with the app's title, and for none.
- [x] 1.6 Update `app/worker/api/discovery.test.ts`: a person who holds an app sees its look-ups and its changes in the list, the single-action view and the OpenAPI document, and a person without it sees none ([design 9](design.md)). Verify by reading that `discovery.ts` itself needs no edit.

## 2. Access screens

- [x] 2.1 Update the schemas in `app/src/lib/access.ts` to the new status and self-service answers. Cut `levels.ts` to what is left: a key's level names, direct use's names, counting, `sameSet`, and the row summary `2 apps, 1 key`; remove gaps, starting points, `reachName` and the *opens* line. Rewrite `levels.test.ts` for the functions that remain.
- [x] 2.2 Rebuild `SetFields.tsx` as two groups, *Apps* as ticks and *Keys* as a level each, with *Can install the project* after them ([design UX](design.md#ux)). `PersonPage.tsx` and `RolePage.tsx` send apps as given or not. Update `PersonPage.test.tsx`, `Roles.test.tsx` and `Leaving.test.tsx`: a tick saves the app and no key level; leaving with a changed tick asks first; no *Start from*, *Can reach* or *Can't yet* shows.
- [x] 2.3 Make `Apps.tsx` and `AppAccessPage.tsx` list only apps, with ticks for roles and people and no level or key beside one. Remove `!` gap marks from `Labels.tsx`, `People.tsx` and `Roles.tsx`. Update `Grants.test.tsx`, `App.test.tsx` and `subjects.test.ts`.
- [x] 2.4 Remove `Skills.tsx`, `SkillPage.tsx`, `Skills.test.tsx`, the `skills` address in `address.ts` and its entries in `Owner.tsx` and `View.tsx`. Verify by a test that the view heading has four entries and `/apps/access/skills` shows the People list or not-found as other unknown addresses do.
- [x] 2.5 In `KeyPage.tsx`, add the line saying a level lets a person's assistant use the key by itself and that apps need none. In `Notices.tsx`, replace the *kept* notice with the unticked one: each person and role with the app they lost, and *Tick an app to give it back*. In `Own.tsx`, show the person's apps and key levels with no area level. Author tests for the notice with one person and one role, for no notice, and for `Own`.
- [x] 2.6 Update `style.test.ts` and any other Access test that names a removed part, and confirm no file under `app/src/apps/access/` still imports one.

## 3. Sample data and saved walks

- [x] 3.1 Remove `app/worker/apps/sample/` and `.agents/skills/sample-report/` ([design 10](design.md)), their rows in `schema/seed.sql`, and their entries in `.agents/skills/wong-sync/references/payload-files.json` beside `skills.ts` and `skills.test.ts`. Keep one practice person and one role with a `read` row for Hello, and reword the seed's comments to apps and key levels. Update `seed.test.ts` and any script test that names the sample folder as a real path.
- [x] 3.2 Remove the journeys `work-built-for-a-skill-alone.json` and `the-employer-gives-a-skill-in-one-press.json` under `.agents/verification/journeys/employee-onboarding/`, and drop `skills.ts` from the file lists of the journeys that stay. Verify with the journeys' own script test.

## 4. Docs and release

- [x] 4.1 Rewrite `wiki/stack/employee-access.md`: *Apps* replaces *Areas and their levels*; *Key levels* says a level governs the key by itself and never an app; the Skills view section goes; *What a person's apps govern* and the practice list say apps. Rewrite `wiki/stack/access-screens.md` for four views, the two-group panel, the unticked notice, and no gap label.
- [x] 4.2 In `wiki/stack/mini-apps.md`, replace *An area with no screen* with a short section on work with no screen: inside an app or behind a key, and what the check says. In `wiki/stack/company-api.md`, `employee-project.md` and `wiki/stack/README.md`, replace area and level wording and fix each link to a removed heading. In `.agents/rules/code.md`, check the skill line still reads true.
- [x] 4.3 Add the retired names to `scripts/retired-names.json` ([design 11](design.md)) and clear every live mention `node scripts/check-retired-names.mjs` reports.
- [x] 4.4 Add `## Next (major) — Apps by a tick, keys by a level` to `CHANGELOG.md`, with an **Updating.** note in plain words: anyone who could only look at an app is unticked and Access names them; a person with an app ticked can now do everything in it, so look over each person's apps; ask your assistant to check any folder under `app/worker/apps/` with no screen, which now needs a key or a screen; the Skills list is gone and skills run as before.

## 5. Two lists and Key settings

Added after the first preview ([design 12, 13](design.md)). Author tests and docs beside the code; run nothing until section 6.

- [x] 5.1 Cut `VIEWS` in `address.ts` to People and Roles, and remove `Apps.tsx`, `AppAccessPage.tsx`, `Keys.tsx`, `KeyPage.tsx` and their entries in `Owner.tsx` and `View.tsx`. Update `App.test.tsx` and remove or rewrite `Grants.test.tsx`: the heading has two views, and `/apps/access/apps`, `/apps/access/apps/hello` and `/apps/access/keys/stripe` are handled as any unknown address.
- [x] 5.2 Add `KeySettings.tsx`, a `Page` at the address `keys` opened by a *Key settings* button beside the add button on both views: per key its saved state, its next step when unsaved (Project code's step included), and its direct-use choice with what it opens and how many people it reaches; one save posts each changed choice to `direct`; leaving with a change asks first. Move the line *A level lets a person's assistant use this key by itself. Apps need no level.* to the *Keys* group in `SetFields.tsx`. Author tests: a key with a choice saves it, a key with no setup offers none, an unsaved key names its step, a manager reads the owner's step, and the panel opens from Roles too.
- [x] 5.3 Remove `app/worker/employee-access/grants.ts`, its route in `management.ts` and its cases in the tests, and `'grants'` from the screens' save paths. Drop `appKeys` and each key's `usedBy` from the status in `members.ts`, `key-catalogue.ts` and `app/src/lib/access.ts`, with whatever in `levels.ts` and `subjects.ts` only they used. Update `status.test.ts`, `management.test.ts`, `key-saves.test.ts` and the screen tests; the test that cleared look-only rows through `grants` saves through `people` instead.
- [x] 5.4 Update `payload-files.json` for the removed and added files, and the file lists of the saved journeys.
- [x] 5.5 Rewrite `wiki/stack/access-screens.md` for two views and the Key settings panel, and fix `wiki/stack/employee-access.md`, `api-keys.md`, `company-api.md` and `employee-project.md` wherever they name the Apps or Keys list or opening a key. Retire any wiki anchor this removes in `scripts/retired-names.json`. Reword the `CHANGELOG.md` entry: Access is two lists, apps and key levels are set inside a person or role, and Key settings holds direct use.
- [x] 5.6 Add a `Check:` Decision-log bullet in `proposal.md` for each test file this section deletes.

## 6. No direct-use switch

Added after the second preview ([design 14](design.md)). Author tests and docs beside the code; run nothing until section 7.

- [x] 6.1 In `app/worker/employee-access/policy.ts`, remove `lackingChoice()`, the policy's `direct` map and its read of `wong_access_key_direct`, and the two *direct … off* refusals; a direct route is judged by the caller's key level alone. Remove `changeDirect()` from `direct.ts` with its `direct` route in `management.ts`, and `directModes` from `key-levels.ts` if nothing else uses it. In `key-catalogue.ts` and `members.ts`, make a key's `direct` a plain yes or no. Update `policy.test.ts`, `direct.test.ts`, `key-access.test.ts`, `status.test.ts` and `app/worker/api/forward.test.ts`: Read runs a direct look-up with no choice saved and is refused a direct change by name; no level is refused; a saved choice of off changes nothing; discovery lists direct actions by level alone.
- [x] 6.2 Remove `KeySettings.tsx`, `KeySettings.test.tsx`, the *Key settings* button and the `keys` address. In `SetFields.tsx`, show each key's saved state beside its name and its next step when unsaved, and keep the line that a level also reaches the service directly for a key set up for it. Update `app/src/lib/access.ts`, `levels.ts` and the screen tests; `/apps/access/people/keys` is handled as any unknown address. Add a `Check:` Decision-log bullet for the deleted test, naming where its cases went.
- [x] 6.3 Update `payload-files.json` and the saved journeys' file lists. Rewrite the direct-use parts of `wiki/stack/employee-access.md`, `access-screens.md`, `company-api.md` and `api-keys.md`: no choice, the level decides, and what setting a service up now opens. Retire any anchor removed. Reword the `CHANGELOG.md` entry and its **Updating.** note: direct use is on for the owner on every key set up for it, and for anyone holding a level; set a level to None to stop it.

## 7. Verification

- [x] 7.1 Run `node .github/scripts/checks.mjs --worktree` and fix what it reports, including `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs` and `node scripts/measure-context.mjs --check`.
- [x] 7.2 Run `openspec validate "apps-and-keys-apart" --strict --no-interactive`.
- [x] 7.3 `/save`, then walk the preview: the People list shows the unticked notice naming the seeded person and role; open a person, tick Hello, save, and the notice is gone; the heading has two views; no *Key settings* button shows; an opened person lists each key with its saved state; Home still opens Hello. The refusal of a person without an app, and a held app running a change with no key level, rest on `policy.test.ts`, since the checker is the owner on a preview.

<!-- end tasks.md -->
<!-- file specs/employee-onboarding/spec.md utf8 5761 -->
# Spec Delta

## REMOVED Requirements

### Requirement: An area is held at a level

**Reason**: An app is given by a tick that covers all of it; look-only access to an app is no longer offered.

**Migration**: A grant held at Look up & change is the tick. A grant held at Look up ends, by *Look-only access ends without giving more*.

### Requirement: An area may have no screen

**Reason**: Work with no screen is no longer given by itself.

**Migration**: Move it inside an app or have it use a key, by *Work with no screen belongs to an app or a key*.

### Requirement: Area levels arrive without taking anything away

**Reason**: Area levels are removed.

**Migration**: None; *Look-only access ends without giving more* says what an update keeps.

### Requirement: A panel starts from an app or skill and shows what is enforced

**Reason**: A person and a role open to a list of apps and a list of keys, with no starting points and no list of what is missing.

**Migration**: None; *A person or a role opens to apps and keys* replaces it.

## ADDED Requirements

### Requirement: A given app is the whole app

An app SHALL be given to a person or a role as one choice, given or not. A person who holds an app SHALL be able to open its screen and run every call it makes, look-ups and changes alike, from the screen, a direct API call, or an assistant, whatever saved keys the app uses and whatever the person's level for those keys. A person who does not hold it SHALL be refused all of it before business work. The employer SHALL hold every app. Any stricter action or record check SHALL still apply.

#### Scenario: A person with an app and no key level changes something

- **WHEN** a person who holds Orders and has no level for Stripe issues a refund from the Orders screen, where Orders uses Stripe
- **THEN** the refund runs

#### Scenario: A person without the app

- **WHEN** a person who does not hold Orders, and holds Stripe at Read & write, calls an Orders action
- **THEN** the server refuses before any business work

### Requirement: Work with no screen belongs to an app or a key

Company actions with no screen of their own SHALL either belong to an app, where holding that app permits them, or use a saved key, where the caller's level for that key permits them. Only an app that has a screen SHALL be offered where a person or a role is opened. Such work that belongs to no app and uses no key SHALL fail the checks that gate publishing, naming it, and SHALL be refused for everyone if it runs.

#### Scenario: Work built for a skill alone uses no key

- **WHEN** a change adds actions with no screen that belong to no app and use no saved key
- **THEN** the checks fail and name them, before the change can publish

### Requirement: Look-only access ends without giving more

When an installation updates from area levels, a person or role that held an app at Look up & change SHALL hold that app, and one that held it at Look up SHALL not hold it. Access SHALL name each person and role that lost an app this way, with the app, until the next change saved in Access. Nobody SHALL gain the ability to change an app's own data through the update.

#### Scenario: A person who could only look

- **WHEN** an installation where a person held Orders at Look up takes the update
- **THEN** that person's Orders requests are refused, and Access names them and Orders to the employer until the next save

### Requirement: A person or a role opens to apps and keys

Where a person's own set or a role is opened, Access SHALL show the apps as choices to give or not, the saved keys each with its level, and Project code as its one tick, and SHALL change nothing for the person before the employer saves. Access SHALL not mark a person, a role or an app as lacking a key level. The People and Roles lists SHALL say how many apps and keys each person and role has. A signed-in person who manages nothing SHALL see their own apps and key levels.

#### Scenario: The employer gives an app

- **WHEN** the employer opens a person, gives them Orders and saves
- **THEN** the person holds Orders, their key levels are unchanged, and no row is marked as missing anything

#### Scenario: The employer leaves without saving

- **WHEN** the employer gives an app and closes the panel without saving
- **THEN** Access asks before leaving, and the person's access is unchanged

## MODIFIED Requirements

### Requirement: Access lists line up and keep one frame

Access SHALL have two views, People and Roles, each listing its rows with the same columns, each row one line on a computer, readable on a phone without sideways scrolling. Apps and key levels SHALL be set only where a person or a role is opened. The people list SHALL include the employer, marked as the owner, with nothing on that row to change. A person's row SHALL keep the same parts whether they can sign in, are waiting, or were removed. Opening a person or a role SHALL show it with its list still in place, at an address that opens it again, and closing it SHALL return to the list. The switch between the views and the place where Access reports a save, a practice list or an unfinished step SHALL stay the same on every Access screen, an opened person or role included. A removal and leaving with unsaved changes SHALL ask in the same way.

#### Scenario: The employer opens a person

- **WHEN** the employer opens a person from the people list
- **THEN** the person's fields show with the people list and the switch between the two views still in place, and closing them shows the list as it was

#### Scenario: A manager reads the people list

- **WHEN** a manager opens Access
- **THEN** the list names the owner on its first row and offers nothing to change or remove on that row

<!-- end specs/employee-onboarding/spec.md -->
<!-- file specs/key-access/spec.md utf8 9574 -->
# Spec Delta

## REMOVED Requirements

### Requirement: A person's key level governs every use of that key

**Reason**: A given app is the whole app, so an app's calls no longer check the caller's key level.

**Migration**: *A key level governs what belongs to the key alone* keeps the check for every other use.

### Requirement: The employer sees and sets key levels in Access

**Reason**: A level is no longer set from an app that uses the key.

**Migration**: *The employer sets key levels from the person or the role* replaces it.

### Requirement: Key levels start without taking anything away

**Reason**: Apps no longer need a key level, so none is given for an app's sake.

**Migration**: *Key levels start with nobody holding one* replaces it; a level already held is kept.

### Requirement: Access sets an app's key levels beside the app and shows each gap

**Reason**: Apps and keys are set apart, and no app can lack a key level.

**Migration**: None.

### Requirement: The employer sees and sets direct use in Access

**Reason**: A key has no direct-use choice to set; its level alone decides.

**Migration**: None; a person's or a role's key level is the one thing to set.

### Requirement: A key can be used directly when the employer turns it on

**Reason**: The choice of off, look-ups only, or look-ups and changes is removed.

**Migration**: *A key set up for it can be used directly* replaces it. A choice already saved is ignored.

### Requirement: The level and the choice together decide a direct request

**Reason**: Only the level decides.

**Migration**: *The level decides a direct request* replaces it.

## ADDED Requirements

### Requirement: A key level governs what belongs to the key alone

The server SHALL check the caller's current level for a saved key before any call that belongs to that key alone: an action of the key with no app, and a direct request. Read SHALL permit calls that only look things up. Read & write SHALL also permit calls that change or send things. No level SHALL deny both. A call that belongs to an app SHALL NOT be refused for the caller's key level. The employer SHALL hold every key. A refusal SHALL name the key and the level needed and SHALL reveal no key value. Client state, an existing login and cached descriptions SHALL grant no level, and a lowered level SHALL govern the person's next request.

#### Scenario: A person with Read tries to change something with the key alone

- **WHEN** a person whose Stripe level is Read calls an action of Stripe alone that changes something
- **THEN** the server refuses before any business work and names Stripe and Read & write, while that person's Stripe look-ups still run

#### Scenario: The same key inside an app

- **WHEN** that person holds an app that changes things with Stripe and uses it
- **THEN** the app's change runs, and their level for Stripe is not checked

### Requirement: The employer sets key levels from the person or the role

Access SHALL show the employer each person's and role's level for each key where that person or role is opened, and SHALL say there that a level governs use of the key by itself and that apps need none, whether the app holds each key, and the step left for one it does not hold. A key that can be used directly SHALL say that its level also reaches the service directly. A level SHALL be set only from a person or a role. Giving or taking away an app SHALL change no key level. A manager SHALL see and set the same. Only the employer or a manager SHALL change a level. No screen or response SHALL show a key's value. On a preview the employer SHALL be able to set levels against the practice list, with no effect on the live app's people.

#### Scenario: The employer sets a level

- **WHEN** the employer opens a role, sets Stripe to Read and saves
- **THEN** each holder of the role has Stripe at Read on their next request

#### Scenario: The employer gives an app that uses a key

- **WHEN** the employer gives an app that uses Stripe to a person with no Stripe level and saves
- **THEN** the person holds the app and still has no Stripe level

#### Scenario: An employee tries to change a level

- **WHEN** an ordinary employee calls a level-changing operation
- **THEN** it is denied and no level changes

### Requirement: Key levels start with nobody holding one

On an installation where key levels have not started, they SHALL start at the employer's next open of Access with no person given a level, and every level a person or role already holds SHALL be kept. Once levels have started, level data that can not be read SHALL deny key use and SHALL never fall back to open.

#### Scenario: An older installation updates

- **WHEN** an installation from before key levels updates and the employer opens Access
- **THEN** each person's apps work as before and no person holds a key level until the employer gives one

### Requirement: A key set up for it can be used directly

A saved key whose service is set up for it SHALL be usable directly: a signed-in person's assistant sends one request for that service through the app, and the server adds the key and returns the service's answer. Direct use SHALL need no app grant and no setting beyond the caller's level for the key. Assistant discovery SHALL list a key's direct look-ups and direct changes only to a caller whose level permits them. A key whose service is not set up SHALL offer no direct use.

#### Scenario: A person with a level and no apps

- **WHEN** a person with Notion: Read and no apps sends a direct look-up
- **THEN** the look-up runs and its answer is returned, and every app's actions stay refused for that person

#### Scenario: A person with no level

- **WHEN** a person with no level for Notion sends a direct look-up
- **THEN** the server refuses before any request leaves and names Notion and Read, and discovery lists no direct action for Notion to them

### Requirement: The level decides a direct request

The server SHALL judge every direct request by the caller's current level for the key, on each request and before any request leaves. Read SHALL permit a direct look-up. A direct change SHALL need Read & write. A request SHALL count as a look-up only when it reads by the web's own rules, or is one the key's setup names as a look-up; every other request SHALL count as a change. A refusal SHALL name the key and the level needed and SHALL reveal no key value. Until key levels have started, no direct request SHALL run.

#### Scenario: A person with Read tries a direct change

- **WHEN** a person with Notion: Read sends a direct request that changes a page
- **THEN** the server refuses, names Notion and Read & write, and that person's direct look-ups still run

#### Scenario: A search the service sends as a change

- **WHEN** a key's setup names its search request as a look-up and a person with Read sends that search
- **THEN** it runs as a look-up, and the same kind of request to a path the setup does not name is judged as a change

#### Scenario: A level is taken away during a session

- **WHEN** the employer sets a person's level for a key to None and that person sends their next direct request with the same valid session
- **THEN** that request is refused, with no logout needed

## MODIFIED Requirements

### Requirement: Project code is a key with one level

Project code SHALL be a key offering Read as its only level, settable per person and per role like any key and usable with no app ticked. A person's page and a role's page SHALL offer it as one tick that says the person can install the project, off for a new person. It SHALL count as saved when the installation holds a read-only credential for its one project, or is connected to its own repository in the employer's Cloudflare account. Ticking an app SHALL never give it. Its credential SHALL be usable for reading that one project only, and no action or mini app SHALL be handed it.

While the installation can not hand its project out, every place Project code is given SHALL name the one step left and what it is for: a read-only key where the project is kept on GitHub with none saved, or finishing Access setup where no project is recorded. The employer SHALL get the request to hand their assistant; a manager SHALL read that the step is the employer's. Giving Project code SHALL still save, and SHALL take effect once the project can be handed out.

#### Scenario: The employer gives Project code to a role

- **WHEN** the employer sets Project code to Read on a role two people hold
- **THEN** both people may install the project on their next request, and a person outside the role may not

#### Scenario: The credential is not saved yet

- **WHEN** the employer opens a person on an installation that can not yet hand its project out
- **THEN** Project code shows as not saved with the one step left, and nobody's connection changes

#### Scenario: The employer lets a new person install the project with no key saved

- **WHEN** the employer adds a person on a GitHub installation with no read-only key and ticks that they can install the project
- **THEN** the page says a read-only GitHub key comes first and gives the request to copy, the tick saves, and the person can install the project once the key is saved with no further change in Access

#### Scenario: The project can be handed out

- **WHEN** the employer opens a person on an installation that can hand its project out
- **THEN** the tick shows with no step under it, and ticking it and saving lets that person install the project on their next request

<!-- end specs/key-access/spec.md -->
<!-- file specs/skill-actions/spec.md utf8 1049 -->
# Spec Delta

## REMOVED Requirements

### Requirement: Access works out who can run a skill

**Reason**: Access no longer lists skills; apps and keys are the only things given.

**Migration**: None; *A skill's calls are judged like any other call* keeps how each call is allowed.

## ADDED Requirements

### Requirement: A skill's calls are judged like any other call

Access SHALL store no grant for a skill and SHALL list none. The server SHALL judge each call a skill makes by the caller's own apps and key levels, exactly as it judges the same call from a screen or an assistant. A refused call SHALL say what the caller lacks.

#### Scenario: A person runs a skill that calls an app they hold

- **WHEN** a person who holds Orders runs a skill whose actions all belong to Orders
- **THEN** every call runs, with no skill named anywhere in Access

#### Scenario: A person runs a skill that calls an app they lack

- **WHEN** a person who does not hold Orders runs that skill
- **THEN** its first Orders call is refused before any business work

<!-- end specs/skill-actions/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-08

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 63421 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its Ready section
  asks the chat to build, or to build and publish, by an action's name alone.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-08-apps-and-keys-apart</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:var(--bar, 76px); background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; flex-wrap:wrap; align-items:center; gap:8px 10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready, #ready .row { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
  #ready-says, #ready-confirm span { margin:0; font-size:14px; }
  #ready-says { font-weight:600; }
  @media (max-width:700px) {
    #ready, #ready .row, #ready-says, #ready-confirm span { flex:1 1 100%; }
    #ready button { flex:1; }
  }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:#fff; color:var(--ink); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-08-apps-and-keys-apart">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-08-apps-and-keys-apart</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Access asks you to think about too many things at once. A person has areas, each at a level, and keys, each at a level, and an app only works when both line up, so the page needs warnings, starting points and a list of what a person can't do yet. You want two plain things that don't depend on each other: which apps a person can use, and what they may do with each key.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>An app is a tick, a key is a level, and neither depends on the other.</b> You tick the apps a person can use. Separately, you pick <i>None</i>, <i>Read</i> or <i>Read &amp; write</i> for each key. Areas, and their <i>Look up</i> and <i>Look up &amp; change</i> levels, are gone.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">what decides      │ BEFORE        │ AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">──────────────────┼───────────────┼────────────</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">open Orders       │ area level    │ app tick</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">refund in Orders  │ area + Stripe │ app tick</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">assistant uses    │ Stripe level  │ Stripe level</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">Stripe by itself  │               │</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A ticked app does everything it was built to do.</b> Someone with Orders ticked can open it, look things up and change things, whatever keys Orders uses. An app no longer refuses a person because their level for a key is too low. So on the update, a person with an app ticked may be able to do more in it than before: check each person's apps afterwards.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>A key's level decides only what a person's assistant may do with that key by itself.</b> That means the look-ups in Cloudflare, putting the project on their computer, and using a key directly. The <i>Keys</i> part of a person or role says so in one line.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A person opens to three things: their role, their apps, their keys.</b> <i>Start from</i>, <i>Can reach</i> and <i>Can't yet</i> go, and so do the <code>!</code> gap marks on the People and Roles lists. A role opens to the same two lists. Each key says beside its name whether it is saved, with the step left when it is not. <i>Can install the project</i> and <i>Can manage Access</i> stay where they are. Someone who manages nothing sees their own apps and key levels.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">  BEFORE                       AFTER</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">┌──────────────────────────┐ ┌──────────────────────────┐</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">│ ana@example.com       ✕  │ │ ana@example.com       ✕  │</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">│ Role [Their own set ▾]   │ │ Role [Their own set ▾]   │</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">│ Start from               │ │ Apps                     │</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">│ [Orders] [Refund]        │ │ [x] Orders  [ ] Payroll  │</span>
<span class="ln" data-note="item-4-line-7" tabindex="0">│ Can reach                │ │ Keys                     │</span>
<span class="ln" data-note="item-4-line-8" tabindex="0">│ Orders  (•) Look up      │ │ Stripe · Saved           │</span>
<span class="ln" data-note="item-4-line-9" tabindex="0">│ Stripe  (•) Read         │ │  ( ) None (•) Read       │</span>
<span class="ln" data-note="item-4-line-10" tabindex="0">│ Can't yet                │ │  ( ) Read &amp; write        │</span>
<span class="ln" data-note="item-4-line-11" tabindex="0">│ ! Refund: Stripe R&amp;W     │ │ Maps · Not saved yet     │</span>
<span class="ln" data-note="item-4-line-12" tabindex="0">│ [Save access] [Cancel]   │ │  ( ) None ( ) Read       │</span>
<span class="ln" data-note="item-4-line-13" tabindex="0">└──────────────────────────┘ │ [Save access] [Cancel]   │</span>
<span class="ln" data-note="item-4-line-14" tabindex="0">                             └──────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Access is two lists: People and Roles.</b> The Apps and Keys lists go. You set apps and key levels inside a person or a role, and nowhere else. The lists still say how much each has, such as <i>2 apps, 1 key</i>.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">  BEFORE                       AFTER</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">┌──────────────────────────┐ ┌──────────────────────────┐</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">│ People Roles Apps Keys   │ │ People  Roles            │</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">│           [Add person]   │ │             [Add person] │</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">│ Who       Role  Has      │ │ Who       Role  Has      │</span>
<span class="ln" data-note="item-5-line-6" tabindex="0">│ ana@…     own   2 apps   │ │ ana@…     own   2 apps   │</span>
<span class="ln" data-note="item-5-line-7" tabindex="0">│ ben@…     Sales 1 app    │ │ ben@…     Sales 1 app    │</span>
<span class="ln" data-note="item-5-line-8" tabindex="0">└──────────────────────────┘ └──────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>A key's level alone decides direct use; the separate switch goes.</b> Once a key's service is set up for it, <i>Read</i> lets a person's assistant look things up with the key directly and <i>Read &amp; write</i> lets it change things. There is no Off, Look-ups only or Look-ups and changes to pick, and no place in Access for it. So direct use is on for you on every such key from the update, and for anyone you give a level. To stop it for a person, set their level to <i>None</i>.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-1" tabindex="0">key level    │ direct look-up │ direct change</span>
<span class="ln" data-note="item-6-line-2" tabindex="0">─────────────┼────────────────┼──────────────</span>
<span class="ln" data-note="item-6-line-3" tabindex="0">None         │ no             │ no</span>
<span class="ln" data-note="item-6-line-4" tabindex="0">Read         │ yes            │ no</span>
<span class="ln" data-note="item-6-line-5" tabindex="0">Read &amp; write │ yes            │ yes</span></pre></div></details></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>Anyone who could only look is unticked, and Access tells you who.</b> A tick can't say <i>look but don't change</i>, so a person or role held at <i>Look up</i> loses that app on the update. Nobody gains the power to change things by surprise. Access names each one until your next save there. That old <i>Look up</i> setting can't be brought back after that save; you tick the app again instead.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-7-line-1" tabindex="0">┌──────────────────────────────┐</span>
<span class="ln" data-note="item-7-line-2" tabindex="0">│ People  Roles  Apps  Keys    │</span>
<span class="ln" data-note="item-7-line-3" tabindex="0">│                              │</span>
<span class="ln" data-note="item-7-line-4" tabindex="0">│ ! Unticked in this update    │</span>
<span class="ln" data-note="item-7-line-5" tabindex="0">│ They could only look, and    │</span>
<span class="ln" data-note="item-7-line-6" tabindex="0">│ a tick gives everything:     │</span>
<span class="ln" data-note="item-7-line-7" tabindex="0">│   kim@example.com: Orders    │</span>
<span class="ln" data-note="item-7-line-8" tabindex="0">│   Sales role: Payroll        │</span>
<span class="ln" data-note="item-7-line-9" tabindex="0">│ Tick an app to give it back. │</span>
<span class="ln" data-note="item-7-line-10" tabindex="0">│                              │</span>
<span class="ln" data-note="item-7-line-11" tabindex="0">│ Who          Role   Has      │</span>
<span class="ln" data-note="item-7-line-12" tabindex="0">│ kim@…        own    1 key    │</span>
<span class="ln" data-note="item-7-line-13" tabindex="0">└──────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>Work with no screen sits inside an app or behind a key.</b> Work built only for skills and assistants is no longer something you give by itself. Inside an app, that app's tick covers it. Using a key, that key's level covers it. Work with neither can't be published, and the check names it.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-8-line-1" tabindex="0">work with no screen</span>
<span class="ln" data-note="item-8-line-2" tabindex="0">   │</span>
<span class="ln" data-note="item-8-line-3" tabindex="0">   ├─ inside an app ──▶ the app's tick</span>
<span class="ln" data-note="item-8-line-4" tabindex="0">   ├─ uses a key ─────▶ the key's level</span>
<span class="ln" data-note="item-8-line-5" tabindex="0">   └─ neither ────────▶ can't be published</span></pre></div></details></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>The Skills list leaves Access.</b> Skills run exactly as before, and each call is still allowed or refused by the caller's apps and keys. Access just stops showing who can run each one.</div></div></li>
<li class="item card" id="item-10"><span class="num">10</span><div class="body"><div class="text" data-note="item-10" tabindex="0"><b>Giving an app gives no key level.</b> Until now a new app also gave <i>Read</i> on each key it used. A key level now changes only when you change it.</div></div></li>
</ol>
</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked whether key levels and screens should be different things with areas removed → chose yes, after reading what it costs: no look-only on an app, and no separate home for work with no screen.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked who can use work that has no screen → chose a key or an app guards it, and the checks refuse work with neither.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked what happens to anyone held at Look up on an app → chose untick them and say who.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked how much of a person's page goes → chose, in Matthew's words, &quot;per person we get a dialog where we can give them access to screens or apps and we can set roles&quot;.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked whether Access should still warn when a ticked app needs a key level the person lacks → chose no warnings: &quot;App access should have everything key access is something else. Like they are not related&quot;.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked whether a person with Orders ticked and Stripe at None can refund from Orders → chose yes: the tick gives all of Orders.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked which of Access's five lists stay → chose drop Skills.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: roles and managers stay as they are, because Matthew named roles as part of the person's page and nobody asked to change managers.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: the person still opens in the panel beside the list, not a new centred popup, because that panel is the dialog Access already has and every Access row opens the same way.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: the screens keep the word <i>app</i>, because Home, the Apps list and every other page already call a screen an app, and Matthew used both words.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: an assistant with an app ticked can call every action of that app, changes included, because the tick gives all of the app and a screen's call and an assistant's call are judged alike.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: a key level a person already holds stays as it is, because it still decides what their assistant may do with that key by itself.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: Access does not list the people whose apps can now do more, and the update note says to check, because every person with a ticked app that uses a key would be on that list and nothing was taken from them.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: the unticked notice clears at the next save in Access, because the earlier &quot;everyone kept their access&quot; notice clears the same way and a notice that never leaves stops being read.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: on an install where key levels have not started yet, they start with nobody holding a level, because apps no longer need one and a level given for an app's sake would only widen what an assistant can do.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: the Apps and Keys lists still say which apps use a key, as information only, because it tells the owner what a key is for.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: the source repo's sample no-screen folder and its sample skill are removed, because they exist only to show a no-screen area and the Skills list on a preview.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: this is a major release, because an installed app's folder with no screen and no key stops passing the checks.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-08</p>Check: <code>app/src/apps/access/Skills.test.tsx</code> and <code>app/worker/employee-access/skills.test.ts</code> are deleted with the Skills list they tested; nothing they covered is left to check.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-08</p>Check: <code>app/worker/employee-access/area-levels.test.ts</code> is deleted with area levels; its cases for who holds an app and what a key level refuses now live in <code>key-access.test.ts</code>.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-08</p>Check: <code>app/worker/apps/sample/api.test.ts</code> and <code>app/worker/apps/sample/seed.test.ts</code> are deleted with the source-only sample folder they tested; <code>app/worker/apps/screenless.test.ts</code> covers a folder with no screen.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked, on the first preview, for a cleaner screen → chose only People and Roles as lists, with apps and keys set inside each: &quot;we should only see people and rows here and then when we adjust the people and roles we'll be able to adjust the keys / apps within them&quot;.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked where a key's direct-use choice goes with no Keys list → chose a small Key settings panel, over dropping the switch or keeping the Keys list.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: nothing sets one app or one key for several people at once any more, because a role already does that and Matthew chose to set both inside a person or a role.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: Key settings also shows whether each key is saved and the step left, because the Keys list was the only place that said so.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: Key settings no longer says which apps use a key, because apps and keys are unrelated now and the line invites reading them together.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-08</p>Check: <code>app/src/apps/access/Grants.test.tsx</code> is deleted with the Apps and Keys lists and the one-for-many save it tested. Its cases for a key's saved state, next step and direct-use choice now live in <code>KeySettings.test.tsx</code>; the unticked notice and the rows' links moved to <code>Roles.test.tsx</code>.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: Key settings opens at <code>people/keys</code> or <code>roles/keys</code>, because it opens over whichever list is showing and closing it returns to that list; the old <code>keys</code> and <code>keys/&lt;id&gt;</code> addresses show People like any unknown address.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: a save still names apps as given or not, because the person and role panels already send them that way and decision 13 asks for a plain list only where that is simpler.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked, on the second preview, why Key settings is needed → chose to drop the direct-use switch and the panel, so a key's level alone decides direct use.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: each key's saved state and its step left show beside the key where a person or a role is opened, because no other place in Access lists keys now.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: a choice already saved for a key is ignored, not deleted, because nothing reads it and going back a version finds it as it was.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-08</p>Check: <code>app/src/apps/access/KeySettings.test.tsx</code> is deleted with the Key settings panel. Its cases for a key's saved state, its step when unsaved, the manager's reading of the owner's step and a preview now live in <code>PersonPage.test.tsx</code>, with the role's in <code>Roles.test.tsx</code>; its direct-use choice and its save have nothing left to check, and <code>direct.test.ts</code> holds that a saved choice changes nothing.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: a direct route keeps a mark in its mapping and the policy carries whether key levels have started, because the key-access spec says no direct request runs until they have, the owner's included, and the owner otherwise holds every key from the start.</li>
<li class="decision card" id="decision-35" data-note="decision-35" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: the local check run counts as done with two parts still failing, because both fail only until the save: one script test reads the deleted sample files from git's file list, and the retired-names check reads a spec the archive rewrites. The automatic checks after the save decide.</li>
<li class="decision card" id="decision-36" data-note="decision-36" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: the save and preview walk of task 7.3 are the publish run's own save and walk, because Matthew chose to publish and that run makes one save; the box is closed here and the walk's verdict stands in for it.</li>
<li class="decision card" id="decision-37" data-note="decision-37" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-08</p>Asked, on the third preview, for fewer words on a person's panel → cut the lines under <i>Can install the project</i> and the keys, the <i>new person starts with no apps</i> line, and shortened the manager note.</li>
<li class="decision card" id="decision-38" data-note="decision-38" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Archived for publishing as 39.0.0, with main brought in through 38.2.1; the checkpoint after this entry is the one that merges.</li>
<li class="decision card" id="decision-39" data-note="decision-39" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Brought main in again through 38.3.0 after another release landed first; still numbered 39.0.0. The checkpoint after this entry is the one that merges.</li>
<li class="decision card" id="decision-40" data-note="decision-40" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Brought main in a third time, through 38.4.0, after another release landed first. The checkpoint after this entry is the one that merges.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button>
  <div id="ready" hidden>
    <div class="row" id="ready-choose"><button type="button" data-ready="build">Build it</button><button type="button" data-ready="publish">Build and publish</button></div>
    <div class="row" id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><span>Goes live, can't be undone.</span><button type="button" data-ready="yes">Yes, publish</button><button type="button" data-ready="cancel">Cancel</button></div>
    <p id="ready-says" role="status" hidden></p>
  </div>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    bar();
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d); bar();
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, sending = false;
  function setLive(key) {
    live = key;
    if (!key) $('ready').hidden = true;
    $('copy').textContent = key ? 'Send notes' : 'Copy notes';
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  function sendNotes() {
    const notes = unsent(), n = notes.length;
    if (sending || nothing('sent')) return;
    sending = true;
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      sending = false; setLive(null);
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    ask('send', live, { text: bullets(notes).join('\n') }).then(function (r) {
      if (r.status === 429) { sending = false; toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      r.json().then(function (answer) {
        if (!answer || answer.sent !== true) { closed(); return; }
        sending = false;
        notes.forEach(function (note) { note.sent = true; });
        persist();
        toast('Sent ' + plural(n) + ' to the chat.');
      }, closed);
    }, closed);
  }
  $('copy').addEventListener('click', function () {
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── ready: on a reply link that offers both, the bar's second row asks the chat to build, or to build and publish ──
  // The page sends an action's name and the version of the plan it read; the link's opener fixed each message.
  let version = null, acting = false;
  function says(text) { $('ready-says').textContent = text; $('ready-says').hidden = !text; bar(); }
  function readyStep(step) {
    $('ready-choose').hidden = step !== 'choose';
    $('ready-confirm').hidden = step !== 'confirm';
    bar();
  }
  // One primary button in the bar: the notes button while a note is unsent or no build button shows, else the build one.
  // The page's bottom padding follows the bar's height, so a taller bar never covers the end of the page.
  function bar() {
    const el = $('copy').parentNode, ready = $('ready');
    const build = !ready.hidden && !unsent().length && !($('ready-choose').hidden && $('ready-confirm').hidden);
    $('copy').classList.toggle('primary', !build);
    all('[data-ready="build"], [data-ready="yes"]', function (b) { b.classList.toggle('primary', build); });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  // Unsent notes would change the plan the chat is about to build: say so. True when it spoke.
  function notesFirst() {
    if (!unsent().length) return false;
    says('Send or delete your notes first.');
    return true;
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  function act(name) {
    if (acting || !live || notesFirst()) return;
    acting = true; says('');
    const closed = function () { acting = false; $('ready').hidden = true; bar(); toast('This link has closed. Choose in the chat.'); };
    ask('act', live, { action: name, version: version }).then(function (r) {
      if (r.status === 429) { acting = false; says('Wait a few seconds, then tap again.'); return; }
      r.json().then(function (answer) {
        const a = answer || {};
        const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
          : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
          : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
        if (!line) { closed(); return; }
        acting = false; readyStep('done'); says(line);
      }, closed);
    }, closed);
  }
  $('ready').addEventListener('click', function (e) {
    const step = e.target.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || (step === 'publish' && !notesFirst())) {
      says(''); readyStep(step === 'cancel' ? 'choose' : 'confirm');
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) ask('alive', key).then(function (r) {
    if (!r.ok) return;
    setLive(key);
    r.json().then(offer, function () { /* no actions: notes only */ });
  }, function () { /* not live: the page copies */ });
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
