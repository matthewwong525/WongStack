<!-- openspec-archive v1 2026-10-05-key-levels-in-access -->
<!-- file proposal.md utf8 25917 -->
# Read or Read & write for each saved key, roles, and a clearer Access

**Status:** ready-to-ship

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
- **2026-10-05** — Assumed: making the read-only Cloudflare key for this repo's own live app is kept as open work in memory and is no longer a task, because it can only happen after publishing and an unticked task stops the publish.
- **2026-10-05** — Asked what ticking an app should do to the keys it uses → chose to keep Read preselected, shown before saving and never Read & write.
- **2026-10-05** — Asked whether other people should be able to manage Access → chose to plan it as the next change, after this one is published.
- **2026-10-05** — Asked what next once the preview was up, after being told the owner's screens had not been walked by the assistant → chose to see the preview himself, then to publish.
- **2026-10-05** — Assumed: the plan is filed in the archive and numbered 33.0.0 for publishing, because every task is done and the automatic checks passed; main had moved to 32.0.0, whose rule that every action input carries a description the Cloudflare look-up now meets.
- **2026-10-05** — Assumed: the Cloudflare look-up leaves a redirect unfollowed and refuses its answer, because the live server rejects the stricter setting first written, as release 32.0.1 found for the sign-in list; its new check caught it here before publishing.

<!-- end proposal.md -->
<!-- file design.md utf8 20081 -->
# Design

## Context

See [proposal.md](proposal.md). #264 (31.2.0) is on `main`: the owner is `WONG_OWNER_EMAIL`, people and app grants live in `wong_access_*` tables, `currentPolicy()` reads them from the primary once per request, and `dispatch()` in `app/worker/api/contract.ts` calls `authorizeRequest()` before any handler. Three facts shape this change.

- **Every handler gets every saved key.** `handleApp()` copies the whole `env` and deletes only the memory bindings and `WONG_ACCESS_LOGIN_MANAGEMENT`. Nothing records which app uses which key.
- **An action already says whether it changes things.** `Action.effect` is `read`, `write` or `external`. Nothing checks it against the caller.
- **The Cloudflare user token never reaches a Worker.** `secrets:push` refuses any `CLOUDFLARE_*` name. Setup already mints two narrow account keys from it, `<repo>-deploy` and `<worker>-access`, through `POST /accounts/<id>/tokens`.

What Cloudflare itself offers, read on 2026-10-04:

- **Access policies** match who (email, group, service token, country, device) and an application matches a hostname and path. There is no HTTP method, read/write or per-key selector ([policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/), [application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)). A path can hold its own Access application, and the more specific path wins.
- **API token permissions** come as Read and Write groups per product ([permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)). `D1 Read` alone can run a query against a database ([query endpoint](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/)), so a read-everything key reads the app's database and memory.

## Goals / Non-Goals

Goals: one level per person per key, enforced on the server for apps and assistants alike; Access shows per person, per role, per app and per key what is reachable, and the display is the enforced truth; a role sets several people at once; Cloudflare look-ups for chosen people without sharing a key; nobody loses access at the update.

Non-goals: a generic request passthrough for other services; a Cloudflare write key in the Worker; per-app-per-key levels; a role with per-person exceptions; gating an app's static screen code per person; Access applications per path; per-record rules; any change to memory or repository authority.

## Decisions

### 1. Zero Trust stays the sign-in wall

The Worker keeps deciding what a signed-in person may do. Access can not express read against write, and it has no notion of a saved key, so key levels can not live there.

Why not one Access application per app path (`/apps/orders/*`): it would move only the app tick to Cloudflare, not levels; every tick would become a provider write with the unknown-write handling #264 needs for the sign-in list; previews would need the same applications; and the deployment check rejects overlapping Access applications on purpose. The app tick already takes effect on the next request from the database.

### 2. A key registry names what the owner sees

Add `app/worker/keys.ts`: one entry per key with a stable id, a plain title, the runtime secret names it covers, and the levels it offers (`read`, `write`; default both).

```ts
export const keys = {
  cloudflare: { title: "Cloudflare", secrets: ["WONG_CLOUDFLARE_READ"], levels: ["read"] },
  // stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY"] },
} as const;
```

`app/.dev.vars.example` stays the one declared list of secret names. A test fails when a name declared there, or a setup-made key, belongs to no registry entry or to two, so a new saved key can not be forgotten. The assistant adds the entry in the same change that declares the name.

Why not derive keys from `.dev.vars.example` alone: a key the owner recognises can be two secrets (an id and a secret), and a secret name is not a title.

*Saved* in Access means every secret of the key is non-empty in this Worker's `env`. Access reports only that boolean.

### 3. Routes list their keys; the need comes from the effect

- `Action` gains `keys?: readonly KeyId[]`.
- A mini app's `api.ts` may export `keys`, used by its bare handlers and by actions that list none.
- `RouteAccess` becomes `{ apps, keys? }`, `{ keys }` for a key-alone action, or the existing `{ kind }`. A main bare handler lists its keys in `routeAccess`. A `{ keys }` mapping with no keys is invalid and denies.
- The level a call needs: `read` for `effect: "read"`, `write` for `write` and `external`. A bare handler has no effect, so `GET` and `HEAD` need `read` and every other method needs `write`.
- An app's line in Access (*uses Stripe: look up, change*) is computed from its routes: the highest need per key.

Why per-route keys with an app-wide default: one export covers the common case, and an action that touches only one of an app's keys can say so, which keeps a person's Read on one key from blocking an action that never uses it.

### 4. One check, one filtered environment

`currentPolicy()` reads key levels in the same primary snapshot as apps, from the person's role when they have one and from their own rows otherwise ([decision 10](#10-a-role-is-a-shared-set-read-live)): `keys: ReadonlyMap<KeyId, "read" | "write">`. `policyAllows()` then requires, after the existing app check, that every key the route lists is held at the needed level. The owner holds every key at its highest level. The verification service token keeps every key, as it keeps every app. `legacy` and `not_started` stay open for app routes. A key-alone route is new, so until levels start only the owner reaches it: nobody else had it before, and nobody gets it until the owner gives it.

`dispatch()` builds the handler's `env` copy: it deletes the secret of every registered key the route does not list. Main routes get the same filtering mini apps get, so a main bare handler with no mapping keeps getting nothing useful once permissions are on. `WONG_ACCESS_LOGIN_MANAGEMENT` and the memory bindings stay deleted for mini apps as today.

A route that lists a key whose secret is empty answers `unavailable` before the handler runs, so `ready` predicates for a missing key become unnecessary; existing ones keep working.

A denial uses the existing safe error shape with `code: "forbidden"` and a message naming the key's title and the level needed. It names no secret.

Discovery (`/api/actions`, the single-action view, OpenAPI) filters with the same `policyAllows()`, so an action a level forbids is not listed. Summaries gain `keys: [{ id, level }]` so an assistant can explain a refusal. The policy revision already bumps on any grant change and is part of every ETag.

Like the memory exclusion, the filtering stops mistakes, not code written to get around it: handlers share the Worker.

### 5. Levels are stored beside app grants

Migration `0003_key_levels.sql`, additive:

- `wong_access_key_grants (installation_id, email, key_id, level CHECK (level IN ('read','write')), revision)`, primary key on the first three; no row means None.
- `wong_access_installation` gains `keys_enabled INTEGER NOT NULL DEFAULT 0`.

- `wong_access_roles (installation_id, role_id, name, revision)`, with `wong_access_role_apps (installation_id, role_id, app_id)` and `wong_access_role_keys (installation_id, role_id, key_id, level)`.
- `wong_access_member_roles (installation_id, email, role_id)`, primary key on the first two, links a person to the role they hold. A table, not a `role_id` column on members: the Worker from before this change inserts into members without naming columns, so a new column there would break it on the staging database other branches share, and after a rollback.

