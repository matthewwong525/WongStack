# Read or Read & write for each saved key, roles, and a clearer Access

**Status:** in-progress

**Branch:** granular-token-scoping

**Open questions:** none

## Why

Access lets you choose who can sign in and which apps each person gets. It can't yet say what a person may do with the keys your app holds, such as Stripe or Cloudflare. Anyone with an app gets everything that app's keys can do, and nothing shows which app uses which key. You also can't let someone look things up in Cloudflare without handing over your main token. And every person is set up by hand, one tick at a time.

## What Changes

- **Each saved key gets a level per person: None, Read, or Read & write.** Read lets a person, and their assistant, look things up with that key. Read & write also lets them change things or send things. A level is set once per key and holds in every app. Lowering a level takes effect on their next request.
  ```text
  level        │ look up │ change
  ─────────────┼─────────┼────────
  None         │ no      │ no
  Read         │ yes     │ no
  Read & write │ yes     │ yes
  ```
- **The sign-in wall stays as it is; the app decides the rest.** Cloudflare's own documentation settles it: its sign-in wall decides who gets in, by address. It has no setting for read against write, and it knows nothing about your keys. So it keeps doing the one job it does well, and passes the app a signed proof of who the person is. The app then checks that person's apps and key levels on every request. A refused request says which key and which level it needed.
  ```text
   Cloudflare        the app
   sign-in wall
  ┌───────────┐   ┌──────────────────────┐
  │ who gets  │──▶│ has the app?         │
  │ in        │   │ key level enough?    │
  └───────────┘   └──────────────────────┘
                     │ yes       │ no
                     ▼           ▼
                   runs       refused,
                              says why
  ```
- **Access gets four views: People, Roles, Apps, and Keys.** People opens first, as today. Each person's line also shows their role and key levels.
  ```text
    BEFORE                       AFTER
  ┌─────────────────────────┐  ┌─────────────────────────┐
  │ Access                  │  │ Access                  │
  │                         │  │ +People Roles Apps Keys │
  │ [Add person]            │  │                         │
  │                         │  │ [Add person]            │
  │ sam@shop.com            │  │                         │
  │ 2 apps · Can sign in    │  │ sam@shop.com            │
  │ [Edit] [Remove]         │  │ +Sales · Can sign in    │
  │                         │  │ 2 apps +· Stripe: Read  │
  │                         │  │ [Edit] [Remove]         │
  │                         │  │                         │
  └─────────────────────────┘  └─────────────────────────┘
  ```
- **A role gives several people the same access.** A role is a named set of apps and key levels, such as *Sales*. A person has one role, or their own set, never a role with exceptions on top. Changing a role changes everyone in it on their next request. A new role can start from a person's current access. Removing a role leaves its people with the access they had, as their own set.
  ```text
  ┌──────────────────────────────────────┐
  │ Access                               │
  │  People [Roles] Apps  Keys           │
  │                                      │
  │ [Add role]                           │
  │                                      │
  │ Sales                                │
  │ Orders, Tips · Stripe: Read          │
  │ Sam, Lee                    [Change] │
  │                                      │
  │ Office                               │
  │ Payroll · Bank: Read & write         │
  │ Nobody yet                  [Change] │
  └──────────────────────────────────────┘
  ```
  ```text
  ┌──────────────────────────────────────┐
  │ ◀ Roles                              │
  │ Name  Sales                          │
  │                                      │
  │ Apps                                 │
  │ [x] Orders                           │
  │     uses Stripe: look up, change     │
  │ [ ] Payroll                          │
  │     uses Bank: look up, change       │
  │ [x] Tips                             │
  │     uses no keys                     │
  │                                      │
  │ Keys                                 │
  │ Stripe      None [Read] Read & write │
  │ Bank       [None] Read  Read & write │
  │ Cloudflare [None] Read               │
  │                                      │
  │ People: Sam, Lee                     │
  │                                      │
  │ [Save role]  Remove role             │
  └──────────────────────────────────────┘
  ```
  ```text
  ┌──────────────────────────────────────┐
  │ Access                               │
  │  People [Roles] Apps  Keys           │
  │                                      │
  │ No roles yet.                        │
  │ A role saves a set of apps and key   │
  │ levels to give to several people.    │
  │                                      │
  │ [Add role]                           │
  └──────────────────────────────────────┘
  ```
