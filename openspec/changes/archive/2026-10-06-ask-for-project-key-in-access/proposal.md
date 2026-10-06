# Ask for the project key when you share the project

**Status:** ready-to-ship

**Branch:** github-token-setup

**Open questions:** none

## Why

On a project kept in GitHub, the app needs a read-only GitHub key before it can put the project on a teammate's computer. Today setup mentions that key in its last message, when most owners have no teammate yet, and never brings it up again. Later, giving someone the project is hidden under *Keys* as *Project code*, and nothing there says the key is still missing.

## What Changes

- **Setup stops mentioning the key.** Its closing message loses the line *"One step is left before teammates can install the project"*. An update stops listing it as a to-do too. You are asked the first time you let someone install the project, and never if you work alone. A project kept in Cloudflare needs no key and was never asked.
  ```text
    BEFORE                  AFTER
  setup ends              setup ends
    │                       │
    ▼                       ▼
  "one step left:         (nothing)
   a GitHub key"
                          you let Sam
  you let Sam             install the project
  install the project       │ no key yet
    │                       ▼
    ▼                     +"one step first"
  (nothing said)          +the request to copy
  ```
- **A person's page has one tick: *Can install the project*.** It replaces the *None / Read* choice for *Project code* that sat under *Keys no ticked app uses*, and the sentence *Project code is shared separately*. It is off for a new person. A role's page has the same tick, so a whole role can get the project. *Keys* still lists *Project code*, and a tick here is the same choice as *Read* there.
  ```text
    BEFORE                    AFTER
  ┌────────────────────────┐ ┌────────────────────────┐
  │ Add person             │ │ Add person             │
  │ Email [             ]  │ │ Email [             ]  │
  │ Role  [Their own set▾] │ │ Role  [Their own set▾] │
  │                        │ │                        │
  │ Apps                   │ │ Apps                   │
  │ [ ] Hello              │ │ [ ] Hello              │
  │                        │ │                        │
  │ Keys no ticked app uses│ │+Project                │
  │ Project code           │ │+[ ] Can install the    │
  │ (•) None  ( ) Read     │ │+    project            │
  │                        │ │+Puts the project on    │
  │ A new person starts    │ │+their computer, to     │
  │ with no apps. Project  │ │+read and use.          │
  │ code is shared         │ │                        │
  │ separately.            │ │ A new person starts    │
  │                        │ │ with no apps.          │
  │ [Save access] [Cancel] │ │ [Save access] [Cancel] │
  └────────────────────────┘ └────────────────────────┘
  ```
- **Ticking it asks for the key when the app still needs one.** Right under the tick the page says one step comes first, and gives you the words to say to your assistant, with a button to copy the full request. Your assistant then sends the private link with the five GitHub steps. You can save the tick straight away: the person gets the project as soon as the key is in. A manager reads that the step is the owner's, with nothing to copy. *Project code* opened from *Keys* shows the same step.
  ```text
  ┌──────────────────────────────────────┐
  │ Project                              │
  │ [x] Can install the project          │
  │                                      │
  │ +One step first. The app needs a     │
  │ +read-only GitHub key to hand the    │
  │ +project out. Ask your assistant:    │
  │ +"Let teammates install the project" │
  │ +[Copy that request]                 │
  │                                      │
  │ [Save access] [Cancel]               │
  └──────────────────────────────────────┘
  ```
- **The step names what is really missing.** On an older install that has not yet told the app which project it hands out, the page says to finish Access setup, not to make a GitHub key. Once the app can hand the project out, the tick shows with nothing under it.

**Non-goals:** no change to who holds the project at the start (only the owner), to how a device downloads it, to publishing, or to the *Project code* name in *Keys*. Giving the project stays a choice made in Access; the assistant gains no way to give it from chat.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `key-access`: Project code is also given by one tick on a person's and a role's page, and the page where it is given names the step left while the app can not hand the project out.
- `cloudflare-provisioning`: on a GitHub install, setup and the Access step report the read-only key as missing with its steps and no longer raise it as a to-do or a closing line.

## Impact

- `app/worker/employee-access/` — the Access status says why the project can not be handed out yet: a missing key, or no project recorded.
- `app/src/apps/access/` — `SetFields.tsx`, `PersonPage.tsx`, `KeyPage.tsx`, `Notices.tsx`, `status.ts`, `levels.ts` and their tests; `app/src/lib/access.ts` for the new status field.
- `.agents/skills/wong-setup/` — `scripts/provision.mjs` and `references/cloudflare.md`; `scripts/tests/provision.test.mjs`.
- `wiki/stack/employee-project.md`, `wiki/stack/employee-access.md`, `wiki/people/matthew-wong.md`, `CHANGELOG.md` (a `minor` entry).
- No new key, table, route or dependency. Saved access keeps its shape.

## Decision log

- **2026-10-06** — Asked whether setup should keep its closing line about the read-only GitHub key → chose to drop it.
- **2026-10-06** — Asked whether to plan a tick on the person's page, with the key asked for beside it → chose to plan it.
- **2026-10-06** — Assumed: an update stops raising the key as a to-do as well, because the same reasoning holds: an owner with no teammate has no use for it, and Access now asks at the right moment.
- **2026-10-06** — Assumed: the tick is on a role's page too, because a person's and a role's set share one form and a role is how several people get the same access.
- **2026-10-06** — Assumed: *Project code* keeps its name and its row in *Keys*, because renaming a key touches the Connect card, the specs and installs' own notes for no gain to this change.
- **2026-10-06** — Assumed: the tick can be saved before the key arrives, because Access already saves a level for a key that is not saved, and making the owner come back to tick it again is a second trip.
- **2026-10-06** — Assumed: the page tells a missing GitHub key apart from a project not recorded yet, because telling an owner of an older install to make a GitHub key would send them to the wrong step.
- **2026-10-06** — Assumed: the step shows on previews as on the live app, because loading the key gives it to both.
- **2026-10-06** — Assumed: the assistant gets no way to give the project from chat, because Access has no chat action for people today and adding one is a separate change.
- **2026-10-06** — Asked what to do with the finished plan → chose build and publish.
- **2026-10-06** — Assumed: the tick's detail lives on the assistant-connection wiki page and the Access page only links it, because the Access page sits at its 3,000-word cap; six of its existing sentences were shortened to fit one new line.
- **2026-10-06** — Archive checkpoint: built, walked on the preview with verdict SUCCESS, merged with 36.0.1 and numbered 36.1.0. The step under the tick was not shown on the preview, which holds the key; unit tests cover it.