A grant for a key no longer in the registry is ignored, like a grant for an app no longer built. A `write` grant on a key that offers only `read` is refused at save and read as `read`.

### 6. Levels start by themselves and take nothing away

While `keys_enabled` is 0, key levels are not enforced: the app tick alone decides, as today. The environment filtering applies from the first deploy regardless, because it does not depend on people.

The owner's first Access read after the update, in one batch: for each active person and each key any of their apps lists, insert the highest level those apps need; set `keys_enabled = 1`; audit `key_levels_started:<n>`. The revision does not move, so the import's first-open note from the same request stays; discovery's ETag carries whether levels have started instead. A key only key-alone actions use gets no grant. On staging the same step runs against the practice list. A failed batch changes nothing and the switch stays 0. Once it is 1, unreadable level data denies.

A fresh install runs the same step with no people, so it only sets the switch. When permissions themselves have not started (`policy_enabled = 0`), #264's first-open import runs first and this step follows in the same request.

After that, ticking an app in the person form sets each of its keys to `read` when the person has none. The form shows it before saving, and the server applies the same rule when a save carries an app tick and no level for one of its keys, so an API caller gets the same result as the screen.

### 7. Access API

- `GET /api/access/status` adds `keys: [{ id, title, levels, saved, usedBy: [{ app, need }], alone: boolean }]`, `appKeys: { <app>: [{ id, need }] }`, `keysStarted`, `roles: [{ id, name, apps, keys }]`, and `role` and effective `keys: { <id>: level }` on each person.
- `POST /api/access/people` accepts `role` (an id, or `null` for their own set) and `keys: { <id>: "read" | "write" }` beside `apps`; omitted keys keep their level, `null` removes one. `apps` and `keys` are refused together with a role.
- `POST /api/access/roles` creates, changes or removes one role: `{ id?, name, apps, keys, from?, removed? }`. `from` copies a person's current set into a new role.
- `POST /api/access/grants` changes one key's levels, or one app's ticks with the levels of that app's keys, for several roles and own-set people in one batch: `{ key, roles: { <id>: level | null }, people: { <email>: level | null } }` or `{ app, roles: { <id>: boolean }, people: { <email>: boolean }, keys?: { roles, people } }`. A person who holds a role is refused in `people`. It never adds or removes a person, so it never needs the sign-in key.
- `GET /api/access/apps` (self-service) adds the caller's own `keys`.

All writes stay owner-only, outside discovery, with the existing origin check and audit rows (`key_level_changed`, `role_changed`, `role_removed`).

### 8. Cloudflare look-ups

