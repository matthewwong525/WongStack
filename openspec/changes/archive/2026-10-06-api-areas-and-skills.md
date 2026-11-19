<!-- openspec-archive v1 2026-10-06-api-areas-and-skills -->
<!-- file proposal.md utf8 16134 -->
# Skills that work for the whole team, and Access built on what a person can reach

**Status:** ready-to-ship

**Branch:** skills-api-permissions

**Open questions:** none

## Why

Your assistant can build a skill today, but nothing tells it how to build one your team can use. A skill made on your computer can read a key straight from your own files, so it breaks on a teammate's device, which holds no keys. Access also can't answer *who can run this skill?* It only lists things that have a screen. Work built for a skill alone, with no screen, can be given to nobody but you. And an app that uses no key gives lookups and changes together, with no way to allow only looking.

## What Changes

- **A skill does its business work through the app, never with a key.** When you ask for a skill that touches orders, payments or any other business data, the assistant first builds that work into the app, then writes the skill to call it. The skill runs under the login of whoever uses it, so it works on every teammate's device and the app decides what each of them may do. A check stops a skill from being published when it reads a key itself, or names work the app does not have.
  ```text
    BEFORE                  AFTER
  skill ─▶ your key      skill ─▶ the app ─▶ key
     │                      │        │
     ▼                      ▼        ▼
  works only for you     their    allowed?
                         login    else says why
  ```
- **You give a person areas, each at *Look up* or *Look up & change*.** An area is one named group of work in the app, such as Orders. Every app you have today is an area. An area may also have no screen, when it exists only for skills and assistants. Keys keep their own levels, as now. Apps and skills are no longer something you store per person: Access works out which ones a person can use from their areas and keys.
  ```text
  area level       │ look up │ change
  ─────────────────┼─────────┼────────
  None             │ no      │ no
  Look up          │ yes     │ no
  Look up & change │ yes     │ yes
  ```
- **Nobody loses anything on the day this goes live.** Each person and role keeps every app they have, at *Look up & change*, which is what an app tick gives today. You can lower one to *Look up* afterwards. Someone given a new area starts at *Look up*; letting them change things stays your choice.
- **A person's or role's panel has three parts.** *Start from* is a row of your apps and skills: press one and the panel fills in what it needs, marked so you can see what was added. *Can reach* is the list the app enforces, which you can change by hand, and it names what each line opens. *Can't yet* lists each app or skill that is still missing something. Nothing is saved until *Save access*.
  ```text
    BEFORE                    AFTER
  ┌────────────────────────┐ ┌──────────────────────────┐
  │ Sales               ✕  │ │ Sales                 ✕  │
  │                        │ │                          │
  │ Apps                   │ │+Start from               │
  │ [x] Orders             │ │+[Orders] [Refund] [Tips] │
  │     Stripe [Read    ▾] │ │                          │
  │ [ ] Tips               │ │+Can reach                │
  │     uses no keys       │ │ Orders   [Look up     ▾] │
  │                        │ │+  opens Orders app       │
  │ Keys no ticked app     │ │+Customers [Look up    ▾] │
  │ uses                   │ │+  no screen · opens      │
  │ Cloudflare [None    ▾] │ │+  Weekly summary         │
  │                        │ │ Tips      [None       ▾] │
  │                        │ │ Stripe    [Read       ▾] │
  │                        │ │ Cloudflare [None      ▾] │
  │                        │ │                          │
  │                        │ │+Can't yet                │
  │                        │ │+! Refund a customer:     │
  │                        │ │+  Orders Look up & change│
  │                        │ │+  Stripe Read & write    │
  │                        │ │+  [Give what it needs]   │
  │                        │ │                          │
  │ [Save access] Cancel   │ │ [Save access] Cancel     │
  └────────────────────────┘ └──────────────────────────┘
  ```
  After a press on *Refund* in *Start from*, or on *Give what it needs*, the same panel shows the raised lines before you save:
  ```text
  ┌────────────────────────────────────┐
  │ Sales                           ✕  │
  │                                    │
  │ Start from                         │
  │ [Orders] [Refund ✓] [Tips]         │
  │                                    │
  │ Can reach                          │
  │ Orders   [Look up & change ▾] new  │
  │   opens Orders app, Refund a       │
  │   customer                         │
  │ Customers [Look up          ▾]     │
  │ Stripe   [Read & write     ▾] new  │
  │                                    │
  │ Can't yet                          │
  │ Nothing: everything here can run   │
  │                                    │
  │ Not saved yet                      │
  │ [Save access] Cancel               │
  └────────────────────────────────────┘
  ```
