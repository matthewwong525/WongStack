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