- **A person's page starts with their role.** With a role, the page shows what the role gives and links to it. With their own set, you tick apps and pick levels there. Under each app you see which keys it uses and what this person can do. Ticking an app gives Read on the keys it uses, never Read & write: letting someone change things is always your own choice. A level that nothing of theirs uses yet says so.
  ```text
    BEFORE
  ┌──────────────────────────────────────┐
  │ Edit person                          │
  │ Email  sam@shop.com                  │
  │                                      │
  │ Apps                                 │
  │ [x] Orders                           │
  │ [ ] Payroll                          │
  │ [x] Tips                             │
  │                                      │
  │ [Save access]  Cancel                │
  └──────────────────────────────────────┘
  ```
  ```text
    AFTER, with a role
  ┌──────────────────────────────────────┐
  │ ◀ People                             │
  │ sam@shop.com · Can sign in           │
  │                                      │
  │ +Role  [Sales ▼]                     │
  │                                      │
  │ +From the Sales role:                │
  │ +Orders · can look up, not change    │
  │ +Tips                                │
  │ +Stripe: Read                        │
  │ +[Edit the Sales role]               │
  │                                      │
  │ [Save access]  Cancel                │
  └──────────────────────────────────────┘
  ```
  ```text
    AFTER, with their own set
  ┌──────────────────────────────────────┐
  │ ◀ People                             │
  │ kim@shop.com · Can sign in           │
  │                                      │
  │ +Role  [Their own set ▼]             │
  │                                      │
  │ Apps                                 │
  │ [x] Orders                           │
  │     +uses Stripe: look up, change    │
  │     +Kim can look up, not change     │
  │ [ ] Payroll                          │
  │     +uses Bank: look up, change      │
  │ [x] Tips                             │
  │     +uses no keys                    │
  │                                      │
  │ +Keys                                │
  │ Stripe      None [Read] Read & write │
  │   used by Orders                     │
  │ Bank       [None] Read  Read & write │
  │   nothing of Kim's uses it yet       │
  │ Cloudflare  None [Read]              │
  │   look-ups, no app needed            │
  │                                      │
  │ [Save access]  Cancel                │
  └──────────────────────────────────────┘
  ```
- **The Keys view lists every key the app holds.** Each key shows whether it is saved, what uses it, and which roles and people have which level. Open a key to set every level on one page. A key's value is never shown.
  ```text
  ┌──────────────────────────────────────┐
  │ Access                               │
  │  People  Roles  Apps [Keys]          │
  │                                      │
  │ Stripe                         Saved │
  │ Used by Orders: look up, change      │
  │ Sales: Read · Kim: Read     [Change] │
  │                                      │
  │ Cloudflare                     Saved │
  │ Look-ups, no app needed · Read only  │
  │ Kim: Read                   [Change] │
  │                                      │
  │ Maps                   Not saved yet │
  │ Used by Deliveries: look up          │
  │ Ask your assistant for the key link  │
  └──────────────────────────────────────┘
  ```
  ```text
  ┌──────────────────────────────────────┐
  │ ◀ Keys                               │
  │ Stripe · Saved                       │
  │ Used by Orders: look up, change      │
  │                                      │
  │ Sales · Sam, Lee                     │
  │    None [Read] Read & write          │
  │ Office · nobody yet                  │
  │   [None] Read  Read & write          │
  │ kim@shop.com                         │
  │    None [Read] Read & write          │
  │                                      │
  │ [Save access]  Cancel                │
  └──────────────────────────────────────┘
  ```
  With no keys, or with one step left for Cloudflare:
  ```text
  ┌──────────────────────────────────────┐
  │ Access                               │
  │  People  Roles  Apps [Keys]          │
  │                                      │
  │ No keys saved yet.                   │
  │ When an app needs a service, your    │
  │ assistant sends a private link for   │
  │ its key. It shows up here.           │
  └──────────────────────────────────────┘
  ```
  ```text
  ┌──────────────────────────────────────┐
  │ Cloudflare             One step left │
  │ Look-ups need a read-only key.       │
  │ Ask your assistant:                  │
  │ "Finish Access setup"                │
  │ [Copy that request]                  │
  └──────────────────────────────────────┘
  ```