- **The key.** `private-access.mjs` gains a step beside `loginManagementKey`: mint `<worker>-cloudflare-read` with an allow-list of read groups, store it as `WONG_CLOUDFLARE_READ` (`{ version: 1, token, accountId }`) on the production and staging Workers, record the id under `components.cloudflareReadKey`, reuse it on rerun. The `access` command runs it for existing installs. A token that can not create keys reports `missing` with the key link, as the sign-in key does.
- **The allow-list**, named in `permission-groups.md` and resolved by name against the live group list: account settings, Workers scripts, Workers tail, Workers builds (`Workers CI Read`), account analytics, Access apps and policies, Access audit logs, billing, zone, DNS and zone analytics, each Read. An allow-list, not "every Read but these", so a new Cloudflare product that stores data never joins by default. D1, KV, R2, Queues, Vectorize, Hyperdrive, Durable Objects, Secrets Store, Stream and Images are out.
- **The secret is setup-made.** `scripts/cf-secrets.mjs` treats `WONG_CLOUDFLARE_READ` like the sign-in key in one respect, refused in any `.dev.vars` file, and unlike it in another: expected on both Workers.
- **The action.** `app/worker/api/cloudflare.ts`, `cloudflare.read` at `GET /api/cloudflare/read`, `effect: "read"`, `keys: ["cloudflare"]`, mapped `{ keys: ["cloudflare"] }`. Input: `path` and an optional `query` string. It sends one `GET` to `https://api.cloudflare.com/client/v4/` + `path`, only when `path` starts with `accounts/<this account>/` or `zones/`, holds no `..`, and is not under a stored-data product; the key's own permissions are the second lock. Output: Cloudflare's `success`, `result`, `result_info` and `errors`, bounded at 1 MB, with the existing credential scan. That scan now passes the settings setup commits in `wrangler.jsonc` (the owner's email, the environment name, the Access ids): a Cloudflare answer names them often, and they are no secrets. `accounts` alone is also allowed, so an assistant can find the account id. A larger answer returns a safe error that says to narrow the request.

Why a Worker action and not a key per person: service keys stay on the server, one key is rotated in one place, and removing a person needs no Cloudflare call.

Why both Workers: the owner wants staging to mirror the live app, and this key can change nothing and read no stored data. The cost is that branch code on a preview can read account settings; any teammate who can open a pull request can already read every other staging secret.

### 9. Existing installs list their keys at the update

The **Updating.** note tells the assistant to list, for each custom app and main route, the keys its code names. A deterministic check does the finding: `scripts/check-app-keys.mjs` scans each app's worker folder and each main handler file for the secret names in the registry and fails when one is named but not listed. It runs in CI with the code checks, only when app code changed. The update is a `major` release because an unlisted key is absent after it.

### 10. A role is a shared set, read live

A person has a role link or their own grant rows, never both. The policy query reads the role's app and key rows when the link exists, so a role change reaches every holder on their next request with no fan-out write and no stale copy.

- **Giving a role** deletes the person's own rows and writes the link in one batch.
- **Moving to their own set** copies the role's rows into the person's own rows and removes the link, so the form starts from what they had.
- **Removing a role** does that copy for every holder, then deletes the role, in one batch. Nobody loses access by a tidy-up.
- **Ticking an app in a role** gives `read` on its keys, as for a person.
- **The owner and the verification token** have no role.
- The first-open step ([decision 6](#6-levels-start-by-themselves-and-take-nothing-away)) writes own-set rows only. No role is seeded.

Why not a role plus per-person exceptions: the answer to "what can Sam do" would need two places and a precedence rule, and the three other views would each need to show both. One role or one own set keeps every view a plain list.

Why not copy a role's set into each person at assignment: a later role edit would not reach them, which is the reason to have roles.

### 11. Other apps' names and screens stay in the shared page

`app/src/apps/index.ts` compiles every app's title and description into the page, and each app's screen is a static file any signed-in person can request. The server already refuses the app's address, API and actions, and Home hides its card. The owner chose to leave the static files as they are; `wiki/stack/employee-access.md` says so plainly.

## UX

### Use-case brief

The owner decides who can do what a few times a month, usually on a phone, when someone joins, changes role or leaves, or when a new app or key arrives. The job is "let Sam look up orders but not refund them" or "let Lee see why the site is slow". Done means the owner set it in one save and can see, from any of four angles, what that person can reach. The common case is giving a new person a role, or changing one person; setting one key for everyone is the edge case and costs one more tap. Assumed: under ten people, under ten apps, under ten keys. Mirror the existing Access narrow column and shared stylesheet.

### Flow

Owner: open Access → *Add person* → email and a role → *Save access*. For one person's own set: tap the person → tick apps, pick levels → *Save access*. From a role: Roles → a role → tick apps, pick levels → *Save role*. From an app: Apps → an app → tick roles and people, pick that app's key levels → *Save access*. From a key: Keys → a key → pick levels → *Save access*. Employee: open Access → see what they can use → *Copy setup prompt*. Missing Cloudflare key and a not-yet-saved key are secondary states with one line each.

### Hierarchy

People view: *Add person*. Roles view: *Add role*. Role page: *Save role*, with *Remove role* as plain text. Person, key and app pages: *Save access*; levels are a three-part choice with the current one filled, never colour alone. Roles, Keys and Apps views: *Change* per row, secondary. A person with a role shows the role's set as plain text with one link to the role, so there is one place to edit it. One step left: *Copy that request*. Employee view: *Copy setup prompt*. The "can look up, not change" line is muted supporting text under its app.

### Review

[Review page](review.html). Items sketch the People view before and after, the Roles view with its role page and empty state, the person page before and after in both its states, the Keys view with its key page, empty state and one-step-left state, the Apps view with its app page, the first-open note, and the employee's own view before and after. Each fits phone width.

### Components

Existing: the Access column, `People`, `PersonForm`, `Notices`, `FinishStep`, `CopyText`, `AssistantSetup`. New: a view switch (four links that keep their place in the address, so Back works), a level choice (radio group shown as a segmented control), a role picker, `Roles`, `RolePage`, `Keys`, `KeyPage`, `Apps`, an app page with ticks and that app's key levels, and an own-access summary. Loading and failed reads keep *Loading people…* and *Access is unavailable* with *Retry*.

## Risks / Trade-offs

- An existing custom app reads a key it does not list → the check fails before publishing, and the update note makes listing them a step.
- A handler shares the Worker, so filtering is not a sandbox → stated in the docs, as for memory today.
- The read-only Cloudflare key still shows account settings, people's emails in Access logs and Worker code → only people the owner chose hold the level; the allow-list is reviewed in one file.
- Cloudflare renames or adds permission groups → names are resolved against the live list and a missing name fails the step with the name, never mints a wider key.
- Two dimensions, apps and keys, can confuse → each app line says what the person can do there, and a level nothing uses says so.
- A level set on an app's page changes that key everywhere → the page says *A level holds in every app*.
- A role edit reaches several people at once → the role page lists who holds it above *Save role*.
- Bare handlers judged by method can be wrong for a `POST` that only reads → describe it as an action with `effect: "read"`.
- The first-open step gives existing people Read & write where their apps change things → that is what they have today; the first-open note tells the owner levels can be lowered.
- Skill instruction text has little headroom → the allow-list table needs an equal cut in the same reference.

## Migration Plan

`0003` is additive. Deploy order does not matter: until the owner opens Access, levels are not enforced. Environment filtering is live from the deploy, so the key lists for this repo's own apps land in the same change (the supplied apps use no keys). Rollback is a redeploy of the previous Worker; the new table and column stay inert. For this repo's live app, the Cloudflare key step runs once after publishing, as an outward action with a confirm.

## Open Questions

None for the build.

<!-- end design.md -->
<!-- file tasks.md utf8 10888 -->
# Tasks

Build sections 1–5 together, authoring each group's tests and docs beside its code. Run nothing between tasks: no tests, no build, no `/save`. The boxes in 1–5 are checked by source review; section 6 is the one gate. #264 (31.2.0) is already on this branch.

## 1. Worker: keys, levels and the check

- [x] 1.1 Add the key registry `app/worker/keys.ts` (id, title, secret names, offered levels) with the `cloudflare` entry, and a test that fails when a name declared in `app/.dev.vars.example`, or a setup-made key, belongs to no entry or to two. Verify by the test's cases: unregistered name, doubly registered name, clean file.
- [x] 1.2 Let routes list keys ([design 3](design.md)): `Action.keys`, a mini app's exported `keys`, and `RouteAccess` as `{ apps, keys? }` or `{ keys }` in `app/worker/api/contract.ts`, `app/worker/api/router.ts` and `app/worker/apps/index.ts`; derive the needed level from the effect, or from the method for a bare handler. Author tests: a read action needs `read`, a write or external action needs `write`, a bare `POST` needs `write`, an empty `{ keys }` mapping denies.
- [x] 1.3 Add `schema/migrations/0003_key_levels.sql` (the key grants table, `keys_enabled`, the three role tables and the table that links a person to a role) and practice data in `schema/seed.sql`, so a preview starts with one role held by two people, one person with their own set at Read, and one at None. Verify the migration is additive and the seed loads under the existing seed test.
- [x] 1.4 Read apps and levels in `currentPolicy()` in the same primary snapshot, from the person's role when they hold one ([design 10](design.md)), and enforce levels in `policyAllows()` after the app check ([design 4](design.md)): owner and verification token hold every key, `legacy` and `not_started` stay open, levels are ignored while `keys_enabled` is 0, unreadable level data denies once it is 1. A denial names the key's title and the level needed. Author tests for each branch, for a lowered level judged on the next request, for a role change reaching both holders and no one else, and for a key-alone action with no app.
- [x] 1.5 Filter the handler's environment in `dispatch()`: delete the secrets of every registered key the route does not list, for main and mini-app routes, and answer `unavailable` when a listed key's secret is empty. Author tests: an unlisted key is absent, a listed key is present, a missing secret answers `unavailable`, memory and sign-in key exclusions are unchanged.
- [x] 1.6 Filter discovery with the same check in `app/worker/api/discovery.ts` and add `keys: [{ id, level }]` to summaries. Author tests: an action a level forbids is absent from the list, the single-action view and the OpenAPI document; a level change alters the ETag.
- [x] 1.7 Add `scripts/check-app-keys.mjs`, which fails when an app's worker folder or a main handler names a registered secret the route does not list, and run it in CI with the code checks only when app code changed. Author tests with a listed and an unlisted fixture.

## 2. Worker: Access operations

- [x] 2.1 Start levels at the owner's first Access read ([design 6](design.md)) in `app/worker/employee-access/start.ts`: one batch gives each person the highest level their apps need, skips key-alone keys, sets `keys_enabled`, audits it; a failed batch changes nothing; it follows #264's import in the same request when permissions have not started. Author tests: existing person keeps Read & write, key-alone key not granted, repeated read is a no-op, failed batch leaves the switch off, staging runs it on the practice list.
- [x] 2.2 Extend `accessStatus()` and `changeMember()` in `members.ts` ([design 7](design.md)): status carries the key catalogue, each app's keys and need, each person's levels and whether each key is saved; a people save accepts `keys`, refuses an unknown key and a level the key does not offer, and gives `read` on an app's keys when a tick carries no level. Author tests for each rule and for the audit row.
- [x] 2.3 Add roles ([design 10](design.md)) in a new `app/worker/employee-access/roles.ts` with owner-only `POST /api/access/roles`: create, start from a person, change, and remove with each holder keeping their access as their own set; a people save accepts `role` and refuses it together with `apps` or `keys`; moving to an own set copies the role's rows. Author tests: give a role, change it, move off it, remove a held role, duplicate name refused, employee denied, the sign-in list untouched.
- [x] 2.4 Add owner-only `POST /api/access/grants` in `management.ts` for one key's levels, or one app's ticks with that app's key levels, across roles and own-set people in one batch; it refuses a person who holds a role, never adds or removes a person and makes no provider call. Add the caller's own levels to `GET /api/access/apps`. Author tests: employee denied, service token denied, unknown email refused, revision bumps once per batch.

## 3. Access screens

- [x] 3.1 Add the view switch and the four views in `app/src/apps/access/` with addresses that survive Back and reload: People (existing list plus each person's role and levels), Roles, Apps, Keys. Extend the schemas in `app/src/lib/access.ts`. Author tests for each view's loaded, loading, failed and empty states at phone width.
- [x] 3.2 Rebuild the person page: the role picker first; with a role, the role's set as text and a link to it; with their own set, apps with their key use and the *can look up, not change* line, the level choice per key with *nothing of theirs uses it yet*, Read preselected when an app is ticked, one *Save access*. Author tests: picking a role hides the ticks, moving to an own set starts from the role's set, ticking an app preselects Read, lowering a level updates the app's line, a Read-only key offers two choices, keyboard use and labels.
- [x] 3.3 Build the Roles view, its empty state and the role page (name, apps, levels, who holds it, *Save role*, *Remove role* with a confirm that says its people keep their access). Author tests for each state and for *Start from a person*.
- [x] 3.4 Build the key page and the app page: every role's and own-set person's level for one key; and for one app, ticks for roles and people with the levels of that app's keys beside each tick and the line *A level holds in every app*, each saved through `grants`. Show *Saved*, *Not saved yet* with the key-link line, and the Cloudflare one-step-left notice with *Copy that request*. Author tests for each state and for a failed save that rereads the list.
- [x] 3.5 Show the first-open note once levels start, and each person's own apps and levels above the setup box for non-owners. Author tests for owner, employee with none, and the practice banner on a preview.

## 4. Cloudflare look-ups

- [x] 4.1 In `.agents/skills/wong-setup/scripts/private-access.mjs` and `provision.mjs`, mint `<worker>-cloudflare-read` from the allow-list ([design 8](design.md)), store `WONG_CLOUDFLARE_READ` on both Workers, record `components.cloudflareReadKey`, reuse on rerun, report `missing` with the key-link to-do, and run the same step from the `access` command. A group name absent from the live list fails the step by name. Author fake-Cloudflare tests in `scripts/tests/provision.test.mjs`: fresh, rerun, token unable to create keys, renamed group.
- [x] 4.2 Name the allow-list in `.agents/skills/wong-setup/references/permission-groups.md`, confirming each name against the live group list, and cut as many bytes from that reference as the table adds. Verify with `node scripts/measure-context.mjs --check` at the gate.
- [x] 4.3 In `scripts/cf-secrets.mjs`, refuse `WONG_CLOUDFLARE_READ` in any `.dev.vars` file and expect it on both Workers in the parity check. Author tests in `scripts/tests/cf-secrets.test.mjs` for both, and keep the staging refusal of the sign-in key.
- [x] 4.4 Add `app/worker/api/cloudflare.ts` and its route and `{ keys: ["cloudflare"] }` mapping: one `GET`, this account's paths only, stored-data products refused, output bounded and scanned. Author tests with a fake Cloudflare: allowed path, another account's path, a database path, `..` in the path, oversize answer, missing key answers `unavailable`, a person with no level is refused.

## 5. Documentation and distribution

- [x] 5.1 Update the owning pages: `wiki/stack/employee-access.md` (levels, roles, the four views, first open, what a key alone allows, and that an app's name and screen layout stay in the page every signed-in person downloads), `wiki/stack/company-api.md` (list keys on a route, key-alone actions, the Cloudflare look-up), `wiki/stack/mini-apps.md` (an app gets only the keys it lists), `wiki/stack/api-keys.md` (a new key shows in Access), `wiki/stack/cloudflare-credentials.md` and `wiki/stack/staging-bindings.md` (the read-only key, on both Workers), `wiki/stack/cloudflare-access.md` (the wall decides who, the app decides what, with the documentation links). One home per fact; link from the others. Verify with `node scripts/check-payload-links.mjs` at the gate.
- [x] 5.2 Add the `## Next (major)` entry to `CHANGELOG.md` with an **Updating.** note in plain words: the assistant lists the keys each existing app uses, runs the Access setup step for the Cloudflare key, and says what to do when the saved token can not make keys. Leave `VERSION` alone.
- [x] 5.3 Add every new shipped file to `.agents/skills/wong-sync/references/payload-files.json` and the manifest, name the `key-access` spec in `.agents/skills/memory/references/areas.json`, and add `WONG_CLOUDFLARE_READ` beside the sign-in key's commented entry in `app/.dev.vars.example`. Verify with the payload and memory-area tests at the gate.

## 6. One gate, then the preview

- [x] 6.1 After 1–5 are built, run one `/save` checkpoint with every required remote check. Weaken no check. Read every failure, repair them together, and check the boxes in 1–5 only when this gate passes.
- [x] 6.2 On the deployed preview, as the verification identity: Access's pages load, the owner's status and changes are refused to a non-owner, `cloudflare.read` is listed for a holder of the level, and it answers `unavailable` while no key is saved. Seen on 2026-10-05.

The owner's own screens (roles, levels, an app page, a key page) were not walked by the assistant: nobody could sign in as the owner. The owner was told so, chose to look at the preview himself, and then chose to publish. A refused change at Read is covered by tests alone, because the supplied apps use no keys.
After publishing, the read-only Cloudflare key for this repo's own live app, and one real look-up by a second person, are open work kept in memory, not a task here: a step that can only run after publishing could never be ticked before it ([where such a check goes](../../../wiki/development/staging-walkthrough.md)).

<!-- end tasks.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 1265 -->
# Spec Delta

## ADDED Requirements

### Requirement: Setup supplies the read-only Cloudflare key

Setup SHALL create a Cloudflare key limited to reading settings, logs and usage, with no permission that changes anything and none that reads databases, stored files, key-value data, queues or memory, and SHALL store it for the production and staging Workers and record its identifier for reuse and rotation. The key SHALL NOT be the user token, the deploy key or the login-management key, and the user token SHALL still never reach a Worker. A rerun SHALL reuse the key. Updating an existing installation SHALL perform the same step. When the available Cloudflare token cannot create the key, the step SHALL be reported as missing with the private key link and SHALL NOT block the rest of setup or the update.

#### Scenario: A fresh install

- **WHEN** setup finishes
- **THEN** both Workers hold the read-only key, the user token is in neither, and the employer can give a person Cloudflare: Read from Access without another step

#### Scenario: The token cannot create keys

- **WHEN** the saved Cloudflare token lacks permission to create the key
- **THEN** the step is reported missing with the private key link, and Access shows Cloudflare with one step left

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/employee-onboarding/spec.md utf8 1151 -->
# Spec Delta

## ADDED Requirements

### Requirement: A role gives several people the same access

The employer SHALL be able to name a role holding a set of apps and key levels and give it to people. A person SHALL have one role or their own set, never both. A person with a role SHALL have exactly the role's apps and levels, and a change to the role SHALL govern each such person's next request. Moving a person from a role to their own set, or removing a role people hold, SHALL leave each person with the access they had. People who existed before roles SHALL keep their own set until the employer gives them a role. Only the employer SHALL create, change, give or remove a role, and giving a role SHALL NOT change who can sign in.

#### Scenario: The employer changes a role

- **WHEN** the employer removes an app from a role two people hold and saves
- **THEN** both people's next request to that app is denied, and a person with their own set is unaffected

#### Scenario: The employer removes a role people hold

- **WHEN** the employer removes a role that two people hold
- **THEN** each keeps the same apps and key levels as their own set

<!-- end specs/employee-onboarding/spec.md -->
<!-- file specs/key-access/spec.md utf8 5619 -->
# Spec Delta

## Purpose

Key access lets the employer decide, per person, what each saved business-service key may be used for: nothing, looking things up, or also changing things. It covers how the level is enforced, what an action may reach, and how Access shows and sets it.

## ADDED Requirements

### Requirement: A person's key level governs every use of that key

The server SHALL check the caller's current level for every saved key an action uses before business work. Read SHALL permit actions that only look things up. Read & write SHALL also permit actions that change or send things. No level SHALL deny both. The check SHALL apply to app screens' calls, direct API calls, and assistant discovery and calls, and SHALL add to the app grant and any stricter action or record check, never replace them. The employer SHALL hold every key. A refusal SHALL name the key and the level needed and SHALL reveal no key value. Client state, an existing login and cached descriptions SHALL grant no level.

#### Scenario: A person with Read tries to change something

- **WHEN** a person whose Stripe level is Read calls an action that uses Stripe to issue a refund
- **THEN** the server refuses before any business work and names Stripe and Read & write, while that person's Stripe look-ups still run

#### Scenario: A level is lowered during a session

- **WHEN** the employer lowers a person's level and that person sends their next request with the same valid session
- **THEN** the request is judged by the new level, with no logout needed

### Requirement: An action reaches only the keys it lists

An action or app handler SHALL receive only the saved keys its app or action lists, and one that lists none SHALL receive none. What Access shows as an app's key use SHALL come from that same list, so a key an app does not list is a key it can not use. A check SHALL fail before publishing when an app's code names a saved key the app does not list.

#### Scenario: A handler reads a key its app does not list

- **WHEN** an app that lists only Maps runs a handler that reads the Stripe key
- **THEN** the Stripe key is absent, and Access shows that app as using Maps only

### Requirement: A key can be used without an app

An action SHALL be able to belong to a key alone. For such an action the person's level for that key SHALL decide, and no app grant SHALL be required. Assistant discovery SHALL list it only for people whose level permits it.

#### Scenario: A person with no apps holds a key level

- **WHEN** a person with no apps and Cloudflare: Read lists and calls the Cloudflare look-ups
- **THEN** the look-ups are listed and run, and every app's actions stay refused

### Requirement: The employer sees and sets key levels in Access

Access SHALL show the employer each person's level for each key, each app's keys and whether it looks things up or changes them, and for each key whether the app holds it, what uses it and who has which level. The employer SHALL be able to set a level from the person or role, from the key, or from an app that uses the key, and a level set in any of them SHALL be the same level everywhere. Only the employer SHALL change a level. Each signed-in person SHALL see their own apps and levels. No screen or response SHALL show a key's value. On a preview the employer SHALL be able to set levels against the practice list, with no effect on the live app's people.

#### Scenario: The employer sets a level

- **WHEN** the employer sets Stripe to Read for a person and saves
- **THEN** that person's line, the Stripe key's page and every app that uses Stripe show Read for them

#### Scenario: An employee tries to change a level

- **WHEN** an ordinary employee calls a level-changing operation
- **THEN** it is denied and no level changes

### Requirement: Key levels start without taking anything away

On an installation that already has people, everyone SHALL keep what their apps can do until the employer next opens Access. At that open each person SHALL receive, for each key their apps use, the level those apps use, in one step, and nobody SHALL receive a key that only a key-alone action uses. Giving a person an app afterwards SHALL give at most Read on the keys it uses. Once levels have started, level data that can not be read SHALL deny key use and SHALL never fall back to open.

#### Scenario: An installation updates with people already added

- **WHEN** a person has an app that changes things with Stripe, the installation updates, and the employer opens Access
- **THEN** that person has Stripe: Read & write and the app works as before

#### Scenario: The employer gives a new person an app

- **WHEN** the employer ticks an app that uses Stripe for a person with no Stripe level
- **THEN** the person gets Stripe: Read, and Access says they can look up but not change

### Requirement: Cloudflare look-ups change nothing and read no stored data

The supplied Cloudflare key SHALL be offered at Read only. Its look-ups SHALL be limited to the installation's own Cloudflare account, SHALL change nothing, and SHALL NOT return the contents of the app's database, stored files or memory, or any key's value. A person SHALL never receive the Cloudflare key itself.

#### Scenario: A person looks up a setting

- **WHEN** a person with Cloudflare: Read asks for the app's hosting settings through their assistant
- **THEN** the settings are returned and no key is included

#### Scenario: A person asks for stored data

- **WHEN** that person asks Cloudflare for rows of the app's database
- **THEN** the look-up is refused and no rows are returned

<!-- end specs/key-access/spec.md -->
<!-- file specs/mini-apps/spec.md utf8 1864 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: A mini app reaches everything but memory

A mini app's server side SHALL receive the main app's business bindings, the saved business-service keys its app lists and no others, and the verified identity of the caller: a person's email or a service token's name. It SHALL receive no memory-store bindings or Access login-management credential. Identity-checked finite core operations SHALL provide required administration without exposing those secrets. The Worker SHALL keep other runtime routes to bindings, such as importing them, turned off. The docs SHALL say mini apps share the Worker with core authorization and memory, so binding exclusions stop mistakes rather than malicious deployed code. A preview SHALL use staging data and keys, never production management credentials or provider mutations.

#### Scenario: Production binds memory

- **WHEN** a mini app's handler runs on the production Worker, which binds the memory store
- **THEN** it gets the app database, the business-service keys its app lists and the signed-in person, but no memory bindings or raw connection-management credentials

#### Scenario: A handler imports the Worker's bindings

- **WHEN** a handler imports the environment from the Workers runtime
- **THEN** the runtime refuses, and no memory or connection-management binding reaches it

#### Scenario: The owner manages access on a preview

- **WHEN** the verified employer uses Access on a preview
- **THEN** people and app choices are saved in staging data with no login-provider call and no production credential

#### Scenario: The owner manages access

- **WHEN** the verified employer uses the Access mini app's approved core operations
- **THEN** the operation can reconcile the assigned membership without returning a provider key to the mini-app handler or user

<!-- end specs/mini-apps/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-04

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 76480 fence=~~~ -->
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
<title>Review · 2026-10-05-key-levels-in-access</title>
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
<body data-change="2026-10-05-key-levels-in-access">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-05-key-levels-in-access</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Access lets you choose who can sign in and which apps each person gets. It can't yet say what a person may do with the keys your app holds, such as Stripe or Cloudflare. Anyone with an app gets everything that app's keys can do, and nothing shows which app uses which key. You also can't let someone look things up in Cloudflare without handing over your main token. And every person is set up by hand, one tick at a time.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Each saved key gets a level per person: None, Read, or Read &amp; write.</b> Read lets a person, and their assistant, look things up with that key. Read &amp; write also lets them change things or send things. A level is set once per key and holds in every app. Lowering a level takes effect on their next request.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">level        │ look up │ change</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">─────────────┼─────────┼────────</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">None         │ no      │ no</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">Read         │ yes     │ no</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">Read &amp; write │ yes     │ yes</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The sign-in wall stays as it is; the app decides the rest.</b> Cloudflare's own documentation settles it: its sign-in wall decides who gets in, by address. It has no setting for read against write, and it knows nothing about your keys. So it keeps doing the one job it does well, and passes the app a signed proof of who the person is. The app then checks that person's apps and key levels on every request. A refused request says which key and which level it needed.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0"> Cloudflare        the app</span>
<span class="ln" data-note="item-2-line-2" tabindex="0"> sign-in wall</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">┌───────────┐   ┌──────────────────────┐</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│ who gets  │──▶│ has the app?         │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">│ in        │   │ key level enough?    │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">└───────────┘   └──────────────────────┘</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">                   │ yes       │ no</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">                   ▼           ▼</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">                 runs       refused,</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">                            says why</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Access gets four views: People, Roles, Apps, and Keys.</b> People opens first, as today. Each person's line also shows their role and key levels.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">  BEFORE                       AFTER</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">┌─────────────────────────┐  ┌─────────────────────────┐</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">│ Access                  │  │ Access                  │</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">│                         │  │ +People Roles Apps Keys │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│ [Add person]            │  │                         │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">│                         │  │ [Add person]            │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">│ sam@shop.com            │  │                         │</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">│ 2 apps · Can sign in    │  │ sam@shop.com            │</span>
<span class="ln" data-note="item-3-line-9" tabindex="0">│ [Edit] [Remove]         │  │ +Sales · Can sign in    │</span>
<span class="ln" data-note="item-3-line-10" tabindex="0">│                         │  │ 2 apps +· Stripe: Read  │</span>
<span class="ln" data-note="item-3-line-11" tabindex="0">│                         │  │ [Edit] [Remove]         │</span>
<span class="ln" data-note="item-3-line-12" tabindex="0">│                         │  │                         │</span>
<span class="ln" data-note="item-3-line-13" tabindex="0">└─────────────────────────┘  └─────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A role gives several people the same access.</b> A role is a named set of apps and key levels, such as <i>Sales</i>. A person has one role, or their own set, never a role with exceptions on top. Changing a role changes everyone in it on their next request. A new role can start from a person's current access. Removing a role leaves its people with the access they had, as their own set.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">│ Access                               │</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">│  People [Roles] Apps  Keys           │</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">│ [Add role]                           │</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-4-line-7" tabindex="0">│ Sales                                │</span>
<span class="ln" data-note="item-4-line-8" tabindex="0">│ Orders, Tips · Stripe: Read          │</span>
<span class="ln" data-note="item-4-line-9" tabindex="0">│ Sam, Lee                    [Change] │</span>
<span class="ln" data-note="item-4-line-10" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-4-line-11" tabindex="0">│ Office                               │</span>
<span class="ln" data-note="item-4-line-12" tabindex="0">│ Payroll · Bank: Read &amp; write         │</span>
<span class="ln" data-note="item-4-line-13" tabindex="0">│ Nobody yet                  [Change] │</span>
<span class="ln" data-note="item-4-line-14" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-15" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-4-line-16" tabindex="0">│ ◀ Roles                              │</span>
<span class="ln" data-note="item-4-line-17" tabindex="0">│ Name  Sales                          │</span>
<span class="ln" data-note="item-4-line-18" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-4-line-19" tabindex="0">│ Apps                                 │</span>
<span class="ln" data-note="item-4-line-20" tabindex="0">│ [x] Orders                           │</span>
<span class="ln" data-note="item-4-line-21" tabindex="0">│     uses Stripe: look up, change     │</span>
<span class="ln" data-note="item-4-line-22" tabindex="0">│ [ ] Payroll                          │</span>
<span class="ln" data-note="item-4-line-23" tabindex="0">│     uses Bank: look up, change       │</span>
<span class="ln" data-note="item-4-line-24" tabindex="0">│ [x] Tips                             │</span>
<span class="ln" data-note="item-4-line-25" tabindex="0">│     uses no keys                     │</span>
<span class="ln" data-note="item-4-line-26" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-4-line-27" tabindex="0">│ Keys                                 │</span>
<span class="ln" data-note="item-4-line-28" tabindex="0">│ Stripe      None [Read] Read &amp; write │</span>
<span class="ln" data-note="item-4-line-29" tabindex="0">│ Bank       [None] Read  Read &amp; write │</span>
<span class="ln" data-note="item-4-line-30" tabindex="0">│ Cloudflare [None] Read               │</span>
<span class="ln" data-note="item-4-line-31" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-4-line-32" tabindex="0">│ People: Sam, Lee                     │</span>
<span class="ln" data-note="item-4-line-33" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-4-line-34" tabindex="0">│ [Save role]  Remove role             │</span>
<span class="ln" data-note="item-4-line-35" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-36" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-4-line-37" tabindex="0">│ Access                               │</span>
<span class="ln" data-note="item-4-line-38" tabindex="0">│  People [Roles] Apps  Keys           │</span>
<span class="ln" data-note="item-4-line-39" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-4-line-40" tabindex="0">│ No roles yet.                        │</span>
<span class="ln" data-note="item-4-line-41" tabindex="0">│ A role saves a set of apps and key   │</span>
<span class="ln" data-note="item-4-line-42" tabindex="0">│ levels to give to several people.    │</span>
<span class="ln" data-note="item-4-line-43" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-4-line-44" tabindex="0">│ [Add role]                           │</span>
<span class="ln" data-note="item-4-line-45" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>A person's page starts with their role.</b> With a role, the page shows what the role gives and links to it. With their own set, you tick apps and pick levels there. Under each app you see which keys it uses and what this person can do. Ticking an app gives Read on the keys it uses, never Read &amp; write: letting someone change things is always your own choice. A level that nothing of theirs uses yet says so.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">  BEFORE</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">│ Edit person                          │</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">│ Email  sam@shop.com                  │</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-5-line-6" tabindex="0">│ Apps                                 │</span>
<span class="ln" data-note="item-5-line-7" tabindex="0">│ [x] Orders                           │</span>
<span class="ln" data-note="item-5-line-8" tabindex="0">│ [ ] Payroll                          │</span>
<span class="ln" data-note="item-5-line-9" tabindex="0">│ [x] Tips                             │</span>
<span class="ln" data-note="item-5-line-10" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-5-line-11" tabindex="0">│ [Save access]  Cancel                │</span>
<span class="ln" data-note="item-5-line-12" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-13" tabindex="0">  AFTER, with a role</span>
<span class="ln" data-note="item-5-line-14" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-5-line-15" tabindex="0">│ ◀ People                             │</span>
<span class="ln" data-note="item-5-line-16" tabindex="0">│ sam@shop.com · Can sign in           │</span>
<span class="ln" data-note="item-5-line-17" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-5-line-18" tabindex="0">│ +Role  [Sales ▼]                     │</span>
<span class="ln" data-note="item-5-line-19" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-5-line-20" tabindex="0">│ +From the Sales role:                │</span>
<span class="ln" data-note="item-5-line-21" tabindex="0">│ +Orders · can look up, not change    │</span>
<span class="ln" data-note="item-5-line-22" tabindex="0">│ +Tips                                │</span>
<span class="ln" data-note="item-5-line-23" tabindex="0">│ +Stripe: Read                        │</span>
<span class="ln" data-note="item-5-line-24" tabindex="0">│ +[Edit the Sales role]               │</span>
<span class="ln" data-note="item-5-line-25" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-5-line-26" tabindex="0">│ [Save access]  Cancel                │</span>
<span class="ln" data-note="item-5-line-27" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-28" tabindex="0">  AFTER, with their own set</span>
<span class="ln" data-note="item-5-line-29" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-5-line-30" tabindex="0">│ ◀ People                             │</span>
<span class="ln" data-note="item-5-line-31" tabindex="0">│ kim@shop.com · Can sign in           │</span>
<span class="ln" data-note="item-5-line-32" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-5-line-33" tabindex="0">│ +Role  [Their own set ▼]             │</span>
<span class="ln" data-note="item-5-line-34" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-5-line-35" tabindex="0">│ Apps                                 │</span>
<span class="ln" data-note="item-5-line-36" tabindex="0">│ [x] Orders                           │</span>
<span class="ln" data-note="item-5-line-37" tabindex="0">│     +uses Stripe: look up, change    │</span>
<span class="ln" data-note="item-5-line-38" tabindex="0">│     +Kim can look up, not change     │</span>
<span class="ln" data-note="item-5-line-39" tabindex="0">│ [ ] Payroll                          │</span>
<span class="ln" data-note="item-5-line-40" tabindex="0">│     +uses Bank: look up, change      │</span>
<span class="ln" data-note="item-5-line-41" tabindex="0">│ [x] Tips                             │</span>
<span class="ln" data-note="item-5-line-42" tabindex="0">│     +uses no keys                    │</span>
<span class="ln" data-note="item-5-line-43" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-5-line-44" tabindex="0">│ +Keys                                │</span>
<span class="ln" data-note="item-5-line-45" tabindex="0">│ Stripe      None [Read] Read &amp; write │</span>
<span class="ln" data-note="item-5-line-46" tabindex="0">│   used by Orders                     │</span>
<span class="ln" data-note="item-5-line-47" tabindex="0">│ Bank       [None] Read  Read &amp; write │</span>
<span class="ln" data-note="item-5-line-48" tabindex="0">│   nothing of Kim's uses it yet       │</span>
<span class="ln" data-note="item-5-line-49" tabindex="0">│ Cloudflare  None [Read]              │</span>
<span class="ln" data-note="item-5-line-50" tabindex="0">│   look-ups, no app needed            │</span>
<span class="ln" data-note="item-5-line-51" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-5-line-52" tabindex="0">│ [Save access]  Cancel                │</span>
<span class="ln" data-note="item-5-line-53" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>The Keys view lists every key the app holds.</b> Each key shows whether it is saved, what uses it, and which roles and people have which level. Open a key to set every level on one page. A key's value is never shown. With no keys, or with one step left for Cloudflare:</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-1" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-6-line-2" tabindex="0">│ Access                               │</span>
<span class="ln" data-note="item-6-line-3" tabindex="0">│  People  Roles  Apps [Keys]          │</span>
<span class="ln" data-note="item-6-line-4" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-6-line-5" tabindex="0">│ Stripe                         Saved │</span>
<span class="ln" data-note="item-6-line-6" tabindex="0">│ Used by Orders: look up, change      │</span>
<span class="ln" data-note="item-6-line-7" tabindex="0">│ Sales: Read · Kim: Read     [Change] │</span>
<span class="ln" data-note="item-6-line-8" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-6-line-9" tabindex="0">│ Cloudflare                     Saved │</span>
<span class="ln" data-note="item-6-line-10" tabindex="0">│ Look-ups, no app needed · Read only  │</span>
<span class="ln" data-note="item-6-line-11" tabindex="0">│ Kim: Read                   [Change] │</span>
<span class="ln" data-note="item-6-line-12" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-6-line-13" tabindex="0">│ Maps                   Not saved yet │</span>
<span class="ln" data-note="item-6-line-14" tabindex="0">│ Used by Deliveries: look up          │</span>
<span class="ln" data-note="item-6-line-15" tabindex="0">│ Ask your assistant for the key link  │</span>
<span class="ln" data-note="item-6-line-16" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-17" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-6-line-18" tabindex="0">│ ◀ Keys                               │</span>
<span class="ln" data-note="item-6-line-19" tabindex="0">│ Stripe · Saved                       │</span>
<span class="ln" data-note="item-6-line-20" tabindex="0">│ Used by Orders: look up, change      │</span>
<span class="ln" data-note="item-6-line-21" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-6-line-22" tabindex="0">│ Sales · Sam, Lee                     │</span>
<span class="ln" data-note="item-6-line-23" tabindex="0">│    None [Read] Read &amp; write          │</span>
<span class="ln" data-note="item-6-line-24" tabindex="0">│ Office · nobody yet                  │</span>
<span class="ln" data-note="item-6-line-25" tabindex="0">│   [None] Read  Read &amp; write          │</span>
<span class="ln" data-note="item-6-line-26" tabindex="0">│ kim@shop.com                         │</span>
<span class="ln" data-note="item-6-line-27" tabindex="0">│    None [Read] Read &amp; write          │</span>
<span class="ln" data-note="item-6-line-28" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-6-line-29" tabindex="0">│ [Save access]  Cancel                │</span>
<span class="ln" data-note="item-6-line-30" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-31" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-6-line-32" tabindex="0">│ Access                               │</span>
<span class="ln" data-note="item-6-line-33" tabindex="0">│  People  Roles  Apps [Keys]          │</span>
<span class="ln" data-note="item-6-line-34" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-6-line-35" tabindex="0">│ No keys saved yet.                   │</span>
<span class="ln" data-note="item-6-line-36" tabindex="0">│ When an app needs a service, your    │</span>
<span class="ln" data-note="item-6-line-37" tabindex="0">│ assistant sends a private link for   │</span>
<span class="ln" data-note="item-6-line-38" tabindex="0">│ its key. It shows up here.           │</span>
<span class="ln" data-note="item-6-line-39" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-40" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-6-line-41" tabindex="0">│ Cloudflare             One step left │</span>
<span class="ln" data-note="item-6-line-42" tabindex="0">│ Look-ups need a read-only key.       │</span>
<span class="ln" data-note="item-6-line-43" tabindex="0">│ Ask your assistant:                  │</span>
<span class="ln" data-note="item-6-line-44" tabindex="0">│ &quot;Finish Access setup&quot;                │</span>
<span class="ln" data-note="item-6-line-45" tabindex="0">│ [Copy that request]                  │</span>
<span class="ln" data-note="item-6-line-46" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>The Apps view is the quick way to give an app and the keys it needs.</b> Each app lists the keys it uses, whether it looks things up or changes them, and who has it. Open an app, tick a role or a person, and set the levels for that app's keys right there, with no trip to the Keys view.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-7-line-1" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-7-line-2" tabindex="0">│ Access                               │</span>
<span class="ln" data-note="item-7-line-3" tabindex="0">│  People  Roles [Apps] Keys           │</span>
<span class="ln" data-note="item-7-line-4" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-7-line-5" tabindex="0">│ Orders                               │</span>
<span class="ln" data-note="item-7-line-6" tabindex="0">│ Uses Stripe: look up, change         │</span>
<span class="ln" data-note="item-7-line-7" tabindex="0">│ Sales, Kim                  [Change] │</span>
<span class="ln" data-note="item-7-line-8" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-7-line-9" tabindex="0">│ Tips                                 │</span>
<span class="ln" data-note="item-7-line-10" tabindex="0">│ Uses no keys                         │</span>
<span class="ln" data-note="item-7-line-11" tabindex="0">│ Sales                       [Change] │</span>
<span class="ln" data-note="item-7-line-12" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-7-line-13" tabindex="0">│ Payroll                              │</span>
<span class="ln" data-note="item-7-line-14" tabindex="0">│ Uses Bank: look up, change           │</span>
<span class="ln" data-note="item-7-line-15" tabindex="0">│ Office                      [Change] │</span>
<span class="ln" data-note="item-7-line-16" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-7-line-17" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-7-line-18" tabindex="0">│ ◀ Apps                               │</span>
<span class="ln" data-note="item-7-line-19" tabindex="0">│ Orders                               │</span>
<span class="ln" data-note="item-7-line-20" tabindex="0">│ Uses Stripe: look up, change         │</span>
<span class="ln" data-note="item-7-line-21" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-7-line-22" tabindex="0">│ [x] Sales · Sam, Lee                 │</span>
<span class="ln" data-note="item-7-line-23" tabindex="0">│    Stripe  None [Read] Read &amp; write  │</span>
<span class="ln" data-note="item-7-line-24" tabindex="0">│ [x] kim@shop.com                     │</span>
<span class="ln" data-note="item-7-line-25" tabindex="0">│    Stripe  None  Read [Read &amp; write] │</span>
<span class="ln" data-note="item-7-line-26" tabindex="0">│ [ ] Office · nobody yet              │</span>
<span class="ln" data-note="item-7-line-27" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-7-line-28" tabindex="0">│ A level holds in every app.          │</span>
<span class="ln" data-note="item-7-line-29" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-7-line-30" tabindex="0">│ [Save access]  Cancel                │</span>
<span class="ln" data-note="item-7-line-31" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>BREAKING: an app can only use the keys it lists.</b> Today every app is handed every saved key, so the screen could not say truthfully what an app reaches. Each app now names its keys and gets only those. During the update your assistant lists the keys each of your existing apps already uses, so they keep working; a check fails before publishing if one is missed.</div></div></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>A key can work with no app.</b> Some look-ups belong to a key alone. A person with that key's level can run them with no app ticked. Cloudflare ships this way. For another key, ask the usual way, such as <i>let the team look up a charge</i>, and the assistant builds it.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-9-line-1" tabindex="0">action belongs to │ person needs</span>
<span class="ln" data-note="item-9-line-2" tabindex="0">──────────────────┼────────────────────</span>
<span class="ln" data-note="item-9-line-3" tabindex="0">an app            │ the app + key level</span>
<span class="ln" data-note="item-9-line-4" tabindex="0">a key alone       │ the key level only</span></pre></div></details></li>
<li class="item card" id="item-10"><span class="num">10</span><div class="body"><div class="text" data-note="item-10" tabindex="0"><b>Cloudflare look-ups, Read only.</b> Setup uses your main token to make a second, read-only key for the app. Your main token stays on your computer. A person with Cloudflare: Read can have their assistant look up settings, logs, and usage. They can't change anything, and they can't read your app's database, files, or memory through Cloudflare. Nobody is handed the key itself. Read &amp; write is not offered for Cloudflare.</div></div></li>
<li class="item card" id="item-11"><span class="num">11</span><div class="body"><div class="text" data-note="item-11" tabindex="0"><b>Nobody loses anything when this arrives.</b> The first time you open Access after the update, each person keeps exactly what their apps already use, as their own set. Nobody has a role or Cloudflare look-ups until you give them.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-11-line-1" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-11-line-2" tabindex="0">│ Key levels are on.                   │</span>
<span class="ln" data-note="item-11-line-3" tabindex="0">│ Everyone kept what their apps        │</span>
<span class="ln" data-note="item-11-line-4" tabindex="0">│ already use. Lower a level any time. │</span>
<span class="ln" data-note="item-11-line-5" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-12"><span class="num">12</span><div class="body"><div class="text" data-note="item-12" tabindex="0"><b>Each person sees what they can use.</b> Their own Access page lists their apps and key levels above the setup box.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-12-line-1" tabindex="0">  BEFORE                       AFTER</span>
<span class="ln" data-note="item-12-line-2" tabindex="0">┌─────────────────────────┐  ┌─────────────────────────┐</span>
<span class="ln" data-note="item-12-line-3" tabindex="0">│ Access                  │  │ Access                  │</span>
<span class="ln" data-note="item-12-line-4" tabindex="0">│                         │  │ +You can use            │</span>
<span class="ln" data-note="item-12-line-5" tabindex="0">│ Connect your assistant  │  │ +Orders · Tips          │</span>
<span class="ln" data-note="item-12-line-6" tabindex="0">│ [Copy setup prompt]     │  │ +Stripe: Read           │</span>
<span class="ln" data-note="item-12-line-7" tabindex="0">│                         │  │ Connect your assistant  │</span>
<span class="ln" data-note="item-12-line-8" tabindex="0">│                         │  │ [Copy setup prompt]     │</span>
<span class="ln" data-note="item-12-line-9" tabindex="0">└─────────────────────────┘  └─────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-13"><span class="num">13</span><div class="body"><div class="text" data-note="item-13" tabindex="0"><b>Previews work the same way.</b> The practice list holds roles and key levels too, so you can try all of this on a preview before it reaches the live app.</div></div></li>
<li class="item card" id="item-14"><span class="num">14</span><div class="body"><div class="text" data-note="item-14" tabindex="0"><b>Unchanged, and now written down:</b> a signed-in teammate without an app sees no card for it, can't open it, and gets none of its data or actions. Its name and screen layout are still packed into the page everyone downloads, so someone who reads the page's code could find those.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> A role with personal exceptions on top. Letting an assistant send any request it likes to a service other than Cloudflare. Write access to Cloudflare. A different level for the same key in different apps. Hiding an app's name and layout from signed-in teammates. Changing the Cloudflare sign-in wall. Rules about single records, such as one customer or one order. Access to the project's code or to memory.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked where Read or Read &amp; write is set for a person → chose on each key, holding in every app, with each app showing which keys it uses.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked what Cloudflare read access should cover → chose settings, logs, and usage, never the app's database, files, or memory.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked what a level lets an assistant do for keys other than Cloudflare → chose running actions only, no direct calls to the service.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: an action may belong to a key alone, because the owner asked how a key works for someone with no apps, the Cloudflare look-ups need it, and it stays inside &quot;actions only&quot;.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the Cloudflare sign-in wall is left unchanged, because Cloudflare's documentation shows its rules match who and which address, never read against write or a key.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: Cloudflare is offered at Read only, because the owner asked for read and a write key held by the live app would be close to full control of the account.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: an app receives only the keys it lists, a breaking change, because otherwise Access would show claims about an app's reach that nothing enforces.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: ticking an app gives Read on its keys and never Read &amp; write, because a new person starts with nothing today and changing things should be a deliberate choice.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: at the first open after the update each person keeps what their apps already use, because #264 promised that turning permissions on takes nothing away.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: three views, People, Apps, and Keys, because the owner asked to see access per person, per app, and per key, and one list can not show all three on a phone.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: previews also hold the read-only Cloudflare key, because the owner wants staging to mirror the live app and this key can change nothing and read no stored data.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the machine that checks previews keeps every key, as it keeps every app today, because the checks before publishing must still reach every action.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether to add roles → chose simple roles: a named set of apps and key levels, one role or an own set per person, no exceptions on top. Roles becomes a fourth view.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked for the Apps view to be an easy way to give access to keys → the app page sets the levels for that app's keys beside each tick.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether to hide app names and screens from people without the app → chose to leave it as it is and say so in the docs.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: removing a role, or moving a person off one, leaves them the access they had as their own set, because tidying up roles should never lock someone out.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: no roles are made for you and existing people start with their own set, because the update must change nobody's access.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the role a person holds is kept in its own small table, not as a new column on the people table, because the app from before this change adds people without naming columns, so a new column would break it on previews that other work shares, and after an undo.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: until key levels start, a key that works with no app is open to the owner alone, because nobody had those look-ups before and the plan gives them to nobody until the owner does.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: an answer may name settings already written in the project's files, such as the owner's email or the word <i>production</i>, because Cloudflare's answers name them often and the old check for leaked keys would have refused most look-ups. A saved key is still never allowed in an answer.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-05</p>Check: <code>app/package.json</code> runs one more check with the others, <code>scripts/check-app-keys.mjs</code>, which fails when an app's code names a saved key the app does not list. Nothing was turned off or lowered.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the first save holds every part of the build with its tests written and none run yet, because the plan runs all checks once at the end; the preview check and the live Cloudflare key step stay open.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: making the read-only Cloudflare key for this repo's own live app is kept as open work in memory and is no longer a task, because it can only happen after publishing and an unticked task stops the publish.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what ticking an app should do to the keys it uses → chose to keep Read preselected, shown before saving and never Read &amp; write.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked whether other people should be able to manage Access → chose to plan it as the next change, after this one is published.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what next once the preview was up, after being told the owner's screens had not been walked by the assistant → chose to see the preview himself, then to publish.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the plan is filed in the archive and numbered 33.0.0 for publishing, because every task is done and the automatic checks passed; main had moved to 32.0.0, whose rule that every action input carries a description the Cloudflare look-up now meets.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the Cloudflare look-up leaves a redirect unfollowed and refuses its answer, because the live server rejects the stricter setting first written, as release 32.0.1 found for the sign-in list; its new check caught it here before publishing.</li>
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
