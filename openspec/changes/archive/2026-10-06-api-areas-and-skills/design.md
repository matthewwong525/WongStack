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
