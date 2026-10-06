# Skills that work for the whole team, and Access built on what a person can reach

**Status:** in-progress

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