- **The Apps view is the quick way to give an app and the keys it needs.** Each app lists the keys it uses, whether it looks things up or changes them, and who has it. Open an app, tick a role or a person, and set the levels for that app's keys right there, with no trip to the Keys view.
  ```text
  ┌──────────────────────────────────────┐
  │ Access                               │
  │  People  Roles [Apps] Keys           │
  │                                      │
  │ Orders                               │
  │ Uses Stripe: look up, change         │
  │ Sales, Kim                  [Change] │
  │                                      │
  │ Tips                                 │
  │ Uses no keys                         │
  │ Sales                       [Change] │
  │                                      │
  │ Payroll                              │
  │ Uses Bank: look up, change           │
  │ Office                      [Change] │
  └──────────────────────────────────────┘
  ```
  ```text
  ┌──────────────────────────────────────┐
  │ ◀ Apps                               │
  │ Orders                               │
  │ Uses Stripe: look up, change         │
  │                                      │
  │ [x] Sales · Sam, Lee                 │
  │    Stripe  None [Read] Read & write  │
  │ [x] kim@shop.com                     │
  │    Stripe  None  Read [Read & write] │
  │ [ ] Office · nobody yet              │
  │                                      │
  │ A level holds in every app.          │
  │                                      │
  │ [Save access]  Cancel                │
  └──────────────────────────────────────┘
  ```
- **BREAKING: an app can only use the keys it lists.** Today every app is handed every saved key, so the screen could not say truthfully what an app reaches. Each app now names its keys and gets only those. During the update your assistant lists the keys each of your existing apps already uses, so they keep working; a check fails before publishing if one is missed.
- **A key can work with no app.** Some look-ups belong to a key alone. A person with that key's level can run them with no app ticked. Cloudflare ships this way. For another key, ask the usual way, such as *let the team look up a charge*, and the assistant builds it.
  ```text
  action belongs to │ person needs
  ──────────────────┼────────────────────
  an app            │ the app + key level
  a key alone       │ the key level only
  ```
- **Cloudflare look-ups, Read only.** Setup uses your main token to make a second, read-only key for the app. Your main token stays on your computer. A person with Cloudflare: Read can have their assistant look up settings, logs, and usage. They can't change anything, and they can't read your app's database, files, or memory through Cloudflare. Nobody is handed the key itself. Read & write is not offered for Cloudflare.
- **Nobody loses anything when this arrives.** The first time you open Access after the update, each person keeps exactly what their apps already use, as their own set. Nobody has a role or Cloudflare look-ups until you give them.
  ```text
  ┌──────────────────────────────────────┐
  │ Key levels are on.                   │
  │ Everyone kept what their apps        │
  │ already use. Lower a level any time. │
  └──────────────────────────────────────┘
  ```
- **Each person sees what they can use.** Their own Access page lists their apps and key levels above the setup box.
  ```text
    BEFORE                       AFTER
  ┌─────────────────────────┐  ┌─────────────────────────┐
  │ Access                  │  │ Access                  │
  │                         │  │ +You can use            │
  │ Connect your assistant  │  │ +Orders · Tips          │
  │ [Copy setup prompt]     │  │ +Stripe: Read           │
  │                         │  │ Connect your assistant  │
  │                         │  │ [Copy setup prompt]     │
  └─────────────────────────┘  └─────────────────────────┘
  ```
- **Previews work the same way.** The practice list holds roles and key levels too, so you can try all of this on a preview before it reaches the live app.
- **Unchanged, and now written down:** a signed-in teammate without an app sees no card for it, can't open it, and gets none of its data or actions. Its name and screen layout are still packed into the page everyone downloads, so someone who reads the page's code could find those.

**Non-goals:** A role with personal exceptions on top. Letting an assistant send any request it likes to a service other than Cloudflare. Write access to Cloudflare. A different level for the same key in different apps. Hiding an app's name and layout from signed-in teammates. Changing the Cloudflare sign-in wall. Rules about single records, such as one customer or one order. Access to the project's code or to memory.

## Capabilities

### New Capabilities

- `key-access`: per-person levels for each saved key, enforced on every app and assistant call; actions reach only the keys they list; actions that belong to a key alone; the Access views that show and set levels; the read-only Cloudflare look-ups.

### Modified Capabilities

- `employee-onboarding`: the employer can give several people the same apps and key levels through a role.
- `mini-apps`: a mini app's server side receives only the saved keys its app lists, not every saved key.
- `cloudflare-provisioning`: setup and the update also make the read-only Cloudflare key and store it for the app.

## Impact