- **Access gets a fifth view, Skills.** It lists each skill that does business work, what it needs, and how many people can run it. Opened, a skill names who can run it and, for everyone else, what they are missing. It is a list to read: you give access in a person's or role's panel. A skill also needs the project on the person's device, so *Project code* counts as something it needs.
  ```text
  ┌──────────────────────────────────────────┐
  │ People 5 · Roles 2 · Apps 4 · Skills 2 · │
  │ Keys 3                                   │
  │                                          │
  │ Skill             Needs          Can run │
  │ Refund a customer Orders: change   2 of 5│
  │                   Stripe: change         │
  │ Weekly summary    Customers:       5 of 5│
  │                   look up                │
  │                                          │
  │ Your assistant makes skills.             │
  └──────────────────────────────────────────┘
  ```
  With no such skill yet:
  ```text
  ┌──────────────────────────────────────────┐
  │ People 5 · Roles 2 · Apps 4 · Skills 0 · │
  │ Keys 3                                   │
  │                                          │
  │ No skills do business work yet.          │
  │ Ask your assistant to make one.          │
  └──────────────────────────────────────────┘
  ```
  One skill opened:
  ```text
  ┌────────────────────────────────────┐
  │ Refund a customer               ✕  │
  │ Needs Orders: look up & change,    │
  │ Stripe: Read & write, Project code │
  │                                    │
  │ Can run                            │
  │ You · Sales (Sam, Lee)             │
  │                                    │
  │ Can't yet                          │
  │ ! Office (Kim): Stripe Read & write│
  │ ! Pat: Orders, Project code        │
  │                                    │
  │ Open a person or role to give it.  │
  └────────────────────────────────────┘
  ```
- **The Apps view also lists areas with no screen.** Such a row is marked *No screen* and is given the same way as an app. The People and Roles rows count areas, and a row's *! gap* now counts skills that can't run as well as apps.
  ```text
    BEFORE                 AFTER
  ┌─────────────────────┐ ┌──────────────────────────┐
  │ App     Uses   Have │ │ App       Uses     Have  │
  │ Orders  Stripe  3   │ │ Orders    Stripe    3    │
  │ Tips    no keys 5   │ │ Tips      no keys   5    │
  │                     │ │+Customers no keys   2    │
  │                     │ │+ No screen               │
  └─────────────────────┘ └──────────────────────────┘
  ```

## Non-goals

- Giving or refusing one single action inside an area. *Look up* against *Look up & change* is the split.
- Hiding a skill's text from a person. Everyone who holds Project code still gets every skill's file; the app refuses the work, not the reading.
- Any change to who can sign in, to memory, or to publishing rights.

## Capabilities

### New Capabilities

- `skill-actions`: a skill that does business work declares the company actions it calls and calls them through the shared helper under the user's login; a check refuses a skill that reads a saved key or names an unknown action; Access derives who can run each skill.

### Modified Capabilities

- `employee-onboarding`: a grant becomes an area held at a level, checked by what a call does; an area may have no screen; existing grants keep full reach; the panel's three parts.
- `key-access`: key levels show in the panel's one *Can reach* list, and a gap also names a skill.

## Impact

- Worker: `app/worker/employee-access/` (policy, catalogue, sets, grants, members, roles, start, a new skills catalogue), `app/worker/api/contract.ts` and `discovery.ts`, `app/worker/apps/index.ts`, `app/worker/api/router.ts`; a new migration adding a level to the two app-grant tables; `schema/seed.sql`.
- Screens: `app/src/apps/access/` (panel, a Skills view and panel, Apps list, labels and gaps), `app/src/lib/access.ts`.
- Skills and checks: a declared action list beside each skill that does business work, a new `scripts/check-skill-actions.mjs` run with the code checks, a source-only example skill for previews.
- Docs and rules: `wiki/stack/company-api.md`, `employee-access.md`, `mini-apps.md`, `employee-project.md`, `.agents/rules/code.md`, one `AGENTS.md` rule line.
- Payload release: `CHANGELOG.md` entry, **minor**: nothing an install has stops working. `areas.json` names the new spec.
- Another workspace, *Keys list line fits*, edits `app/src/apps/access/levels.ts`; whichever publishes second brings the other in.

## Decision log

