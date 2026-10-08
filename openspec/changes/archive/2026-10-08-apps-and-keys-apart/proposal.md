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