- Worker: `app/worker/api/contract.ts`, `app/worker/api/router.ts`, `app/worker/api/discovery.ts`, `app/worker/apps/index.ts`, `app/worker/employee-access/` (policy, members, management, apps, setup, a new roles module), a new key registry and a new Cloudflare look-up action; `schema/migrations/0003`, `schema/seed.sql`.
- Screens: `app/src/apps/access/`, `app/src/lib/access.ts`.
- Setup and tooling: `.agents/skills/wong-setup/scripts/provision.mjs` and `private-access.mjs`, `references/permission-groups.md`, `scripts/cf-secrets.mjs`, a new check that an app lists the keys its code names.
- Docs: `wiki/stack/employee-access.md`, `company-api.md`, `mini-apps.md`, `api-keys.md`, `cloudflare-credentials.md`, `cloudflare-access.md`, `staging-bindings.md`.
- Payload release: `CHANGELOG.md` entry, **major**, because an app that lists no keys gets none. `areas.json` names the new spec. Skill text has little headroom, so the permission list added to the setup reference needs an equal cut.
- Builds on #264 (31.2.0), which is on `main`.

## Decision log

- **2026-10-04** — Asked where Read or Read & write is set for a person → chose on each key, holding in every app, with each app showing which keys it uses.
- **2026-10-04** — Asked what Cloudflare read access should cover → chose settings, logs, and usage, never the app's database, files, or memory.
- **2026-10-04** — Asked what a level lets an assistant do for keys other than Cloudflare → chose running actions only, no direct calls to the service.
- **2026-10-04** — Assumed: an action may belong to a key alone, because the owner asked how a key works for someone with no apps, the Cloudflare look-ups need it, and it stays inside "actions only".
- **2026-10-04** — Assumed: the Cloudflare sign-in wall is left unchanged, because Cloudflare's documentation shows its rules match who and which address, never read against write or a key.
- **2026-10-04** — Assumed: Cloudflare is offered at Read only, because the owner asked for read and a write key held by the live app would be close to full control of the account.
- **2026-10-04** — Assumed: an app receives only the keys it lists, a breaking change, because otherwise Access would show claims about an app's reach that nothing enforces.
- **2026-10-04** — Assumed: ticking an app gives Read on its keys and never Read & write, because a new person starts with nothing today and changing things should be a deliberate choice.
- **2026-10-04** — Assumed: at the first open after the update each person keeps what their apps already use, because #264 promised that turning permissions on takes nothing away.
- **2026-10-04** — Assumed: three views, People, Apps, and Keys, because the owner asked to see access per person, per app, and per key, and one list can not show all three on a phone.
- **2026-10-04** — Assumed: previews also hold the read-only Cloudflare key, because the owner wants staging to mirror the live app and this key can change nothing and read no stored data.
- **2026-10-04** — Assumed: the machine that checks previews keeps every key, as it keeps every app today, because the checks before publishing must still reach every action.
- **2026-10-04** — Asked whether to add roles → chose simple roles: a named set of apps and key levels, one role or an own set per person, no exceptions on top. Roles becomes a fourth view.
- **2026-10-04** — Asked for the Apps view to be an easy way to give access to keys → the app page sets the levels for that app's keys beside each tick.
- **2026-10-04** — Asked whether to hide app names and screens from people without the app → chose to leave it as it is and say so in the docs.
- **2026-10-04** — Assumed: removing a role, or moving a person off one, leaves them the access they had as their own set, because tidying up roles should never lock someone out.
- **2026-10-04** — Assumed: no roles are made for you and existing people start with their own set, because the update must change nobody's access.
- **2026-10-05** — Assumed: the role a person holds is kept in its own small table, not as a new column on the people table, because the app from before this change adds people without naming columns, so a new column would break it on previews that other work shares, and after an undo.
- **2026-10-05** — Assumed: until key levels start, a key that works with no app is open to the owner alone, because nobody had those look-ups before and the plan gives them to nobody until the owner does.
- **2026-10-05** — Assumed: an answer may name settings already written in the project's files, such as the owner's email or the word *production*, because Cloudflare's answers name them often and the old check for leaked keys would have refused most look-ups. A saved key is still never allowed in an answer.
- **2026-10-05** — Check: `app/package.json` runs one more check with the others, `scripts/check-app-keys.mjs`, which fails when an app's code names a saved key the app does not list. Nothing was turned off or lowered.
- **2026-10-05** — Assumed: the first save holds every part of the build with its tests written and none run yet, because the plan runs all checks once at the end; the preview check and the live Cloudflare key step stay open.