- **2026-10-06** — Asked how a person gets access to a skill → chose worked out from apps and keys, never a tick of its own.
- **2026-10-06** — Asked how much the first change covers → chose the building rule plus Skills in Access, in one release.
- **2026-10-06** — Asked what the base of Access should be, after Matthew said the base should be API access with apps as pre-selects → chose an area, with Look up or Look up & change, over single actions.
- **2026-10-06** — Assumed: the split into parts is not asked again, because Matthew chose one release for the rule and the screens, and areas are what the Skills view is worked out from.
- **2026-10-06** — Assumed: every existing app tick becomes that area at Look up & change, because that is what a tick gives today and the change must take nothing away.
- **2026-10-06** — Assumed: a newly given area starts at Look up, because a new key already starts at Read and changing things is the owner's choice.
- **2026-10-06** — Assumed: pressing a skill in *Start from* fills in everything it needs, changes included, marked as new before the save, because a skill that changes things can't run at all on Look up.
- **2026-10-06** — Assumed: pressing an app in *Start from* gives Look up on its area and Read on its keys, because that is what ticking an app does today.
- **2026-10-06** — Assumed: the Apps view stays a place to give an area, and only Skills is read-only, because the Apps view gives apps today and removing that would take a working screen away.
- **2026-10-06** — Assumed: the Skills view lists only skills that do business work, because the stack's own verbs need nothing from Access and would bury the ones that do.
- **2026-10-06** — Assumed: a skill lists its actions in a small file beside it, because the app must read the list when it is built and a check can then compare it with what the skill calls.
- **2026-10-06** — Assumed: the screens keep the word *app* for an area with a screen and say *No screen* for the rest, because *area* is a new word the owner need not learn to use the list.
- **2026-10-06** — Assumed: a skill counts on a person's row once they hold every area it calls, because marking every skill a person was never given would put a gap on almost every row.
- **2026-10-06** — Assumed: an app held at *Look up* needs only *Read* on its keys, because *Look up* is the owner's own choice and should not show as a gap.
- **2026-10-06** — Assumed: the skill check lets a skill name a key that setup makes or the app itself uses (Cloudflare look-ups, Project code), because the setup skill names those to install them; every other saved key is refused.
- **2026-10-06** — Assumed: the skill check runs on every check, not only with the app's tests, because a branch that adds one skill file changes no app code and would otherwise skip it.
- **2026-10-06** — Check: `app/package.json`'s `test` script now ends with `scripts/check-skill-actions.mjs`, and `.github/scripts/checks.mjs` runs that script as its own part on every run; both add a check and loosen none.
- **2026-10-06** — Assumed: the Connect popup names an area with no screen by its title, sent with the person's setup, because the build showed it by its folder name and such an area has no card to take a title from.
- **2026-10-06** — Assumed: after the latest main was brought in, Project code stays one tick, *Can install the project*, in its own group under *Can reach*, and is no level line there, because main now promises that tick; a skill's press still marks it new.
- **2026-10-06** — Saved after the build: sections 1 to 5 done and the local checks passed; the automatic checks and the preview walk of section 6 are next.
- **2026-10-06** — Assumed: the Skills list says how much a skill needs, such as *1 app, 2 keys*, and the opened skill names each, because the preview cut the full line short with "…" and Access lists keep every row to one whole line.
- **2026-10-06** — Walked the preview for the last task: a role given the sample skill in one press showed the raised line as *new* and could run it after the save; lowered to Look up, the skill listed the role as unable to run with what it lacked; the sample area showed *No screen* in Apps and no card on Home. The refusal of a changing call as another person can't be shown on a preview, where the checker is the owner; `area-levels.test.ts` covers it.
- **2026-10-06** — Archived for publishing as 36.4.0, with main brought in through #320; the checkpoint after this entry is the one that merges.
- **2026-10-06** — Renumbered to 37.1.0 after another release took 36.4.0, with main brought in through 37.0.1; its tests now pass main's type check of test files.

<!-- end proposal.md -->
<!-- file design.md utf8 9503 -->
# Design

## Context

See [proposal.md](proposal.md) for why. What the code does today, checked on 2026-10-06:

