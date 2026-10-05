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