- **The things a person can be given are the built screens.** `app/worker/employee-access/catalogue.ts` globs `src/apps/*/app.json`, and `currentPolicy()` drops a grant for a name outside it. A worker folder with no screen, or a main route mapped to an unbuilt name, is reachable by the owner alone.
- **A level exists only for a key.** `needFor()` in `app/worker/api/contract.ts` already says what a call does (`read` or `write`), but `refusal()` in `policy.ts` applies it to listed keys only. A route that lists no key is all or nothing.
- **A grant is a row with no level**: `wong_access_grants (installation_id, email, app_id, revision)` and `wong_access_role_apps`.
- **Skills are files in the project.** They reach a device only through [Project code](../../../wiki/stack/employee-project.md#who-gets-what), whole. Nothing connects a skill to the actions it calls, and no doc tells the assistant to build one on actions.

## Goals / Non-Goals

**Goals:**

- One stored base: an area held at a level, plus the key levels that exist. Apps and skills are derived from it, on the server for enforcement and on the screen for display, from the same lists.
- A migration that changes nobody's reach.
- Skill rules a script enforces, not prose alone.

**Non-Goals:**

- A grant per action, and a grant per skill.
- Filtering which skill files a device downloads.
- A level for a main route mapped to several areas beyond "each at the level the call needs".
- New fields in action discovery. Discovery already hides an action the caller's policy refuses, so the area level applies there with no new output.

## Decisions

1. **An area is the id that already exists.** The catalogue becomes the union of screen folders (`src/apps/*/app.json`) and server folders (`worker/apps/*/api.ts`). Stored `app_id` values, route mappings (`{ apps: [...] }`) and the mini-app slug stay as they are, so no data is renamed. *Alternative:* a separate area registry file. Rejected: a second list to keep in step with the folders, which the catalogue comment already forbids.
2. **A server-only area names itself.** Its `api.ts` exports `title` and `description`; a test fails for a worker folder with neither a screen nor both exports. Home lists screens only, as now. A main route may map only to a catalogued area: a test fails on any other name, where today it silently denies everyone.
3. **The level is a column, defaulting to full reach.** A new migration adds `level TEXT NOT NULL DEFAULT 'write' CHECK (level IN ('read','write'))` to `wong_access_grants` and `wong_access_role_apps`. Existing rows therefore hold `write`, which is what a tick gives today. There is no "levels have started" switch for areas, unlike keys: the default is already the old behavior. *Alternative:* a start step at the owner's next open, as key levels did. Rejected: it adds a state in which the screen shows a level the server ignores.
4. **One rule decides what a call needs, for areas and keys.** `refusal()` requires every mapped area at `needFor(route, method)`, then the keys, as now. A page visit and a home card need `read`. The owner and the verification token hold every area at `write`. A refusal names the area and the level in words, as a key refusal does. The first-open import records each person with every built area at `write`.
5. **A save sends a level per area.** `AccessSet.apps` becomes a record of area id to level on both sides; the set, role and grant endpoints take a level or none where they took a tick. The client and Worker deploy together, so the old shape is not kept. A person given an area in the Apps view starts at `read`.
6. **A skill declares its work in `actions.json` beside `SKILL.md`**: `{ "title": "...", "actions": ["orders.lookup", "stripe.refund"] }`. The Worker globs these at build, as it globs `app.json`, and resolves each id against the registered actions to get what the skill needs: per area the highest level any listed action needs, per key the same, and Project code always. The Access status response carries `areas` and `skills`; the screen derives *can run* and each gap from a set, with the function that already derives app gaps. *Alternative:* frontmatter in `SKILL.md`. Rejected: it needs a YAML parser in the Worker build and a field the skill hosts don't define. *Alternative:* infer the list by scanning the skill's text. Rejected as the source of truth, since a script may build an id at run time, but used as a check (7).
7. **Two checks, each where it can see the facts.**
   - `scripts/check-skill-actions.mjs`, static, in the code checks: fails when a file in a skill folder names a secret of a registered key (the same registry parse `check-app-keys.mjs` uses), or calls a literal company action id through the helper that its `actions.json` does not list. `memory.*` ids are exempt: they are not company actions. It runs when app code or a skill folder changed, by the path filter the code checks already use.
   - A test in the app suite: fails when an `actions.json` names an id no route registers, or lacks a title. Only the app build knows the registered ids.
8. **The rule has one owner page.** [Company actions](../../../wiki/stack/company-api.md) gains *Build a skill on actions*: build or reuse the action, list it in `actions.json`, call it through the helper, never read a business key. `AGENTS.md`'s company-actions line and `.agents/rules/code.md`'s *Where things go* each gain a link to it, not a copy.
9. **Previews get something to show.** The source repo adds two source-only pieces, listed in no payload file: a server-only area `sample` with one `read` and one `write` action returning made-up data, and a hidden skill `sample-report` whose `actions.json` lists them and `hello.greeting`. `schema/seed.sql` gives the practice people differing levels, so a preview shows a skill that can run, one gap by area, and one by key. Installs receive neither piece; their Skills view opens on its empty state.

## UX

### Use-case brief

The owner or a manager decides who can do what a few times a month, at a desk or on a phone, when someone joins or a new skill or app arrives. The job is "let Sales run the refund skill" or "let Kim look at customers but not change them". Done means one save, and a panel that shows what the person can now run and what they still can't. The common case is pressing one app or skill in *Start from* and saving; setting a level by hand is the edge case and costs one more press. Assumed: tens of people, under twenty areas, a handful of skills. The closest existing screen is the person's panel in Access, which this restructures; the Skills view mirrors the Keys view.

### Flow

Give a skill: People or Roles → open a row → press the skill in *Start from* → read the lines marked *new* → *Save access*. Lower a level: open a row → change the level in *Can reach* → *Save access*. Find out who can run a skill: Skills → open the skill.

### Hierarchy

Panel: *Save access* is the one primary action; *Start from* presses and *Give what it needs* are secondary and save nothing. Skills view and a skill's panel: no primary action, since they are read; one line says where to give access. A gap is marked `!` and words, never colour alone.

### Review

[Review page](review.html). The fourth item sketches the panel before and after and its filled state; the fifth the Skills view, its empty state and one skill opened; the sixth the Apps list before and after. Each fits phone width.

### Components

Existing: the view heading, `Table`, the side panel, `LevelChoice`, `Group`, `Notices`, `Labels`. Changed: `SetFields` becomes the three parts; `levels.ts` works on a level per area and counts skill gaps. New: a *Start from* row of toggle chips, a Skills list and a skill panel. Loading and failed reads keep the existing states.

## Risks / Trade-offs

- A bare `POST` that only reads now needs *Look up & change* → the existing advice holds: describe it as an action with `effect: "read"`; the update note says so.
- A person at *Look up* opens an app whose buttons then fail → the refusal names the area and level, and the panel's *Can't yet* shows it before anyone hits it. Hiding buttons per level is left to each app.
- A custom install has a worker folder with no screen and no title → the new test names the folder; the update note makes adding a title a step.
- Globbing `.agents/skills/*/actions.json` from the app build reaches outside `app/` → if the Cloudflare build refuses it, a prebuild step writes the same list into a generated module; the status response does not change.
- Two levels for one job, area and key, can confuse → *Start from* sets both at once, and each *Can't yet* line names exactly what is missing.
- A skill's `actions.json` drifts from what the skill calls → the static check catches a literal call that is not listed; an id built at run time is caught only by review.
- Skill and rule text adds to the measured context → the rule lives in the wiki page, and `AGENTS.md` gains a link, not a sentence.

## Migration Plan

The migration is additive and its default keeps every grant at full reach, so deploy order does not matter and nobody is refused something they had. Rollback is a redeploy of the previous Worker: it ignores the new column. A level lowered before a rollback reads as full reach again, which the rollback note must say.

<!-- end design.md -->
<!-- file tasks.md utf8 6445 -->
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

<!-- end tasks.md -->
<!-- file specs/employee-onboarding/spec.md utf8 3691 -->
# Spec Delta

## ADDED Requirements

### Requirement: An area is held at a level

Each app a person or role is given SHALL be an area held at one of two levels: Look up, which permits calls that only read, and Look up & change, which also permits calls that change or send things. The server SHALL check the caller's current level for every area a call belongs to before business work, for an app screen's calls, direct API calls, and assistant discovery and calls alike, in addition to key levels and any stricter action or record check. Opening an app's screen SHALL need Look up. A refusal SHALL name the area and the level needed. The employer SHALL hold every area at Look up & change. A newly given area SHALL start at Look up.

#### Scenario: A person at Look up tries to change something

- **WHEN** a person who holds Orders at Look up calls an Orders action that changes an order
- **THEN** the server refuses before any business work and names Orders and Look up & change, while that person's Orders look-ups still run

#### Scenario: A level is lowered during a session

- **WHEN** the employer lowers a person's area to Look up and that person sends a changing request with the same valid session
- **THEN** the request is refused with no logout needed

### Requirement: An area may have no screen

A group of company actions with no screen SHALL be an area the employer can give and take away like an app. Access SHALL list it, marked as having no screen, and the home page SHALL show no card for it. A business route that belongs to no listed area SHALL fail the checks that gate publishing, not silently deny everyone.

#### Scenario: Work built for a skill alone

- **WHEN** the employer gives a person an area that has actions and no screen
- **THEN** that person's assistant can discover and call its actions at the level given, and their home page shows no new card

### Requirement: Area levels arrive without taking anything away

When an installation updates to area levels, every person and role SHALL hold each app they had at Look up & change, and nobody SHALL be refused a call they could make before the update. People recorded at the employer's first Access visit SHALL likewise hold every built area at Look up & change.

#### Scenario: An existing team updates

- **WHEN** an installation whose people hold apps takes the update
- **THEN** each person's apps, screens and changing calls work as before, and Access shows each of those areas at Look up & change

### Requirement: A panel starts from an app or skill and shows what is enforced

Where a person's own set or a role is opened, Access SHALL offer each app and skill as a starting point that fills in what it needs without saving, SHALL show the areas and key levels the server enforces as one editable list that names what each opens, and SHALL list each app or skill the set cannot fully use with what is missing. Choosing an app SHALL fill its area at Look up and its keys at Read; choosing a skill SHALL fill every level it needs. A level a starting point raised SHALL be marked until the save, and nothing SHALL change for the person before the employer saves.

#### Scenario: The employer gives a skill in one press

- **WHEN** the employer opens a role, chooses a skill that changes things in Orders with Stripe, and saves
- **THEN** before the save the panel marks Orders at Look up & change and Stripe at Read & write as raised, and after it the role's holders can run the skill

#### Scenario: The employer leaves without saving

- **WHEN** the employer chooses a starting point and closes the panel without saving
- **THEN** Access asks before leaving, and the person's access is unchanged

<!-- end specs/employee-onboarding/spec.md -->
<!-- file specs/key-access/spec.md utf8 1503 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Access sets an app's key levels beside the app and shows each gap

Where a person or a role is opened, Access SHALL show every area and every key in one list with its level, Project code apart as its one tick, so the employer gives an app and sets its keys' levels in one place. A key SHALL be one level however many of the set's apps and skills use it. A key nothing of the set uses SHALL still be settable in the same place. The People and Roles lists SHALL say how many apps and keys each person and role has, and SHALL say on the row when a held level is below what one of their apps or a skill needs; the opened person or role SHALL name each area and each key with its level in words, and each such gap with the app or skill it stops. A level or a gap SHALL never be marked by colour alone.

#### Scenario: The employer gives an app and lets it change things

- **WHEN** the employer gives a person an app that changes things with Stripe, picks Read & write for Stripe in the same list and saves
- **THEN** the person has the app and Stripe: Read & write, and every other app and skill of theirs that uses Stripe is judged by that one level

#### Scenario: A person's app can't do its job yet

- **WHEN** a person has an app that changes things with Stripe and holds Stripe: Read
- **THEN** the People list marks that person's row as having a gap without the employer opening them, and opening them says that app can look up but not change

<!-- end specs/key-access/spec.md -->
<!-- file specs/skill-actions/spec.md utf8 2507 -->
# Spec Delta

## Purpose

Skill actions make a skill usable by every teammate: a skill does business work through company actions under its user's own login, and Access shows who can run each skill and what anyone else is missing.

## ADDED Requirements

### Requirement: A skill does business work through company actions

A skill that reads or changes business data SHALL do so by calling company actions under the login of the person running it, and SHALL declare the actions it calls. A skill SHALL NOT read a saved business-service key. The checks that gate publishing SHALL fail when a skill reads such a key, calls a company action it does not declare, or declares an action the app does not have, and SHALL name the skill. The guidance an assistant follows when asked for a skill SHALL say to build or reuse the action first.

#### Scenario: A teammate runs a skill the owner built

- **WHEN** a teammate who holds what a skill needs runs it on their own device, which holds no business key
- **THEN** the skill's work runs through the app under the teammate's login and returns the same result it does for the owner

#### Scenario: A skill reads a key itself

- **WHEN** a change adds a skill whose files name a saved business-service key's secret
- **THEN** the checks fail and name the skill, before the change can publish

### Requirement: Access works out who can run a skill

Access SHALL list each skill that declares company actions with what it needs: each area and key at the level its actions need, and Project code. A person or role SHALL count as able to run a skill only when their current areas and key levels cover all of it. Access SHALL store no grant for a skill, and the server SHALL judge each call of a skill by the caller's areas and key levels alone. For each person or role that cannot run a skill, Access SHALL name what is missing. An installation with no such skill SHALL say so and say how to get one.

#### Scenario: A person lacks one thing a skill needs

- **WHEN** a skill changes things with Stripe and a person holds its area at Look up & change, Project code, and Stripe at Read
- **THEN** Access shows that person as unable to run the skill and names Stripe: Read & write as what is missing

#### Scenario: A person's level is lowered

- **WHEN** the employer lowers an area a skill needs from Look up & change to Look up for a role and saves
- **THEN** the skill shows as one the role's holders cannot run, and their next call of its changing action is refused

<!-- end specs/skill-actions/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-06

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 55144 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-06-api-areas-and-skills</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
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
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-06-api-areas-and-skills">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-06-api-areas-and-skills</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Your assistant can build a skill today, but nothing tells it how to build one your team can use. A skill made on your computer can read a key straight from your own files, so it breaks on a teammate's device, which holds no keys. Access also can't answer <i>who can run this skill?</i> It only lists things that have a screen. Work built for a skill alone, with no screen, can be given to nobody but you. And an app that uses no key gives lookups and changes together, with no way to allow only looking.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A skill does its business work through the app, never with a key.</b> When you ask for a skill that touches orders, payments or any other business data, the assistant first builds that work into the app, then writes the skill to call it. The skill runs under the login of whoever uses it, so it works on every teammate's device and the app decides what each of them may do. A check stops a skill from being published when it reads a key itself, or names work the app does not have.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">  BEFORE                  AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">skill ─▶ your key      skill ─▶ the app ─▶ key</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">   │                      │        │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">   ▼                      ▼        ▼</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">works only for you     their    allowed?</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">                       login    else says why</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>You give a person areas, each at <i>Look up</i> or <i>Look up &amp; change</i>.</b> An area is one named group of work in the app, such as Orders. Every app you have today is an area. An area may also have no screen, when it exists only for skills and assistants. Keys keep their own levels, as now. Apps and skills are no longer something you store per person: Access works out which ones a person can use from their areas and keys.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">area level       │ look up │ change</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">─────────────────┼─────────┼────────</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">None             │ no      │ no</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">Look up          │ yes     │ no</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">Look up &amp; change │ yes     │ yes</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Nobody loses anything on the day this goes live.</b> Each person and role keeps every app they have, at <i>Look up &amp; change</i>, which is what an app tick gives today. You can lower one to <i>Look up</i> afterwards. Someone given a new area starts at <i>Look up</i>; letting them change things stays your choice.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A person's or role's panel has three parts.</b> <i>Start from</i> is a row of your apps and skills: press one and the panel fills in what it needs, marked so you can see what was added. <i>Can reach</i> is the list the app enforces, which you can change by hand, and it names what each line opens. <i>Can't yet</i> lists each app or skill that is still missing something. Nothing is saved until <i>Save access</i>. After a press on <i>Refund</i> in <i>Start from</i>, or on <i>Give what it needs</i>, the same panel shows the raised lines before you save:</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">  BEFORE                    AFTER</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">┌────────────────────────┐ ┌──────────────────────────┐</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">│ Sales               ✕  │ │ Sales                 ✕  │</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">│                        │ │                          │</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">│ Apps                   │ │+Start from               │</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">│ [x] Orders             │ │+[Orders] [Refund] [Tips] │</span>
<span class="ln" data-note="item-4-line-7" tabindex="0">│     Stripe [Read    ▾] │ │                          │</span>
<span class="ln" data-note="item-4-line-8" tabindex="0">│ [ ] Tips               │ │+Can reach                │</span>
<span class="ln" data-note="item-4-line-9" tabindex="0">│     uses no keys       │ │ Orders   [Look up     ▾] │</span>
<span class="ln" data-note="item-4-line-10" tabindex="0">│                        │ │+  opens Orders app       │</span>
<span class="ln" data-note="item-4-line-11" tabindex="0">│ Keys no ticked app     │ │+Customers [Look up    ▾] │</span>
<span class="ln" data-note="item-4-line-12" tabindex="0">│ uses                   │ │+  no screen · opens      │</span>
<span class="ln" data-note="item-4-line-13" tabindex="0">│ Cloudflare [None    ▾] │ │+  Weekly summary         │</span>
<span class="ln" data-note="item-4-line-14" tabindex="0">│                        │ │ Tips      [None       ▾] │</span>
<span class="ln" data-note="item-4-line-15" tabindex="0">│                        │ │ Stripe    [Read       ▾] │</span>
<span class="ln" data-note="item-4-line-16" tabindex="0">│                        │ │ Cloudflare [None      ▾] │</span>
<span class="ln" data-note="item-4-line-17" tabindex="0">│                        │ │                          │</span>
<span class="ln" data-note="item-4-line-18" tabindex="0">│                        │ │+Can't yet                │</span>
<span class="ln" data-note="item-4-line-19" tabindex="0">│                        │ │+! Refund a customer:     │</span>
<span class="ln" data-note="item-4-line-20" tabindex="0">│                        │ │+  Orders Look up &amp; change│</span>
<span class="ln" data-note="item-4-line-21" tabindex="0">│                        │ │+  Stripe Read &amp; write    │</span>
<span class="ln" data-note="item-4-line-22" tabindex="0">│                        │ │+  [Give what it needs]   │</span>
<span class="ln" data-note="item-4-line-23" tabindex="0">│                        │ │                          │</span>
<span class="ln" data-note="item-4-line-24" tabindex="0">│ [Save access] Cancel   │ │ [Save access] Cancel     │</span>
<span class="ln" data-note="item-4-line-25" tabindex="0">└────────────────────────┘ └──────────────────────────┘</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-26" tabindex="0">┌────────────────────────────────────┐</span>
<span class="ln" data-note="item-4-line-27" tabindex="0">│ Sales                           ✕  │</span>
<span class="ln" data-note="item-4-line-28" tabindex="0">│                                    │</span>
<span class="ln" data-note="item-4-line-29" tabindex="0">│ Start from                         │</span>
<span class="ln" data-note="item-4-line-30" tabindex="0">│ [Orders] [Refund ✓] [Tips]         │</span>
<span class="ln" data-note="item-4-line-31" tabindex="0">│                                    │</span>
<span class="ln" data-note="item-4-line-32" tabindex="0">│ Can reach                          │</span>
<span class="ln" data-note="item-4-line-33" tabindex="0">│ Orders   [Look up &amp; change ▾] new  │</span>
<span class="ln" data-note="item-4-line-34" tabindex="0">│   opens Orders app, Refund a       │</span>
<span class="ln" data-note="item-4-line-35" tabindex="0">│   customer                         │</span>
<span class="ln" data-note="item-4-line-36" tabindex="0">│ Customers [Look up          ▾]     │</span>
<span class="ln" data-note="item-4-line-37" tabindex="0">│ Stripe   [Read &amp; write     ▾] new  │</span>
<span class="ln" data-note="item-4-line-38" tabindex="0">│                                    │</span>
<span class="ln" data-note="item-4-line-39" tabindex="0">│ Can't yet                          │</span>
<span class="ln" data-note="item-4-line-40" tabindex="0">│ Nothing: everything here can run   │</span>
<span class="ln" data-note="item-4-line-41" tabindex="0">│                                    │</span>
<span class="ln" data-note="item-4-line-42" tabindex="0">│ Not saved yet                      │</span>
<span class="ln" data-note="item-4-line-43" tabindex="0">│ [Save access] Cancel               │</span>
<span class="ln" data-note="item-4-line-44" tabindex="0">└────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Access gets a fifth view, Skills.</b> It lists each skill that does business work, what it needs, and how many people can run it. Opened, a skill names who can run it and, for everyone else, what they are missing. It is a list to read: you give access in a person's or role's panel. A skill also needs the project on the person's device, so <i>Project code</i> counts as something it needs. With no such skill yet: One skill opened:</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">┌──────────────────────────────────────────┐</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">│ People 5 · Roles 2 · Apps 4 · Skills 2 · │</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">│ Keys 3                                   │</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">│                                          │</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">│ Skill             Needs          Can run │</span>
<span class="ln" data-note="item-5-line-6" tabindex="0">│ Refund a customer Orders: change   2 of 5│</span>
<span class="ln" data-note="item-5-line-7" tabindex="0">│                   Stripe: change         │</span>
<span class="ln" data-note="item-5-line-8" tabindex="0">│ Weekly summary    Customers:       5 of 5│</span>
<span class="ln" data-note="item-5-line-9" tabindex="0">│                   look up                │</span>
<span class="ln" data-note="item-5-line-10" tabindex="0">│                                          │</span>
<span class="ln" data-note="item-5-line-11" tabindex="0">│ Your assistant makes skills.             │</span>
<span class="ln" data-note="item-5-line-12" tabindex="0">└──────────────────────────────────────────┘</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-13" tabindex="0">┌──────────────────────────────────────────┐</span>
<span class="ln" data-note="item-5-line-14" tabindex="0">│ People 5 · Roles 2 · Apps 4 · Skills 0 · │</span>
<span class="ln" data-note="item-5-line-15" tabindex="0">│ Keys 3                                   │</span>
<span class="ln" data-note="item-5-line-16" tabindex="0">│                                          │</span>
<span class="ln" data-note="item-5-line-17" tabindex="0">│ No skills do business work yet.          │</span>
<span class="ln" data-note="item-5-line-18" tabindex="0">│ Ask your assistant to make one.          │</span>
<span class="ln" data-note="item-5-line-19" tabindex="0">└──────────────────────────────────────────┘</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-20" tabindex="0">┌────────────────────────────────────┐</span>
<span class="ln" data-note="item-5-line-21" tabindex="0">│ Refund a customer               ✕  │</span>
<span class="ln" data-note="item-5-line-22" tabindex="0">│ Needs Orders: look up &amp; change,    │</span>
<span class="ln" data-note="item-5-line-23" tabindex="0">│ Stripe: Read &amp; write, Project code │</span>
<span class="ln" data-note="item-5-line-24" tabindex="0">│                                    │</span>
<span class="ln" data-note="item-5-line-25" tabindex="0">│ Can run                            │</span>
<span class="ln" data-note="item-5-line-26" tabindex="0">│ You · Sales (Sam, Lee)             │</span>
<span class="ln" data-note="item-5-line-27" tabindex="0">│                                    │</span>
<span class="ln" data-note="item-5-line-28" tabindex="0">│ Can't yet                          │</span>
<span class="ln" data-note="item-5-line-29" tabindex="0">│ ! Office (Kim): Stripe Read &amp; write│</span>
<span class="ln" data-note="item-5-line-30" tabindex="0">│ ! Pat: Orders, Project code        │</span>
<span class="ln" data-note="item-5-line-31" tabindex="0">│                                    │</span>
<span class="ln" data-note="item-5-line-32" tabindex="0">│ Open a person or role to give it.  │</span>
<span class="ln" data-note="item-5-line-33" tabindex="0">└────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>The Apps view also lists areas with no screen.</b> Such a row is marked <i>No screen</i> and is given the same way as an app. The People and Roles rows count areas, and a row's <i>! gap</i> now counts skills that can't run as well as apps.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-1" tabindex="0">  BEFORE                 AFTER</span>
<span class="ln" data-note="item-6-line-2" tabindex="0">┌─────────────────────┐ ┌──────────────────────────┐</span>
<span class="ln" data-note="item-6-line-3" tabindex="0">│ App     Uses   Have │ │ App       Uses     Have  │</span>
<span class="ln" data-note="item-6-line-4" tabindex="0">│ Orders  Stripe  3   │ │ Orders    Stripe    3    │</span>
<span class="ln" data-note="item-6-line-5" tabindex="0">│ Tips    no keys 5   │ │ Tips      no keys   5    │</span>
<span class="ln" data-note="item-6-line-6" tabindex="0">│                     │ │+Customers no keys   2    │</span>
<span class="ln" data-note="item-6-line-7" tabindex="0">│                     │ │+ No screen               │</span>
<span class="ln" data-note="item-6-line-8" tabindex="0">└─────────────────────┘ └──────────────────────────┘</span></pre></div></details></li>
</ol>
</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked how a person gets access to a skill → chose worked out from apps and keys, never a tick of its own.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked how much the first change covers → chose the building rule plus Skills in Access, in one release.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked what the base of Access should be, after Matthew said the base should be API access with apps as pre-selects → chose an area, with Look up or Look up &amp; change, over single actions.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the split into parts is not asked again, because Matthew chose one release for the rule and the screens, and areas are what the Skills view is worked out from.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: every existing app tick becomes that area at Look up &amp; change, because that is what a tick gives today and the change must take nothing away.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: a newly given area starts at Look up, because a new key already starts at Read and changing things is the owner's choice.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: pressing a skill in <i>Start from</i> fills in everything it needs, changes included, marked as new before the save, because a skill that changes things can't run at all on Look up.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: pressing an app in <i>Start from</i> gives Look up on its area and Read on its keys, because that is what ticking an app does today.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the Apps view stays a place to give an area, and only Skills is read-only, because the Apps view gives apps today and removing that would take a working screen away.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the Skills view lists only skills that do business work, because the stack's own verbs need nothing from Access and would bury the ones that do.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: a skill lists its actions in a small file beside it, because the app must read the list when it is built and a check can then compare it with what the skill calls.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the screens keep the word <i>app</i> for an area with a screen and say <i>No screen</i> for the rest, because <i>area</i> is a new word the owner need not learn to use the list.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: a skill counts on a person's row once they hold every area it calls, because marking every skill a person was never given would put a gap on almost every row.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: an app held at <i>Look up</i> needs only <i>Read</i> on its keys, because <i>Look up</i> is the owner's own choice and should not show as a gap.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the skill check lets a skill name a key that setup makes or the app itself uses (Cloudflare look-ups, Project code), because the setup skill names those to install them; every other saved key is refused.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the skill check runs on every check, not only with the app's tests, because a branch that adds one skill file changes no app code and would otherwise skip it.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-06</p>Check: <code>app/package.json</code>'s <code>test</code> script now ends with <code>scripts/check-skill-actions.mjs</code>, and <code>.github/scripts/checks.mjs</code> runs that script as its own part on every run; both add a check and loosen none.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the Connect popup names an area with no screen by its title, sent with the person's setup, because the build showed it by its folder name and such an area has no card to take a title from.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: after the latest main was brought in, Project code stays one tick, <i>Can install the project</i>, in its own group under <i>Can reach</i>, and is no level line there, because main now promises that tick; a skill's press still marks it new.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Saved after the build: sections 1 to 5 done and the local checks passed; the automatic checks and the preview walk of section 6 are next.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the Skills list says how much a skill needs, such as <i>1 app, 2 keys</i>, and the opened skill names each, because the preview cut the full line short with &quot;…&quot; and Access lists keep every row to one whole line.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Walked the preview for the last task: a role given the sample skill in one press showed the raised line as <i>new</i> and could run it after the save; lowered to Look up, the skill listed the role as unable to run with what it lacked; the sample area showed <i>No screen</i> in Apps and no card on Home. The refusal of a changing call as another person can't be shown on a preview, where the checker is the owner; <code>area-levels.test.ts</code> covers it.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Archived for publishing as 36.4.0, with main brought in through #320; the checkpoint after this entry is the one that merges.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Renumbered to 37.1.0 after another release took 36.4.0, with main brought in through 37.0.1; its tests now pass main's type check of test files.</li>
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
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
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
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
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
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
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
    fit(d);
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
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
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
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
