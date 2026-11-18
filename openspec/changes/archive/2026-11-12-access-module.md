<!-- openspec-archive v1 2026-11-12-access-module -->
<!-- file proposal.md utf8 16174 -->
# Access, with its keys and services, becomes a module any app can add

**Status:** ready-to-ship
**Branch:** hulking-dragonfly
**Open questions:** none

## Why

Today, Access works only inside a full WongStack app. It decides who can sign in, what each person may open, and what each person's assistant may do with the app's keys. But it is built into WongStack's server, database, and Cloudflare's sign-in. A project that has its own app and wants only "my team signs in, and I choose who sees what" must take all of WongStack. The keys and services the app holds are part of the same job: a key is a level in Access. So the services list, saving a key, and adding a tool come with Access, not as a part of their own. Memory is now a module any project can add with one pasted message. Access is next, and it follows the same guide.

Using an MCP server through the app goes. In 30 days it had 13 calls, and no project has one saved. It makes every direct call harder to check.

## What Changes

- **Any project with an app can add Access with one pasted message.** The person pastes the message into any AI tool. The AI copies Access in, adds it to the project's own app and database, and runs Access's check until it passes. It asks before each step that costs money or makes something public, and before it pushes.
  ```mermaid
  flowchart TD
    A[Pasted message] --> B{WongStack project?}
    B -->|yes| S[Stop: it is already there]
    B -->|no| C{App with a server?}
    C -->|no| N[Offer WongStack setup, or stop]
    C -->|yes| D[Copy Access in]
    D --> E[Add its route and gate to the app]
    E --> F[Connect the sign-in and the database]
    F --> G[Run the check]
    G --> H[Save; ask before push]
  ```

- **It works with the app's own sign-in.** Cloudflare's sign-in wall comes ready to use. An app that has its own login connects it in one place instead. Access then decides the rest on every request, as it does today.
  | Sign-in | Who gets in | Adding a person also |
  |---|---|---|
  | Cloudflare's sign-in wall | the wall's list | adds them to the wall's list |
  | The app's own login | the app's login | changes nothing outside Access |

- **It works alone, and does more where the project has more.** Each extra comes through one named slot. An empty slot turns off only that extra. Access alone is people and roles: who can sign in, and who manages Access.
  | Extra | Alone | In WongStack |
  |---|---|---|
  | Apps to tick | Everyone listed opens the whole app | Each mini app is a tick |
  | Keys and services | Not shown | Each saved key has a level; the services list, saving a key, and adding a tool |
  | Previews | No practice list | Previews have practice people, and the checker stands in for the owner |
  | Memory's sign-in | Not used | Memory signs in through Access |
  | Project code | Not shown | Install and publish ticks |

- **The Access page shows only what the project has.** With no apps and no keys, a person's page has only their sign-in and role. In WongStack the page looks and works as today.
  ```screen
  <div class="card col gap">
    <div class="row gap"><h3>Access</h3><span class="grow"/><button class="btn-primary">Add person</button></div>
    <div class="row gap"><span class="tag">People</span><span class="tag-outline">Roles</span></div>
    <div class="sep"/>
    <div class="row gap"><span class="grow">sam@shop.com</span><span class="tag-outline">Admin</span><span class="muted">Can sign in</span></div>
    <div class="row gap"><span class="grow">lee@shop.com</span><span class="tag-outline">Own set</span><span class="muted">Can sign in</span></div>
    <div class="row gap"><span class="grow">kim@shop.com</span><span class="tag-outline">Sales</span><span class="muted">Waiting to sign in</span></div>
  </div>
  ```
  No real picture: the page in a project with Access alone is made by this change, and no prototype can serve it before the build.

- **The services list and keys come with Access.** Your assistant still finds a service, reads its calls, sends a key to the app unseen, and adds a new tool with no publish, the same way as today. In a project with Access alone, these work once the project tells Access where its keys are kept.
  ```text
  "connect my Stripe"
   → services list: Stripe, waiting
   → key sent to the app, sealed
   → Stripe: Read & write for you
   → 3 charges today
  ```

- **Using an MCP server through the app goes.** The assistant no longer lists or calls an MCP server's tools through the app, and /connect no longer offers it as a way to add a tool. A tool that offers only an MCP server shows as not connected yet, with the reason. Every other way to add a tool stays.
  | Way to add a tool | Before | After |
  |---|---|---|
  | A fixed key | yes | yes |
  | An ID and a secret | yes | yes |
  | An MCP server | yes | no: not connected yet |

- **Other modules use Access through their slots.** Memory's sign-in is the first. When a project has memory and Access, Access's setup offers to connect them, so memory knows who each person is and what they may see.
  ```text
  memory's sign-in slot  ◀── Access fills it
  a key's level          ──▶ asked of Access
  an app's tick          ──▶ asked of Access
  ```

- **WongStack's own parts move out, and work the same.** WongStack's database, the keys its code lists, Project code, the GitHub people on previews, and the app's own actions are WongStack's, not Access's. They move to WongStack's own folders, as memory's database did. Everyone in a WongStack app keeps every person, role, app, and key level, with no step for the owner.
  ```text
  stays in WongStack          goes in the module
  database tables             rules: people, roles,
  keys in the code              apps, key levels, Admin
  Project code                the Access page
  GitHub people on previews   Cloudflare sign-in
  the app's actions, login    services list, using a key,
  Cloudflare look-ups           saving keys, adding tools
  ```

- **Updates keep your edits.** A full WongStack project gets Access with each update, as today. A project with only Access pastes the update message. Your own edits stay, and when an edit and an update touch the same lines, it stops and names each file.

## What the build needs

- **Nothing.**

Non-goals: Project code (install and publish through the app) and GitHub people on previews stay WongStack's; the app's actions and their helper (sign in, list, describe, call) stay with the app; /connect's browser steps are the Browser plan's; a server that runs no JavaScript gets no route from setup; no change to what the Access page shows or does in a WongStack app; no change to the stored people, roles, or levels.

## Capabilities

### New Capabilities

- `access-module`: Access as one module any app can add: its rules, page, sign-in adapters, store contract and check, slots, the services list and key tools, setup, and update.

### Modified Capabilities

- `key-access`: MCP servers through the app are removed; a keyless service keeps its requirement without the MCP scenario.
- `connect-tools`: the helper no longer adds a tool through its MCP server.

## Impact

- New `.agents/plugins/access/` (README, SKILL.md, hooks, setup guide, `server/`, `store/`, `signin/`, `screen/`), linked at `.agents/skills/access`, mapped by `payload-files.json`, listed in `.claude-plugin/marketplace.json`.
- `app/worker/access.ts` and most of `app/worker/employee-access/` move into the module as plain JavaScript; WongStack keeps a D1 store (`app/worker/access-store/`), its slots file, Project code, pushers, keys and tools routes.
- `app/src/apps/access/` mounts the module's page; `app/src/lib/access` moves into the module.
- `app/worker/index.ts`, `memory-caller.ts`, `api/*`, `apps/index.ts` call the module's gate.
- Services move into the module: `.agents/skills/services/`, `scripts/lib-services.mjs`, the `services`, `api`, `record`, `key` and `tool` commands of `scripts/company-api.mjs`, `scripts/seal-keys.mjs`, `scripts/check-service-definitions.mjs`, `app/src/lib/seal.ts`, `app/worker/api/{services,forward}.ts`, `app/worker/key-rules.ts`, `employee-access/{keys-route,tools-route,tools}.ts`. `scripts/company-api.mjs` keeps `login`, `list`, `describe`, `call`, loads memory only when it is there, and hands the moved commands to the module.
- MCP removed: `scripts/mcp-session.mjs`, `app/worker/api/mcp.ts`, `forward-mcp.test.ts`, the MCP parts of `forward.ts`, `tools.ts`, `key-rules.ts`, `services.ts`, and the `mcp` command; the AGENTS.md rule sentence on MCP servers; `wiki/stack/company-api.md#use-an-mcp-server-through-the-app`.
- `.agents/memory/d1/connect.mjs` signs in through the module's computer sign-in.
- `scripts/tests/module-install.test.mjs` installs Access alone; `check-module-versions.mjs` covers its version.
- Wiki: `wiki/stack/employee-access.md`, `preview-access.md`, `cloudflare-access.md`, `company-api.md`, `service-catalogue.md`, `connect-your-tools.md`, `wiki/maintaining/adding-a-module.md`.

## Decision log

- **2026-11-11** — Asked how far the Access module should stand alone → chose any app: the module brings the rules, the page, and a store check; setup adds one route and one sign-in check to the project's own app and database; Cloudflare's sign-in comes ready, and another login fills the sign-in slot.
- **2026-11-11** — Asked whether Project code is part of the Access module → chose that it stays WongStack's and joins Access through the keys slot.
- **2026-11-11** — Assumed: GitHub people on previews stay WongStack's with Project code, because both read the project's GitHub and exist only for the change loop.
- **2026-11-11** — Asked (in the Services chat) whether Services is its own module → chose to fold it into Access: the services list, /connect's key steps, and the `services`, `api`, `record` and `key` commands; the app's own helper (`login`, `list`, `describe`, `call`) stays with the app.
- **2026-11-11** — Asked (in the Services chat) whether to keep MCP servers through the app → chose to remove them: 13 calls in 30 days, and no project has one saved.
- **2026-11-11** — Asked whether `tool add` goes with MCP → chose to keep it in Access, so a new tool still works with no publish; only its MCP option goes.
- **2026-11-11** — Asked whether Services and the MCP removal go in this plan or a second one → chose this plan, with the MCP removal first in the tasks.
- **2026-11-11** — Assumed: `scripts/company-api.mjs` hands the moved commands to the module, because skills and habits in three projects call them by that name.
- **2026-11-11** — Assumed: service definitions, types, and notes pages stay the project's files, named to the module by its slots, because they are the project's own record of each service.
- **2026-11-11** — Assumed: a stored tool with an MCP setup is ignored after the update and named once in the change record, because no project has one and a strict read must not fail the whole key list.
- **2026-11-11** — Assumed: "any app" means any server that runs JavaScript (Node, Workers, Bun, Deno), because the module's code is plain JavaScript, as memory's is; elsewhere setup stops and says so.
- **2026-11-11** — Assumed: the Cloudflare sign-in and its list adapter ship inside the module, because Cloudflare is an outside service, not another WongStack part; the D1 store stays WongStack's, as memory's did.
- **2026-11-11** — Assumed: the Access page ships as plain JavaScript files with a small bundled screen library and no build step, because any app can then serve the folder as it is, and a project's edits need no rebuild.
- **2026-11-11** — Assumed: the module is one folder with hooks (a chat-start check and the `access` skill), because the guide asks every module to ask once at chat start when a part is missing.
- **2026-11-11** — Assumed: no stored data changes, because WongStack's D1 store reads today's tables.
- **2026-11-12** — Check: `scripts/measure-context.mjs` counts a module's `references/setup.md` as on-call, not as instructions, because the guide stops at its first step in a WongStack install, so no WongStack session reads it. Memory's guide moves out of the total too.
- **2026-11-12** — Assumed: the gate refuses a request with no caller by default, and an optional `open` slot lets one in, because an app that forgets a sign-in check must not be open; WongStack fills `open` from its open-until-the-card switch, so its open starter works as today. This replaces the earlier pick that the gate trusts the sign-in.
- **2026-11-12** — Assumed: `serve()` answers the page's HTML at each address under `/apps/access/` that names no `.mjs` or `.css` file, and the app serves `screen/`'s files, because a reload deep in Access must open the page and a Worker can not read the module's folder.
- **2026-11-12** — Assumed: with no `definitions` named, the services helper says the keys are not set up and what to fill, before any request, and exits without a failure, because an Access-only project may have no app address to ask.
- **2026-11-12** — Check: `app/src/apps/access/Leaving.test.tsx`, `app/src/apps/access/levels.test.ts`, `app/src/apps/access/note.test.ts`, `app/src/apps/access/Notices.test.tsx`, `app/src/apps/access/PersonPage.test.tsx`, `app/src/apps/access/ProjectStep.test.tsx`, `app/src/apps/access/Pushers.test.tsx`, `app/src/apps/access/Roles.test.tsx`, `app/src/apps/access/Services.test.tsx`, `app/src/apps/access/status.test.ts`, `app/src/apps/access/style.test.ts`, `app/src/apps/access/subjects.test.ts`, `app/src/apps/access/Welcome.test.tsx` and `app/src/lib/seal.test.ts` are removed, because the page moved to the module and its tests moved with it to `screen/*.test.mjs`, which the app's test run includes.
- **2026-11-12** — Check: `app/worker/api/services.test.ts`, `app/worker/checked-caller.test.ts`, `app/worker/employee-access/core.test.ts`, `app/worker/employee-access/key-levels.test.ts`, `app/worker/employee-access/keys-route.test.ts`, `app/worker/employee-access/login-management.test.ts` and `app/worker/employee-access/tools-route.test.ts` are removed, because their code moved to the module's `server/` and `signin/`, and their tests moved beside it; the hand-built-caller guard is in the module's tests.
- **2026-11-12** — Check: `scripts/tests/lib-openapi.test.mjs`, `scripts/tests/lib-scrub.test.mjs` and `scripts/tests/lib-services.test.mjs` are removed, because their code moved to the module's `scripts/lib/`, tested by `scripts/tests/access-openapi.test.mjs`, `access-scrub.test.mjs` and `access-services-lib.test.mjs`.
- **2026-11-12** — Check: `app/worker/api/forward-mcp.test.ts`, `app/worker/api/mcp.test.ts` and `scripts/tests/mcp-session.test.mjs` are removed, because MCP through the app is removed with the code they tested.
- **2026-11-12** — Check: `app/tsconfig.worker.json` drops `tests/employee-access/unchecked-caller.ts`, because the guard that file fed moved into the module's tests. `app/vitest.config.ts` adds the module's tests and lets the test server read the repo root, where they sit. `app/package.json` runs the same service-records check from its new path. `app/.oxlintrc.json` lets the Access app import the module's page alone. `app/knip.jsonc` ignores `src/lib/utils.ts`, the ready-made parts' helper, which no moved screen imports now.
- **2026-11-12** — Checkpoint: built and reviewed (13 findings fixed, then 1 more); every task but the preview walk (9.3) is done; saving for that walk.
- **2026-11-12** — Asked: on the preview the checker opens every app and Matthew's own email is the owner, so no walk could show a person without an app being refused; Matthew chose the automatic tests (`403`, *App access denied*) as that check's evidence. The walk showed the rest: the Access page's pictures match today's at 390 and 1280 px, a practice-list save and its undo work as the checker, and `company-api.mjs services` and a Notion `users/me` look-up through the app answer.
- **2026-11-12** — Archive checkpoint: every task done, archived as release 54.0.0, and saved for the merge.

<!-- end proposal.md -->
<!-- file design.md utf8 21840 -->
# Design

## Context

Access today is spread through WongStack's app:

- **Sign-in:** `app/worker/access.ts` (200 lines) verifies Cloudflare's signed assertion before every route, in `app/worker/index.ts`.
- **Rules:** `app/worker/employee-access/` (about 3,000 lines without tests) holds people, roles, Admin, apps, key levels, the first open, the change record, and the sign-in list's Cloudflare calls. It reads D1 directly through a `Core` (`core.ts`), across 20 `wong_access_*` tables.
- **The page:** `app/src/apps/access/` (about 1,070 lines without tests, React) and its client `app/src/lib/access.ts`. It imports `CopyText`, `Loading` and `lib/apps` from the app.
- **Mixed in:** Project code (`code.ts`, `git-relay.ts`, `publish.ts`, `change.ts`, `knowledge*.ts`, `setup-file.ts`, `prompt.ts`), GitHub people on previews (`pushers.ts`), sealed keys (`keys-route.ts`) and tools (`tools-route.ts`) share the same router and `Core`.
- **Services:** the services list (`app/worker/api/services.ts`), direct use (`api/forward.ts`, `key-rules.ts`), sealed keys (`keys-route.ts`, `scripts/seal-keys.mjs`, `app/src/lib/seal.ts`, table `sealed_keys`), tools added from a chat (`tools-route.ts`, `tools.ts`, table from `20261105120000_tools.sql`), and the helper commands `services`, `api`, `record`, `key`, `tool`, `mcp` in `scripts/company-api.mjs` with `scripts/lib-services.mjs`. The `services` skill (15 lines) tells the AI how to use them. `company-api.mjs` imports memory's files at load, so it fails in a project with no memory.
- **MCP through the app:** `scripts/mcp-session.mjs`, `app/worker/api/mcp.ts`, and `forward.mcp` in `forward.ts`, `tools.ts`, `key-rules.ts`, `services.ts`. 13 calls in 30 days across all projects; none has an MCP server saved (Services chat, 2026-11-11).
- **Callers:** `index.ts`, `api/{router,discovery,forward,services,contract}.ts`, `apps/index.ts`, and `memory-caller.ts` ask the policy (`currentPolicy`, `appPageDenied`, `holds`).

Memory (v52/v53) set the pattern this change follows: a module folder under `.agents/plugins/<name>/`, a store of named operations with `serve()` and `checkStore()`, a repo-side part outside the folder, and a setup guide that adds one route to the repo's app. [Adding a module](../../../wiki/maintaining/adding-a-module.md) owns the rules. The `plan-module` change (workspace focused-baboon) edits the same guide, in a different section.

## Goals / Non-Goals

**Goals:**

- One folder, `.agents/plugins/access/`, that runs in any JavaScript server with only three slots filled.
- WongStack's app runs on that folder, with every person's access, every stored row, and every screen unchanged.
- Setup and update by pasted message, as memory's.
- Memory's sign-in slot filled from Access in a repo that has both.
- Services in the same folder: the services list, direct use, sealed keys, tools from a chat, and their helper commands.
- MCP through the app removed first, so less code moves.

**Non-Goals:**

- Moving Project code, GitHub people on previews, the app's actions (`api/discovery.ts`, `api/contract.ts`), or the app helper's `login`, `list`, `describe`, `call` into the module.
- /connect's browser steps (`connect/scripts/browser.mjs`): the Browser plan's.
- A server that runs no JavaScript.
- Changing any `key-access` or `employee-onboarding` promise, any table, or any Access screen in WongStack.
- Making the Services, Browser, Daily, or change-loop modules (their own workspaces).

## Decisions

### 1. Three layers, by folder

```text
.agents/plugins/access/           the module (ships; real folder in installs)
  README.md                       install and update messages first
  SKILL.md                        /access: who has what, add a person, from a chat
  .claude-plugin/plugin.json      version; hooks
  .codex-plugin/plugin.json       same version
  hooks/{claude,codex}.json       session-start only
  scripts/session-start.mjs       asks once when the slots file is missing
  scripts/services.mjs            services, api, record, key send, tool add|remove
  scripts/lib/{client,services,seal-keys,check-definitions}.mjs
  skills/services/SKILL.md        how the AI uses a service (today's services skill)
  references/setup.md             setup and ## Update
  server/                         plain .mjs + .d.mts types
    index.mjs                     access(slots) → { gate, decide, serve, scheduled }
    policy.mjs                    current policy for one caller (today's policy.ts)
    people.mjs roles.mjs sets.mjs start.mjs levels.mjs management.mjs
    services.mjs forward.mjs key-rules.mjs sealed.mjs tools.mjs
  store/
    interface.mjs                 OPERATIONS, the HTTP-free store shape
    contract.mjs                  checkStore(makeStore): node:test suite
    stand-in.mjs                  in-memory store the tests and setup start from
  signin/
    cloudflare.mjs                verify the signed assertion (today's access.ts)
    cloudflare-list.mjs           the sign-in list part (today's login-management.ts)
    computer.mjs                  this computer's sign-in headers (cloudflared token)
  screen/
    main.mjs  *.mjs               the Access page, Preact + htm, no build; server/page.mjs is its HTML
    vendor/preact-htm.mjs         pinned, bundled once
    access.css                    CSS variables with the app's look as fallback
    seal.mjs                      sealing a key in the page and the helper

app/worker/access-store/          WongStack's side: D1 store over today's tables
app/worker/access-slots.ts        WongStack's slots: sign-in, store, owner, apps, keys, list, checker, extras
app/worker/employee-access/       what stays: Project code, pushers
app/worker/keys.ts, api/cloudflare.ts   WongStack's keys in code and its Cloudflare look-ups, through the keys slot
```

In the source, `.agents/skills/access → ../plugins/access`, and `payload-files.json`'s `mapped` sends the folder to `.agents/skills/access/` in every install, as memory's. Root `.claude-plugin/marketplace.json` gains an `access` entry.

### 2. The slots

The project builds Access once, in its own file, and every route uses that one object:

```js
import { access } from '<skills>/access/server/index.mjs';
export default access({
  signIn: request => ({ email, subject } | { machine } | null),   // required
  store: caller => Store,                                          // required: passes checkStore
  owner: () => 'owner@shop.com',                                   // required
  apps: () => [{ id, title }],                                     // optional: ticks
  keys: () => [{ id, title, levels: ['read','write'], direct?, alone?, liveOnly? }],  // optional: levels
  signInList: { list, add, remove } ,                              // optional: the wall's list
  secret: name => string | undefined,                              // optional: a key's value, for direct use
  sealing: { publicKey, privateKey } ,                             // optional: lets a person send a key sealed
  environment: () => 'live' | 'preview' | 'local',                 // optional; default 'live'
  checker: () => machineId,                                        // optional: owner on a preview only
  extras: [{ path, need: { key, level } | 'manage', handle }],     // optional: routes under Access's sign-in
  open: () => boolean,                                             // optional: true lets a request with no caller in
  prefix: '/api/access/', page: '/apps/access/',                   // optional: the API's and the page's paths
});
```

- **One object, not a profile file the module loads.** Access runs inside the app's server, where the app's bundler must see each import. The slots file is the project's, outside the folder, so an update never touches it.
- **Empty optional slots.** No `apps`: one implicit app, the whole app; the page shows no ticks. No `keys`: no levels, no key-only calls. No `signInList`: Access keeps its own list only, and the first open lists the owner alone. No `checker` or `environment`: no practice-list behaviour.
- **A slot that throws** is treated as unreadable data: after permissions start, the request is refused (`key-access` keeps that promise today).
- **Repo-side file slots** sit in `.agents/access/slots.json`: `{ "slots": "<path of the slots module>", "app": "<origin or how to find it>", "definitions": "schema/services", "types": "app/worker/services", "notes": "wiki/services" }`. The helper and the chat-start check read it; a missing key turns off only `api` and `record`.
- **No `secret`:** direct use and look-ups are off; the services list says where to name keys. **No `sealing`:** `key send` says to put the key in the app's own secrets.
- **WongStack's slots** (`app/worker/access-slots.ts`): `signIn` from `signin/cloudflare.mjs`; `store` from `access-store/`; `owner` from `WONG_OWNER_EMAIL`; `apps` from the `app.json` catalogue; `keys` from today's key catalogue plus Project code (`code`, with `alone: true`) and the Cloudflare look-up key; `signInList` from `signin/cloudflare-list.mjs` on production only; `environment` from `WONG_ENVIRONMENT`; `checker` from the verification service token; `secret` from the Worker's env; `sealing` from today's sealing pair; `extras` for Project code and pushers, which keep their files and ask the module's `decide` and `manages`.

### 3. The gate and decisions

`access(slots)` returns:

- `gate(request, need)` → `null` or a refusal `Response`, for a route's `RouteAccess` (`{ apps }`, `{ keys, direct }`, or `infrastructure | self-service | owner`). Today's `appPageDenied`, `policyDenied` and `holds` checks move behind it; refusal text stays word for word (`App access denied`, `Stripe: Read & write needed`).
- `decide(request)` → the caller's current policy (today's `CurrentPolicy`), for callers that need more than yes or no, such as `memory-caller.ts`.
- `serve(request)` → answers the `prefix` slot's path (default `/api/access/`: today's management, `keys`, `tools` routes, and `extras`), the services list (`/api/services`), and the page's HTML at each address under the `page` slot's path (default `/apps/access/`) that names no `.mjs` or `.css` file, so a reload deep in Access opens the page. The app serves `screen/`'s files at that same path. WongStack keeps `/api/access/`, `/api/services`, the forward path, and `/apps/access/`, where its own app frame mounts the page.
- **No caller:** `gate` and `decide` refuse a request whose `signIn` gives null (`401 Sign in first`), unless the optional `open` slot says the app is open to anyone; WongStack fills `open` from its open-until-the-card switch.
- `scheduled()` → the sign-in-list reconcile that today runs on the cron, when a `signInList` is set.

The owner-only and `Core` type marks (`checked-caller.test.ts`) become runtime-checked caller objects made only inside the module; the guard test moves into the module's tests and keeps its intent: no route builds a caller by hand.

### 4. The store contract

Named operations replace raw D1 in the rules. The list (final names in the build):

```text
policy(subject)        one snapshot: started flags, revision, person, role, apps, levels
people() roles()       the lists, with sets
savePerson  removePerson  saveRole  removeRole   each with its change-record line
start(people)          the first open: people, then key levels, in one step
listSteps  saveStep    pending sign-in-list steps, leases, attempts
tools() saveTool removeTool        tools added from a chat
sealed() saveSealed                keys waiting for the next publish, last four characters only
audit(event)           the change record
```

- Each save runs in one step and moves the revision once; a person's rows keep the revision that wrote them, so the sign-in list knows which people are settled. A save does not take the revision it read: the last save wins, as it does today.
- `checkStore(makeStore)` runs every operation for the owner, an Admin, a person with a role, a person with their own set, a removed person, and the checker on a preview.
- **WongStack's store** (`app/worker/access-store/`) answers these from today's tables with today's SQL, moved, not rewritten. No migration. `sealed_keys` and the tools table move behind the store as they are. `wong_access_pushers*`, `wong_access_connections`, `wong_access_work`, `wong_access_receipts` stay with the parts that use them.

### 5. Sign-in

- `signin/cloudflare.mjs` is today's `access.ts`: signed assertion, key cache, `SKIP_AUTH` only on a local run, the open-until-the-card switch. It returns the slot's shape.
- `signin/cloudflare-list.mjs` is today's `login-management.ts`, given its key and ids by the slots file: it still refuses a shared or second allowing policy and a non-matching application.
- `signin/computer.mjs` gives this computer's headers for the app: the `cloudflared` token, read without logging in. `.agents/memory/d1/connect.mjs` calls it for the person's sign-in and keeps the schedule sign-in and old admin key itself. Memory's folder does not change.
- **Another login:** setup writes `signIn` over the app's own session check. Access never sees a password.

### 6. The page

- Plain ES modules with Preact and htm, vendored once in `screen/vendor/`, so any app serves the folder as files and a project's edit needs no build. Today's React components port one for one; the client (`lib/access.ts`) moves to `screen/api.mjs`; `CopyText` and `Loading` become small module parts.
- WongStack's `app/src/apps/access/App.tsx` mounts the module's page in its mini-app frame (`mount(element, { base })`), so the app shell and the home list stay.
- Sections hide by what the server reports: no `apps` → no ticks or app counts; no `keys` → no levels or key counts; no `signInList` → no *Can sign in* state, rows say *Listed*; no `extras` → no Project code step.

### 7. Services

- **Server.** `services.ts`, `forward.ts`, `key-rules.ts`, `keys-route.ts`, `tools-route.ts`, `tools.ts` port to `server/` with their tests, with every refusal text and the direct-use rules (`key-access`) kept. A key's value comes only from `secret`; no answer, log, or record carries it.
- **Helper.** `scripts/services.mjs` takes today's `services`, `api`, `record`, `key send`, `tool add|remove`, with `lib-services.mjs` and `seal-keys.mjs`. Its small client signs in through `signin/computer.mjs` and the `app` in `slots.json`; it imports nothing outside the folder. `scripts/check-definitions.mjs` is today's `check-service-definitions.mjs`, run by WongStack's payload checks on the module path.
- **`company-api.mjs`** keeps `login`, `list`, `describe`, `call`. It loads memory's operations only when `.agents/memory/operations.mjs` is there; else the `memory` scope says memory is not added. `services`, `api`, `record`, `key`, `tool` run the module's script with the same arguments, so docs and habits keep working; with no module it says Access is not added.
- **Skill.** `skills/services/SKILL.md` keeps today's five steps with the module's paths; AGENTS.md and every link to `.agents/skills/services/` point to it.
- **/connect** stays its own skill; its key steps name the module's `key send` and `tool add`.

### 8. MCP removal

- Delete `scripts/mcp-session.mjs`, `app/worker/api/mcp.ts`, `forward-mcp.test.ts`, the `mcp` command, `forward.mcp` (in `keys.ts`'s `Forward`, `tools.ts`, `key-rules.ts`, `forward.ts`, `services.ts`'s `mcpRow`), and `TOOL_NAME`'s MCP use.
- A stored tool with `forward.mcp` is skipped on read, so the rest of the list still loads, and the first read writes one change-record line naming it. A save with `mcp` is refused as an unknown field.
- `wiki/stack/company-api.md` loses *Use an MCP server through the app*; AGENTS.md's rule line loses its MCP sentence; `connect-your-tools.md` lists an MCP-only tool as not connected yet.
- This runs first, before the port, so the module never holds MCP code.

### 9. The `access` skill and the chat-start check

- `SKILL.md` lets a person ask in a chat: *who can open Inbox*, *add sam@shop.com as Sales*. It calls the app's Access routes as the person, through `signin/computer.mjs`, and confirms each change first.
- `scripts/session-start.mjs` looks for `.agents/access/slots.json`, which setup writes to name the project's slots file. Missing → one line asking the AI to ask *Access isn't set up yet. Set it up now?*; a resumed chat is quiet.

### 10. Setup and update

`references/setup.md`, from GitHub, in this order:

1. Stop in a WongStack install (`.claude/.wong-stack.json`).
2. Find an app whose server runs JavaScript; none → say so; in an empty repo with no commits, offer WongStack's Cloudflare setup.
3. Copy the folder to `.claude/skills/access/` (tarball, as memory's).
4. Sign-in: Cloudflare's wall in front → `signin/cloudflare.mjs`, and offer the list part (asks before making a Cloudflare key); the app's own login → write `signIn` over it; no login → stop: Access needs one.
5. Store: a store in the app's database from `store/stand-in.mjs`'s shape; ask before making a database.
6. Write the slots file and `.agents/access/slots.json`; fill `apps` from the app's pages only when the person wants ticks.
7. Add the route (`serve`) and the gate in front of the app's routes.
8. Keys: offer to name where the app keeps its keys (`secret`) and where service records go (`slots.json`); skip on a no.
9. Memory there → offer to point memory's `connect` headers at `signin/computer.mjs`, and memory's server route's caller at `decide`.
10. Run `checkStore` with `node --test` and a signed-in request through the gate; ready only on a pass.
11. Codex marketplace entry, as memory's §5. Commit; ask before push.

`## Update` is memory's three-way merge by `plugin.json` version, word for word, with the module's paths.

### 11. Versions, checks, and the guide

- Both `plugin.json` files start at `1.0.0`; `check-module-versions.mjs` covers the folder.
- `module-install.test.mjs` gains Access: copy the folder alone into an empty repo, write stand-in slots, run the chat start and `checkStore`, send one request through the gate, and fail on an import from outside the folder.
- The app's Vitest config includes the module's tests through the skill link, so `app/`'s suite still covers the sign-in's deny paths and real signed tokens (`app-scaffold`).
- [Adding a module](../../../wiki/maintaining/adding-a-module.md) gains one rule under *What it may reach*: a module with a server part ships `serve()`, a store check, and takes the project's slots as one object at the route; memory's store and Access's slots are the examples.

## UX

**Brief.** The owner of a small business app (not WongStack) who wants their team to sign in and wants to choose who manages it. The job: add a person, give a role, see who can sign in. Done: the person signs in and sees the app. Context: a laptop, a few times a month. Common case: three to ten people, no apps or keys slots. Edge: a person waiting on the sign-in list. Mirrors today's Access People view (`app/src/apps/access/People.tsx`).

**Shortest flow.** Open Access → *Add person* → email and role → *Save* → *Saved.*

**Hierarchy.** One primary action per view: *Add person* on People, *Add role* on Roles, *Save* on a person or role.

**Components.** Today's: the People and Roles tabs, the row with its menu, the person and role panels, the role picker, the leave question, the Saved box. Hidden when their slot is empty: app ticks, key levels, Project code step, *Unticked in this update*, GitHub people.

### Review

[review.html](review.html) sketches the People view with only the required slots, in What Changes' fourth item. WongStack's page is unchanged, so it has no picture.

## Risks / Trade-offs

- **A big move.** About 4,300 lines of code without tests change language or place. → Port file by file with tests beside each; WongStack's existing tests run against the module through the slots before any old file goes; a preview walk compares the Access page before and after.
- **The React → Preact port can change the look.** → The page keeps the app's class names and reads its CSS variables; the walk takes the same pictures as `access-screens.md`.
- **A slot can open what it should not**, such as an `extras` route with no `need`. → `access()` refuses to build with an extra that names no `need`, and the gate runs before every `extras` handler.
- **A project's own login may be weak.** → Setup names what Access trusts and that the login is the project's to secure; it never writes a password check.
- **Moving Services changes paths three projects call.** → `company-api.mjs` keeps the command names and hands them on; WongOS and ClaymooApp get the module with `/wong-sync`, and ClaymooApp's own copy (`service-api.mjs`) is untouched.
- **Removing MCP is one-way for a project that adds one between now and the update.** → None has one; the update names any it skips.
- **Two plans edit the module guide.** → Different sections; whichever ships second rebases one line.

## Migration Plan

0. Remove MCP through the app, with its tests and docs.
1. Build the module beside today's code; WongStack's slots and D1 store pass `checkStore` and today's Access tests.
2. Switch `index.ts`, `api/*`, `apps/index.ts`, `memory-caller.ts`, and the Access page to the module in one release; remove the moved files.
3. No data step. An install takes the folder with `/wong-sync`, as memory's.

**After the deploy** (`/ship` runs it): on the live app, the owner opens Access and sees the same people, roles, apps and levels; a person without an app still gets `App access denied`; `memory.mjs` still loads its digest with the company sign-in; `company-api.mjs services` lists the same keys, and one look-up on a saved key answers.

<!-- end design.md -->
<!-- file tasks.md utf8 5420 -->
# Tasks

## 1. Remove MCP through the app

- [x] 1.1 Delete `scripts/mcp-session.mjs`, `app/worker/api/mcp.ts`, `forward-mcp.test.ts` and the `mcp` command; remove `forward.mcp` from `keys.ts`, `tools.ts`, `key-rules.ts`, `forward.ts` and `services.ts` (design §8).
- [x] 1.2 Skip a stored tool with an MCP setup on read and write one change-record line for it; refuse `mcp` on save; tests for both.
- [x] 1.3 Remove *Use an MCP server through the app* from `wiki/stack/company-api.md`, the MCP sentence from the AGENTS.md rules, and the MCP way from `wiki/stack/connect-your-tools.md` and the `connect` skill; fix every link to the removed section.

## 2. Module folder and store

- [x] 2.1 Make `.agents/plugins/access/` with both `plugin.json` files at `1.0.0`, the `.agents/skills/access` link, the `payload-files.json` `mapped` entry, and the `marketplace.json` entry.
- [x] 2.2 Write `store/interface.mjs` (operations and types), `store/stand-in.mjs`, and `store/contract.mjs` (`checkStore`) over each operation and each caller of design §4, tools and sealed keys included.
- [x] 2.3 Write `app/worker/access-store/`: today's D1 SQL behind the operations, with no table change; test it with `checkStore`.

## 3. Server rules and sign-in

- [x] 3.1 Port `policy`, `sets`, `members`, `roles`, `management`, `start`, `key-levels` and `apps` into `server/` as plain `.mjs` with `.d.mts`, reading only the store and the slots; port their tests beside them.
- [x] 3.2 Write `server/index.mjs`: `access(slots)` with `gate`, `decide`, `serve`, `scheduled`; empty-slot behaviour and slot failures by design §2; refuse an `extras` entry with no `need`; tests for each empty slot and a throwing slot.
- [x] 3.3 Port `access.ts` to `signin/cloudflare.mjs` and `login-management.ts` to `signin/cloudflare-list.mjs`, with today's signed-token and refusal tests; write `signin/computer.mjs` with a test.
- [x] 3.4 Move the hand-built-caller guard from `checked-caller.test.ts` into the module's tests.

## 4. Services in the module

- [x] 4.1 Port `api/services.ts`, `api/forward.ts`, `key-rules.ts`, `keys-route.ts`, `tools-route.ts` and `tools.ts` into `server/` with their tests, refusal texts and direct-use rules kept; key values only from `secret` (design §7).
- [x] 4.2 Move `lib-services.mjs`, `seal-keys.mjs`, `check-service-definitions.mjs` and the `services`, `api`, `record`, `key`, `tool` commands into `scripts/`, with a client on `signin/computer.mjs` and `slots.json`; port their tests.
- [x] 4.3 Make `scripts/company-api.mjs` load memory only when it is there and hand the moved commands to the module; tests for a project with no memory and one with no Access.
- [x] 4.4 Move the `services` skill to `skills/services/SKILL.md`; point AGENTS.md, the `connect` skill and every other link at it.

## 5. The page

- [x] 5.1 Vendor Preact and htm into `screen/vendor/`; port the Access components, `lib/access.ts`, `lib/seal.ts`, `CopyText` and `Loading` into `screen/`; hide sections by empty slot (design §6); port the page tests.
- [x] 5.2 Make `app/src/apps/access/App.tsx` mount the module's page in its mini-app frame.

## 6. WongStack on the module

- [x] 6.1 Write `app/worker/access-slots.ts` and `.agents/access/slots.json` (design §2), with Project code and pushers as `extras` that ask `decide` and `manages`.
- [x] 6.2 Switch `index.ts`, `api/{router,discovery,contract}.ts`, `apps/index.ts` and `memory-caller.ts` to the module's `gate`, `decide` and `serve`; keep every route path and refusal text.
- [x] 6.3 Remove the moved files from `app/worker/`, `app/src/` and `scripts/`; include the module's tests in `app/vitest.config.ts`; point the payload checks at `scripts/check-definitions.mjs`.
- [x] 6.4 Make `.agents/memory/d1/connect.mjs` take the person's sign-in from `signin/computer.mjs`.

## 7. Hooks, skill, setup

- [x] 7.1 Write `hooks/{claude,codex}.json` and `scripts/session-start.mjs` (ask once when `.agents/access/slots.json` is missing; quiet on resume), with a test.
- [x] 7.2 Write `SKILL.md` (the `access` skill, by [adding a skill](../../../wiki/maintaining/adding-a-skill.md)).
- [x] 7.3 Write `README.md` (install and update messages first, what you get, what it needs) and `references/setup.md` with `## Update` (design §10).
- [x] 7.4 Add Access to `scripts/tests/module-install.test.mjs` (design §11).

## 8. Wiki and release notes

- [x] 8.1 Add the server-part rule to `wiki/maintaining/adding-a-module.md`.
- [x] 8.2 Update `wiki/stack/employee-access.md`, `preview-access.md`, `cloudflare-access.md`, `access-screens.md`, `company-api.md`, `service-catalogue.md` and `connect-your-tools.md` to name the module, its slots and its helper where they name moved files; keep each page under 3,000 words.
- [x] 8.3 Add the `## Next (major)` entry to `CHANGELOG.md`.

## 9. Checks

- [x] 9.1 Run the app's tests, the module's tests, `module-install.test.mjs`, and the payload checks; fix what fails.
- [x] 9.2 Install Access alone into a scratch Node app with its own login by following `references/setup.md` from the branch; the check passes, a listed and an unlisted person get the right answers, and `services` says the keys are not set up.
- [x] 9.3 `/save`, then walk the preview: the Access page's pictures match today's, a save on the practice list works as the checker, a person without an app is refused, and `company-api.mjs services` and one look-up answer.

<!-- end tasks.md -->
<!-- file specs/access-module/spec.md utf8 8775 -->
# access-module Specification

## Purpose

Access as one module any app can add: who signs in, roles and Admin, apps and key levels, and the Access page, reached by the project only through named slots. WongStack uses the same module it ships.

## ADDED Requirements

### Requirement: Access installs as one module

Access SHALL ship as one folder, with its own start-of-chat check, that every repo with Access holds as a real folder in its skills folder. The folder SHALL import no file outside itself, and SHALL need no other WongStack module to run. A full WongStack install SHALL get it with each update, and WongStack's own app SHALL use the same folder it ships.

#### Scenario: Access alone in an empty repo

- **WHEN** the module's install test copies the Access folder alone into an empty repo, fills only the required slots with stand-ins, and runs a chat start and Access's check
- **THEN** both pass, and no file in the folder imports a file outside it

#### Scenario: A WongStack install after its update

- **WHEN** a WongStack install takes this release with its update
- **THEN** Access is a real folder in its skills folder, and the owner, Admins, and every person keep the same apps, key levels, and roles, with no step for the owner

### Requirement: A project connects Access in one place

A project SHALL connect Access through one set of named slots that it writes outside the module folder: its sign-in, its store, and its owner are required; its apps, its keys, its sign-in list, its preview checker, and its extra key-only calls are optional. An empty optional slot SHALL turn off only its own part, and the Access page SHALL show only the parts the project has. With no apps slot, every listed person SHALL open the whole app; with no keys slot, no key level SHALL show or be checked.

#### Scenario: Access with only the required slots

- **WHEN** a project fills only its sign-in, store, and owner, and the owner opens Access
- **THEN** the page shows people and roles with no app ticks and no key levels, and a listed person opens the app while a person not listed is refused

#### Scenario: A slot that fails

- **WHEN** the keys slot throws on a request, after key levels have started
- **THEN** a call that needs a key level is refused, never let through, and the refusal names no key's value

### Requirement: Access reaches its data only through a store contract

The module SHALL read and write people, roles, apps, levels, and its change record only through one fixed list of named store operations, and SHALL ship a check that any store must pass, covering each operation and each caller's limits. Access SHALL be reported ready only when that check passes. Data that can not be read once permissions have started SHALL deny business work, never open it.

#### Scenario: A stand-in store

- **WHEN** the module's tests run against its stand-in store and against WongStack's store
- **THEN** the store check passes on both, and the same requests give the same decisions

#### Scenario: An unreadable store

- **WHEN** the store can not be read on a request after permissions have started
- **THEN** the request is refused, and nobody gains an app or a level

### Requirement: The sign-in is the project's, and the app decides the rest

Access SHALL take a caller's identity only from the project's sign-in slot, SHALL refuse a request with no caller unless the project says its app is open to anyone, and SHALL never take a person, a role, or an owner from a request's body or a header the slot did not verify. The module SHALL bring a ready sign-in for Cloudflare's sign-in wall and a sign-in-list part for it. With another sign-in, adding or removing a person SHALL change only Access's own list, and Access SHALL still refuse a signed-in person it does not list once permissions have started.

#### Scenario: The app's own login

- **WHEN** a project's own login fills the sign-in slot, and the owner adds a person
- **THEN** the person is saved in Access, no outside sign-in list changes, and the person's next signed-in request gets the apps Access gives them

#### Scenario: A forged identity

- **WHEN** a request carries an owner's email in a header or body that the sign-in slot did not verify
- **THEN** Access treats the caller as not signed in, and refuses Access's own routes

#### Scenario: Nobody signed in

- **WHEN** the sign-in slot finds no caller, before or after the owner first opens Access, and the project does not say its app is open to anyone
- **THEN** Access refuses the request

### Requirement: Keys and services come with Access

The module SHALL bring the services list, the short view of a service's calls and its record step, sending a key to the app sealed, and adding or removing a tool with no publish, each checked against the caller's key level or Access management as today. These SHALL work in a project once it names where its keys are kept and where its service records live, and SHALL be off, with one line saying what is missing, before then. The app's own helper commands that sign in, list, describe, and call actions SHALL keep working, and SHALL run in a project with no memory.

#### Scenario: Connecting a tool in WongStack

- **WHEN** the owner of a WongStack app says *connect my Stripe* after this release
- **THEN** the services list, the sealed key send, and the first look-up work as before, and no key's value appears in the chat

#### Scenario: Access alone with no keys named

- **WHEN** a person in a project with Access alone runs the services list before the project names where its keys are kept
- **THEN** it says the keys are not set up and what to fill, and nothing fails

### Requirement: Setup adds Access from one pasted message

A person SHALL be able to add Access to any repo whose app runs JavaScript on its server, by pasting one message that names the setup guide's web address into any AI tool. Setup SHALL copy the folder in as a real folder, write the project's slots outside it, add one route and one gate to the app, and connect a store in the app's own database. It SHALL ask before each step that costs money or makes something public, SHALL report Access ready only when its check passes, SHALL save its work in the repo, and SHALL ask before any push. It SHALL change nothing in a full WongStack install. In a repo with no such app, it SHALL say so and change nothing, offering WongStack's hosting setup only in an empty repo.

#### Scenario: A repo with its own app and login

- **WHEN** a person pastes the install message in a repo with a JavaScript app, its own login, and a database
- **THEN** the AI copies Access in, fills the sign-in slot from that login, adds the route, gate, and store, runs the check until it passes, saves the work in the repo, and asks before it pushes

#### Scenario: Setup in a WongStack install

- **WHEN** the setup guide is followed in a full WongStack install
- **THEN** it says Access already comes with each update, and changes nothing

### Requirement: A repo with no Access set up is asked once

When the Access folder is in a repo whose slots are missing, a new chat SHALL have the AI ask the person once whether to set Access up. It SHALL start no setup without a yes, a resumed chat SHALL stay quiet, and the chat SHALL go on.

#### Scenario: A new chat with no slots

- **WHEN** a person opens a new chat in a repo with the Access folder and no slots file, and later resumes it
- **THEN** the AI asks once whether to set Access up, starts nothing unasked, and the resumed chat does not ask again

### Requirement: Other modules use Access through their own slots

Access SHALL fill another module's slot only from that module's own repo-side part, never by changing the other module's folder, and a module SHALL work when Access is absent. When a repo has memory and Access, Access's setup SHALL offer to fill memory's sign-in from Access's sign-in, so memory learns each person's identity and role from Access.

#### Scenario: Memory and Access together

- **WHEN** Access's setup runs in a repo that already has memory
- **THEN** it offers to connect memory's sign-in to Access, changes no file in memory's folder, and memory's own check still passes

### Requirement: An Access-only repo updates and keeps its edits

A repo with Access alone SHALL update it with one pasted message. The update SHALL keep the repo's own edits inside the folder and leave its slots as they are. When an edit and the new version change the same lines, it SHALL stop, name each such file, and change no file.

#### Scenario: A conflicting edit

- **WHEN** a repo edited a line of the Access page that the new version also changes, and the person pastes the update message
- **THEN** no file changes, and the AI names that file

<!-- end specs/access-module/spec.md -->
<!-- file specs/connect-tools/spec.md utf8 1461 -->
## MODIFIED Requirements

### Requirement: The helper works out how to add a tool the app does not know

For a tool the company app does not know, the helper SHALL find from the tool's own developer pages how the app can reach it with a fixed key, or with an ID and a secret the app trades for a short token, SHALL add that to the app, and SHALL write what it found on that tool's notes page. A tool that offers only a sign-in the person renews, or only an MCP server, SHALL be shown as not connected yet, with the reason.

#### Scenario: A tool with a personal token

- **WHEN** the owner names Figma, which offers a personal access token
- **THEN** the helper makes that token in the assistant's browser, and Figma's notes page says how the app reaches it

#### Scenario: A tool with an ID and a secret

- **WHEN** the owner names Shopify, whose Dev Dashboard app gives an ID and a secret
- **THEN** the helper adds Shopify so the app trades them for a token itself, and a look-up works after the next publish

#### Scenario: A tool with only a sign-in

- **WHEN** the owner names a tool that only offers a sign-in that renews, with no fixed key
- **THEN** the list shows it as not connected yet and says it needs a sign-in the app can not keep yet

#### Scenario: A tool with only an MCP server

- **WHEN** the owner names a tool whose only way in is its MCP server
- **THEN** the list shows it as not connected yet and says the app does not use MCP servers

<!-- end specs/connect-tools/spec.md -->
<!-- file specs/key-access/spec.md utf8 1483 -->
## REMOVED Requirements

### Requirement: An MCP server is used through the app, never connected to a chat

**Reason:** MCP servers through the app are removed: 13 calls in 30 days, and no project has one saved.
**Migration:** None needed. A tool that offers only an MCP server shows as not connected yet.

### Requirement: Each MCP call is sorted into a look-up or a change by its tool

**Reason:** No MCP call goes through the app any more.
**Migration:** None needed.

### Requirement: A public service can be set up with no key

**Reason:** Its only scenario was a keyless MCP server; the requirement returns as *A service with no key still goes through the app*.
**Migration:** None needed.

## ADDED Requirements

### Requirement: A service with no key still goes through the app

A service that needs no key SHALL be settable up for direct use with no secret, so it still goes through the app and under people's levels. Its setup SHALL then send no credential header, and a setup that names a secret for a key with none, or a key with secrets but no secret named, SHALL fail the checks before publishing.

#### Scenario: A keyless public API

- **WHEN** a public API is set up with no key and a person with Read sends a look-up to it
- **THEN** the answer comes back through the app, and no credential is sent

#### Scenario: A keyless setup that names a secret

- **WHEN** a setup for a key with no secrets names a secret to send
- **THEN** the checks fail before publishing

<!-- end specs/key-access/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-11-11

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 134202 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker, puts the app's look (look.mjs) at the look marker, the light and dark switch (theme.js) at the
  theme marker, and the change name in place of its token. The one script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes: each button shows when the link offers it.
  A preview page (data-kind="preview", from apply's preview-review.mjs) names the finished build and offers Publish.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-11-12-access-module</title>
<style>
  /* The app's look for pages outside the app: the plan review page, the private pages, and a closed link's page.
   look.mjs swaps the colour sets between the markers for the app's own, from app/src/index.css; this copy of
   shadcn's neutral light and dark colours stays only for a colour it can't find. Every page starts light, even on a
   dark device; theme.js adds `.dark` to the root element when the person switches, and draws the switch (.theme-toggle).
   The parts below draw app/src/components/ui/ (button, input, card, badge, skeleton) in plain CSS. Each sits in
   :where(), so a page's own rule always wins.
   Nothing here loads a file: these pages fetch nothing from the network. */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

/* Tailwind's shadow-xs, shadow-sm and shadow-lg; Radix's popover shadow, and its upward twin for a box docked at the
   bottom, so a layer reads as above the page; and the 3px focus ring at half strength. */
:root {
  color-scheme: light;
  --look-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --look-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --look-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --look-shadow-overlay: 0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2);
  --look-shadow-up: 0 -8px 24px rgb(0 0 0 / 0.12);
  --look-ring: color-mix(in oklab, var(--ring) 50%, transparent);
}
.dark { color-scheme: dark; }

:where(body) {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
:where(h1, h2, h3) { font-weight: 600; letter-spacing: -0.025em; }
:where(a) { color: inherit; text-underline-offset: 0.25rem; }
::selection { background: var(--primary); color: var(--primary-foreground); }
:where(:focus-visible) { outline: 3px solid var(--ring); outline-offset: 2px; }

/* Button (button.tsx): outline by default; .btn-primary, and the pages' button.primary and button.main, filled. */
:where(button, .btn) {
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  background: var(--background);
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
:where(button, .btn):where(:hover:not(:disabled)) { background: var(--accent); color: var(--accent-foreground); }
:where(button.primary, button.main, .btn-primary) { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); box-shadow: none; }
:where(button.primary, button.main, .btn-primary):where(:hover:not(:disabled)) { background: color-mix(in oklab, var(--primary) 90%, transparent); color: var(--primary-foreground); }
:where(.btn-ghost) { border-color: transparent; background: transparent; box-shadow: none; }
:where(button, .btn):where(:disabled) { opacity: 0.5; cursor: default; }

/* Field (input.tsx): a thin border, a soft shadow, and the ring on focus. */
:where(input:not([type=checkbox], [type=radio], [type=file], [type=range], [type=button], [type=submit]), select, textarea, .field) {
  border: 1px solid var(--input);
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
:where(input, textarea)::placeholder { color: var(--muted-foreground); }
:where(input, select, textarea, .field):where(:focus-visible) { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px var(--look-ring); }
:where(input, select, textarea, .field):where([aria-invalid=true]) { border-color: var(--destructive); }
:where(input[type=checkbox], input[type=radio]) { accent-color: var(--primary); }

/* Card (card.tsx) and tag (badge.tsx, secondary). */
:where(.card) {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
  box-shadow: var(--look-shadow-sm);
}
:where(.tag) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.33;
  white-space: nowrap;
}
:where(.tag-outline) { border-color: var(--border); background: transparent; color: var(--foreground); }

/* Skeleton (skeleton.tsx): a grey block that pulses while what it stands for loads, and holds still when motion is
   off. .sr-only keeps the words of a loading state for a screen reader alone. */
:where(.skeleton) { display: block; border-radius: calc(var(--radius) - 2px); background: var(--accent); animation: look-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes look-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { :where(.skeleton) { animation: none; } }
:where(.sr-only) { position: absolute; max-width: 1px; max-height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

/* The light and dark switch (theme.js): a ghost icon button, 44px, in the page's top right corner, above the page and
   below a note box or full-screen view. It scrolls away with the page's top, so it never sits over text read later.
   In a page's [data-theme-toggle] slot it sits in line. The icon shows the look it switches to: moon on light. */
.theme-toggle {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--foreground);
}
@media (hover: hover) { .theme-toggle:hover { background: var(--accent); color: var(--accent-foreground); } }
[data-theme-toggle] .theme-toggle { position: static; flex: none; }
.theme-toggle svg { width: 1.25rem; height: 1.25rem; pointer-events: none; }

  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { --pad:12px; margin:0; padding-bottom:var(--bar, 76px); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--muted); border-radius:4px; padding:.1em .3em; font-size:.88em; }
  [hidden] { display:none !important; }
  header { padding:20px 48px 4px 0; }
  .back { display:flex; align-items:center; gap:8px; min-width:0; margin:0 0 8px; }
  .back .muted { margin:0; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .eyebrow { margin:0; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted-foreground); font-size:14px; margin:4px 0 0; }
  #script-error { color:var(--destructive); font-weight:600; }
  section { margin:24px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted-foreground); font-size:14px; font-weight:500; letter-spacing:0; }
  .card { padding:var(--pad); margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  /* A card on a phone: its words, a row of small pictures, then OK and Note. At 900px and wider the pictures sit right. */
  .item.card { padding:0; overflow:hidden; }
  .words { display:grid; grid-template-columns:26px minmax(0,1fr); align-content:start; gap:0 10px; min-width:0; padding:var(--pad); }
  .words > .table, .words > .live-said { grid-column:1 / -1; margin-top:10px; }
  .item > .verdict { padding:0 var(--pad) var(--pad); }
  .text { position:relative; }
  .clamp { display:block; }
  .text:not(.folded) .clamp { display:inline; }
  .text.folded .clamp { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
  .more { min-width:0; min-height:0; padding:0; border:0; background:none; box-shadow:none; color:var(--muted-foreground); font:inherit; font-weight:400; text-decoration:underline; }
  .text:not(.folded) .more { margin-left:.4em; }
  .text.folded .more { position:absolute; right:0; padding-left:1.6em; background:linear-gradient(to right, transparent, var(--card) 1.2em); }
  .view { min-width:0; padding:0 var(--pad) 10px calc(var(--pad) + 36px); }
  .stage { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; }
  /* A part: one labelled picture, drawing, page, or live card; a click opens it full screen. */
  .part { flex:none; width:84px; margin:0; text-align:center; cursor:zoom-in; }
  .part .clip { position:relative; width:84px; height:112px; overflow:hidden; border:1px solid var(--border); border-radius:8px; background:var(--card); }
  .part .clip:not(.big) * { pointer-events:none; }
  .part .clip:not(.big) .pin { pointer-events:auto; }
  .part figcaption { margin-top:3px; color:var(--muted-foreground); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .part:hover figcaption, .part:focus-visible figcaption { color:var(--foreground); }
  .part:hover .clip:not(.big) { outline:2px solid var(--ring); outline-offset:2px; }
  .part .art { margin:0; font-size:var(--f, 13px); }
  .part .art.screen:not([style]) { width:49.2em; }
  /* A page or live card taller than its space shows its top; a fade says there is more. */
  .clip.tall::after { content:""; position:absolute; left:0; right:0; bottom:0; height:48px; background:linear-gradient(to bottom, transparent, var(--card)); pointer-events:none; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .art { position:relative; display:block; width:max-content; margin:0 auto; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--foreground); --pele-muted:var(--muted-foreground); --pele-line:var(--foreground); --pele-border:var(--ring); --pele-surface:var(--card); --pele-surface-alt:var(--muted); --pele-accent:var(--foreground); --pele-error:var(--destructive); --pele-critical:var(--destructive); }
  .art.pic svg { display:block; width:100%; height:auto; }
  /* A hand-drawn sketch: named colours become classes painted from the look; text inherits the page's ink and font at a fixed size. */
  .art.sketch svg { fill:var(--foreground); font-family:system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size:13px; }
  .art.sketch .f-bg { fill:var(--background); } .art.sketch .f-fg { fill:var(--foreground); } .art.sketch .f-muted { fill:var(--muted); } .art.sketch .f-subtle { fill:var(--muted-foreground); }
  .art.sketch .f-line { fill:var(--border); } .art.sketch .f-card { fill:var(--card); } .art.sketch .f-danger { fill:var(--destructive); }
  .art.sketch .s-bg { stroke:var(--background); } .art.sketch .s-fg { stroke:var(--foreground); } .art.sketch .s-muted { stroke:var(--muted); } .art.sketch .s-subtle { stroke:var(--muted-foreground); }
  .art.sketch .s-line { stroke:var(--border); } .art.sketch .s-card { stroke:var(--card); } .art.sketch .s-danger { stroke:var(--destructive); }
  /* A screen: the look's parts in em, so the kit's fit and zoom scale it; its controls sit in an inert box and never take a tap. */
  .art.screen { line-height:1.4; } .art.screen:not([style]) { width:auto; max-width:49.2em; margin-right:1px; }
  .art.screen .sk { pointer-events:none; user-select:none; } .art.screen .sk > * + * { margin-top:.6em; }
  .art.screen :is(h3, h4, p, ul, ol) { margin:0; } .art.screen h3 { font-size:1.15em; } .art.screen h4, .art.screen small { font-size:.9em; }
  .art.screen .card { margin:0; padding:1em; } .art.screen :is(button, .btn) { min-width:0; min-height:0; padding:.45em 1em; font-size:1em; } .art.screen .tag { margin:0; font-size:.85em; }
  .art.screen :is(input:not([type=checkbox], [type=radio]), textarea, select, .field) { display:block; box-sizing:border-box; width:100%; padding:.45em .7em; }
  .art.screen .skeleton { animation:none; min-height:1em; } .art.screen hr, .art.screen .sep { border:0; border-top:1px solid var(--border); margin:.6em 0; }
  .art.screen .row { display:flex; align-items:center; flex-wrap:wrap; } .art.screen .col { display:flex; flex-direction:column; }
  .art.screen .gap { gap:.6em; } .art.screen .grow { flex:1 1 0; min-width:0; } .art.screen .muted { margin:0; color:var(--muted-foreground); font-size:inherit; } .art.screen .danger { color:var(--destructive); }
  .art.screen .sk-bar { display:block; height:.75em; border-radius:.375em; background:color-mix(in oklab, var(--muted-foreground) 25%, transparent); }
  .art.screen .tbl, .art.screen table { width:100%; border-collapse:collapse; } .art.screen :is(th, td) { padding:.35em .6em; text-align:left; border-bottom:1px solid var(--border); }
  /* A picture file: as wide in em as its file is in px, so the fit and zoom scale it like a drawing. */
  .art.photo { padding:0; line-height:0; }
  .art.photo img { display:block; width:20em; height:auto; border:1px solid var(--border); border-radius:.4em; background:var(--background); }
  .art .pin.spot, .page .pin.spot { position:absolute; z-index:2; margin:0; transform:translate(-50%, -50%); }
  /* An ad: the card a feed or a story shows, in em like a picture. */
  .art.ad { width:20em; padding:0; overflow:hidden; border:1px solid var(--border); border-radius:.6em; background:var(--card); color:var(--card-foreground); text-align:left; white-space:normal; line-height:1.3; }
  .ad .ad-account { margin:0; padding:.5em .7em; } .ad .ad-account span { color:var(--muted-foreground); font-size:.85em; }
  .ad img { display:block; width:100%; aspect-ratio:4 / 5; object-fit:cover; }
  .ad-words { display:flex; flex-wrap:wrap; align-items:center; gap:.3em .6em; padding:.6em .7em; }
  .ad-words .ad-text { flex:1 1 100%; margin:0; } .ad-words .ad-headline { flex:1 1 0; min-width:0; }
  .ad-button { padding:.3em .8em; border-radius:.4em; background:var(--primary); color:var(--primary-foreground); font-size:.9em; }
  .ad.story { position:relative; } .ad.story img { aspect-ratio:9 / 16; }
  .ad.story .ad-account { position:absolute; top:0; left:0; right:0; z-index:1; background:color-mix(in oklab, var(--background) 70%, transparent); }
  .ad.story .ad-words { position:absolute; left:0; right:0; bottom:0; background:color-mix(in oklab, var(--background) 80%, transparent); }
  /* A page or a live card: drawn at a phone or computer width, scaled; a cover over a page takes a tap as a spot note. */
  .page, .live { position:relative; overflow:hidden; margin:0 auto; background:white; }
  .page iframe, .live iframe { display:block; border:0; transform-origin:0 0; }
  .live iframe { background:var(--background); }
  .cover { position:absolute; top:0; left:0; right:0; bottom:0; cursor:crosshair; }
  .verdict { display:flex; align-items:center; gap:8px; }
  .verdict button { min-width:64px; }
  .note-list .group { margin:12px 0 6px; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  .words > .table { overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius); }
  .tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .tbl th, .tbl td { padding:6px var(--pad); text-align:left; vertical-align:top; border-bottom:1px solid var(--border); }
  .tbl th { color:var(--muted-foreground); font-weight:500; background:var(--muted); }
  .tbl tbody tr:last-child td { border-bottom:0; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  /* Full screen: the labels and Close on top; the part's own frame fills the middle; what changes it sits at the foot. */
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--muted); }
  #viewer .vtop { flex:none; display:flex; align-items:center; gap:8px; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); background:var(--background); }
  #viewer .names { flex:1 1 0; min-width:0; display:flex; gap:4px; overflow-x:auto; scrollbar-width:none; }
  #viewer .name { flex:none; min-width:0; padding:0 12px; border:0; background:transparent; box-shadow:none; color:var(--muted-foreground); font-weight:400; white-space:nowrap; }
  #viewer .name[aria-selected="true"] { background:var(--muted); color:var(--foreground); font-weight:600; }
  #viewer .vspace { flex:1; min-height:0; }
  #viewer .vfoot { flex:none; display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); background:var(--background); }
  #viewer .vhint { flex:1 1 220px; margin:0; color:var(--muted-foreground); font-size:13px; }
  .zoom, .sizes { display:flex; align-items:center; gap:6px; }
  .zoom .level { color:var(--muted-foreground); font-size:13px; }
  .sizes { gap:0; padding:2px; border-radius:var(--radius); background:var(--muted); }
  .sizes button { min-height:36px; border:0; background:none; box-shadow:none; color:var(--muted-foreground); font-weight:400; }
  .sizes button[aria-pressed="true"] { background:var(--card); color:var(--foreground); font-weight:600; box-shadow:var(--look-shadow-xs); }
  .clip.big { position:fixed; left:0; right:0; top:var(--vtop, 52px); bottom:var(--vfoot, 52px); z-index:9; width:auto !important; height:auto !important; max-height:none !important;
    padding:12px; overflow:auto; border:0; border-radius:0; background:var(--muted); cursor:auto; touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  .clip.big::after { display:none; }
  .clip.big > .art, .clip.big > .page, .clip.big > .live { margin:0 auto; }
  .clip.big > :is(.art.photo, .art.ad, .art.pic, .page) { cursor:crosshair; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted-foreground); font-size:13px; }
  .tag { margin-right:8px; vertical-align:1px; }
  .tag.assumed { border-color:var(--border); border-style:dashed; background:transparent; color:var(--foreground); }
  .tag.check { border-color:var(--foreground); border-style:dotted; background:transparent; color:var(--foreground); }
  .hit { outline:3px solid var(--ring); outline-offset:3px; }
  button { font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; border-color:var(--primary); background:var(--primary); box-shadow:none; color:var(--primary-foreground); font:600 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { border-color:var(--foreground); border-style:dashed; background:var(--background); color:var(--foreground); }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; font-weight:400; }
  .entry .where { display:block; color:var(--muted-foreground); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; border-color:var(--input); box-shadow:var(--look-shadow-overlay); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--input); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-overlay); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:1px 0 0; border-radius:0; box-shadow:var(--look-shadow-up); padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted-foreground); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(var(--cols, 1), minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:var(--background); border-top:1px solid var(--border); }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  body.read-only .bar, body.read-only .add, body.read-only .verdict, body.read-only .hint, body.read-only .vhint .note-it, body.read-only #chip, body.read-only .drop, body.read-only .files button { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-lg); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--look-shadow-lg); font-size:14px; font-weight:500; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted-foreground); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:var(--background); color:var(--foreground); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:8px 14px; border-radius:var(--radius); background:var(--primary); color:var(--primary-foreground); box-shadow:var(--look-shadow-lg); font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  /* Files and the needs list: the look's parts. */
  .live-said { margin:6px 0 0; }
  .form { display:grid; gap:14px; }
  .need .form { margin-top:10px; }
  .q { min-width:0; margin:0; padding:0; border:0; }
  .q-label { display:block; margin:0 0 4px !important; font-weight:500; }
  .drop { position:relative; display:flex; align-items:center; justify-content:center; min-height:64px; padding:12px; border:1px dashed var(--input); border-radius:var(--radius); text-align:center; cursor:pointer; }
  .drop.over, .drop:focus-within { border-color:var(--ring); background:var(--accent); }
  .drop input { position:absolute; width:1px; height:1px; opacity:0; }
  .files { list-style:none; margin:6px 0 0; padding:0; }
  .files li { display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:14px; }
  .files .why { color:var(--destructive); }
  .needs { list-style:none; margin:0; padding:0; }
  .need { scroll-margin-top:8px; }
  @media (min-width:701px) {
    body { --pad:16px; font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { padding-left:max(12px, calc((100% - 700px) / 2 + 12px)); padding-right:max(12px, calc((100% - 700px) / 2 + 12px)); }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100% - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
  /* Wide screen: every part and the bar share one 1160px column; a card's words and buttons sit left, and its
     pictures sit right, side by side, as tall as the words (the kit sets the height). */
  @media (min-width:900px) {
    main { max-width:1160px; padding:0 24px; }
    .bar { padding-left:max(24px, calc((100% - 1160px) / 2 + 24px)); padding-right:max(24px, calc((100% - 1160px) / 2 + 24px)); }
    #ready-confirm, #ready-says { right:max(24px, calc((100% - 1160px) / 2 + 24px)); }
    .item.has-view { display:grid; grid-template-columns:minmax(280px, 380px) minmax(0, 1fr); grid-template-rows:auto 1fr; align-items:start; }
    .item.has-view > .words { grid-column:1; grid-row:1; padding:20px 20px 12px; }
    .item.has-view > .verdict { grid-column:1; grid-row:2; padding:0 20px 20px; }
    .item.has-view > .view { grid-column:2; grid-row:1 / span 2; display:flex; padding:0; border-left:1px solid var(--border); background:var(--muted); }
    .stage { flex:1; min-width:0; gap:16px; padding:16px; align-items:center; }
    .stage > .part:first-child { margin-left:auto; } .stage > .part:last-child { margin-right:auto; }
    .part { width:auto; }
    .part .clip { width:auto; height:auto; border:0; border-radius:0; background:none; }
    .part[data-kind="draw"] .clip:not(.big) { border:1px solid var(--border); border-radius:var(--radius); background:var(--card); }
    .part:is([data-kind="page"], [data-kind="live"]) .clip:not(.big) { border:1px solid var(--border); border-radius:12px; background:var(--card); }
    .part figcaption { margin-top:6px; font-size:14px; }
  }
</style>
<script>
// The light and dark switch outside the app: inlined in the review page's <head>, served to private pages as /theme.js.
// It applies the saved choice before paint, then adds the button; storage that is off still switches, unremembered.
(function () {
  var KEY = 'wongstack-theme';
  var SVG = 'http://www.w3.org/2000/svg';
  // lucide's moon and sun. The icon shows the look a tap switches to.
  var ICONS = {
    moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
    sun: [['circle', { cx: '12', cy: '12', r: '4' }]].concat(['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].map(function (d) { return ['path', { d: d }]; })),
  };
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  root.classList.toggle('dark', saved === 'dark');

  function icon(name) {
    var svg = document.createElementNS(SVG, 'svg');
    var attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
    ICONS[name].forEach(function (part) {
      var el = document.createElementNS(SVG, part[0]);
      Object.keys(part[1]).forEach(function (k) { el.setAttribute(k, part[1][k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function draw(button) {
    var dark = root.classList.contains('dark');
    button.setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark');
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.textContent = '';
    button.appendChild(icon(dark ? 'sun' : 'moon'));
  }

  function mount() {
    if (!document.body || document.querySelector('.theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    draw(button);
    button.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* switched, not remembered */ }
      draw(button);
    });
    var slot = document.querySelector('[data-theme-toggle]');
    if (slot) slot.appendChild(button);
    else document.body.insertBefore(button, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
</script>
</head>
<body data-change="2026-11-12-access-module" data-own-back>
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-11-12-access-module</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#needs">Needs</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint"><span class="lead">Tap Note to comment.</span> <span class="copies">Saving a note copies all your notes.</span> <span class="tail">Tap a picture to see it full screen.</span></p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Today, Access works only inside a full WongStack app. It decides who can sign in, what each person may open, and what each person's assistant may do with the app's keys. But it is built into WongStack's server, database, and Cloudflare's sign-in. A project that has its own app and wants only &quot;my team signs in, and I choose who sees what&quot; must take all of WongStack. The keys and services the app holds are part of the same job: a key is a level in Access. So the services list, saving a key, and adding a tool come with Access, not as a part of their own. Memory is now a module any project can add with one pasted message. Access is next, and it follows the same guide.</p>
<p data-note="why-2" tabindex="0">Using an MCP server through the app goes. In 30 days it had 13 calls, and no project has one saved. It makes every direct call harder to check.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card has-view" id="item-1"><div class="words"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Any project with an app can add Access with one pasted message.</b> The person pastes the message into any AI tool. The AI copies Access in, adds it to the project's own app and database, and runs Access's check until it passes. It asks before each step that costs money or makes something public, and before it pushes.</div></div></div><div class="view"><div class="stage"><figure class="part" data-kind="draw"><div class="clip"><div class="art pic" data-note="item-1-picture-1" tabindex="0" style="width:45em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 585 1019" width="585" height="1019" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_A_B_0"><path d="M227.65,56L227.65,97"/><path class="pele-marker" d="M227.65,104L224.29,96L231.01,96Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_B_S_0"><path d="M204.54,221.04C204.54,238.51 107.82,238.51 107.82,255.98L107.82,339.89"/><path class="pele-marker" d="M107.82,346.89L104.46,338.89L111.18,338.89Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_B_C_0"><path d="M250.76,221.04C250.76,238.51 347.48,238.51 347.48,255.98L347.48,301.48"/><path class="pele-marker" d="M347.48,308.48L344.12,300.48L350.84,300.48Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_C_N_0"><path d="M327.57,420.85C327.57,437.32 234.78,437.32 234.78,453.79L234.78,499.29"/><path class="pele-marker" d="M234.78,506.29L231.42,498.29L238.14,498.29Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_C_D_0"><path d="M367.39,420.85C367.39,437.32 460.18,437.32 460.18,453.79L460.18,511.29"/><path class="pele-marker" d="M460.18,518.29L456.82,510.29L463.54,510.29Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_D_E_0"><path d="M460.18,566.29L460.18,619.29"/><path class="pele-marker" d="M460.18,626.29L456.82,618.29L463.54,618.29Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_E_F_0"><path d="M460.18,698.29L460.18,739.29"/><path class="pele-marker" d="M460.18,746.29L456.82,738.29L463.54,738.29Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_F_G_0"><path d="M460.18,818.29L460.18,859.29"/><path class="pele-marker" d="M460.18,866.29L456.82,858.29L463.54,858.29Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_G_H_0"><path d="M460.18,914.29L460.18,955.29"/><path class="pele-marker" d="M460.18,962.29L456.82,954.29L463.54,954.29Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_B_S_0"><rect x="92.92" y="257.98" width="29.78" height="21" rx="3" fill="var(--_bg)"/><text x="107.82" y="273.38" text-anchor="middle">yes</text></g><g class="pele-edge-label" data-id="L_B_C_0"><rect x="335.7" y="257.98" width="23.57" height="21" rx="3" fill="var(--_bg)"/><text x="347.48" y="273.38" text-anchor="middle">no</text></g><g class="pele-edge-label" data-id="L_C_N_0"><rect x="223" y="455.79" width="23.57" height="21" rx="3" fill="var(--_bg)"/><text x="234.78" y="471.19" text-anchor="middle">no</text></g><g class="pele-edge-label" data-id="L_C_D_0"><rect x="445.28" y="455.79" width="29.78" height="21" rx="3" fill="var(--_bg)"/><text x="460.18" y="471.19" text-anchor="middle">yes</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="A" transform="translate(227.65,32)"><rect x="-77.58" y="-24" width="155.17" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Pasted message</text></g><g class="pele-node pele-shape-diam" data-id="B" transform="translate(227.65,169.74)"><polygon points="0,-65.74 105.18,0 0,65.74 -105.18,0" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">WongStack project?</text></g><g class="pele-node pele-shape-rect" data-id="S" transform="translate(107.82,370.89)"><rect x="-99.82" y="-24" width="199.63" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Stop: it is already there</text></g><g class="pele-node pele-shape-diam" data-id="C" transform="translate(347.48,370.89)"><polygon points="0,-62.4 99.85,0 0,62.41 -99.85,0" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">App with a server?</text></g><g class="pele-node pele-shape-rect" data-id="N" transform="translate(234.78,542.29)"><rect x="-112.26" y="-36" width="224.53" height="72" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" text-anchor="middle" xml:space="preserve"><tspan x="0" y="-6.4">Offer WongStack setup, or</tspan><tspan x="0" y="17.6">stop</tspan></text></g><g class="pele-node pele-shape-rect" data-id="D" transform="translate(460.18,542.29)"><rect x="-73.13" y="-24" width="146.26" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Copy Access in</text></g><g class="pele-node pele-shape-rect" data-id="E" transform="translate(460.18,662.29)"><rect x="-105.17" y="-36" width="210.34" height="72" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" text-anchor="middle" xml:space="preserve"><tspan x="0" y="-6.4">Add its route and gate to</tspan><tspan x="0" y="17.6">the app</tspan></text></g><g class="pele-node pele-shape-rect" data-id="F" transform="translate(460.18,782.29)"><rect x="-115.83" y="-36" width="231.66" height="72" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" text-anchor="middle" xml:space="preserve"><tspan x="0" y="-6.4">Connect the sign-in and the</tspan><tspan x="0" y="17.6">database</tspan></text></g><g class="pele-node pele-shape-rect" data-id="G" transform="translate(460.18,890.29)"><rect x="-69.14" y="-24" width="138.27" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Run the check</text></g><g class="pele-node pele-shape-rect" data-id="H" transform="translate(460.18,986.29)"><rect x="-97.6" y="-24" width="195.2" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Save; ask before push</text></g></g></svg></div></div><figcaption>Flow</figcaption></figure></div></div></li>
<li class="item card" id="item-2"><div class="words"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>It works with the app's own sign-in.</b> Cloudflare's sign-in wall comes ready to use. An app that has its own login connects it in one place instead. Access then decides the rest on every request, as it does today.</div></div><div class="table"><table class="tbl"><thead><tr><th>Sign-in</th><th>Who gets in</th><th>Adding a person also</th></tr></thead><tbody><tr data-note="item-2-row-1" tabindex="0"><td>Cloudflare's sign-in wall</td><td>the wall's list</td><td>adds them to the wall's list</td></tr><tr data-note="item-2-row-2" tabindex="0"><td>The app's own login</td><td>the app's login</td><td>changes nothing outside Access</td></tr></tbody></table></div></div></li>
<li class="item card" id="item-3"><div class="words"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>It works alone, and does more where the project has more.</b> Each extra comes through one named slot. An empty slot turns off only that extra. Access alone is people and roles: who can sign in, and who manages Access.</div></div><div class="table"><table class="tbl"><thead><tr><th>Extra</th><th>Alone</th><th>In WongStack</th></tr></thead><tbody><tr data-note="item-3-row-1" tabindex="0"><td>Apps to tick</td><td>Everyone listed opens the whole app</td><td>Each mini app is a tick</td></tr><tr data-note="item-3-row-2" tabindex="0"><td>Keys and services</td><td>Not shown</td><td>Each saved key has a level; the services list, saving a key, and adding a tool</td></tr><tr data-note="item-3-row-3" tabindex="0"><td>Previews</td><td>No practice list</td><td>Previews have practice people, and the checker stands in for the owner</td></tr><tr data-note="item-3-row-4" tabindex="0"><td>Memory's sign-in</td><td>Not used</td><td>Memory signs in through Access</td></tr><tr data-note="item-3-row-5" tabindex="0"><td>Project code</td><td>Not shown</td><td>Install and publish ticks</td></tr></tbody></table></div></div></li>
<li class="item card has-view" id="item-4"><div class="words"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The Access page shows only what the project has.</b> With no apps and no keys, a person's page has only their sign-in and role. In WongStack the page looks and works as today. No real picture: the page in a project with Access alone is made by this change, and no prototype can serve it before the build.</div></div></div><div class="view"><div class="stage"><figure class="part" data-kind="draw"><div class="clip"><div class="art pic screen" data-note="item-4-picture-1" tabindex="0"><div class="sk" inert><div class="card col gap">
  <div class="row gap"><h3>Access</h3><span class="grow"></span><button class="btn-primary">Add person</button></div>
  <div class="row gap"><span class="tag">People</span><span class="tag-outline">Roles</span></div>
  <div class="sep"></div>
  <div class="row gap"><span class="grow">sam@shop.com</span><span class="tag-outline">Admin</span><span class="muted">Can sign in</span></div>
  <div class="row gap"><span class="grow">lee@shop.com</span><span class="tag-outline">Own set</span><span class="muted">Can sign in</span></div>
  <div class="row gap"><span class="grow">kim@shop.com</span><span class="tag-outline">Sales</span><span class="muted">Waiting to sign in</span></div>
</div></div></div></div><figcaption>Screen</figcaption></figure></div></div></li>
<li class="item card has-view" id="item-5"><div class="words"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The services list and keys come with Access.</b> Your assistant still finds a service, reads its calls, sends a key to the app unseen, and adds a new tool with no publish, the same way as today. In a project with Access alone, these work once the project tells Access where its keys are kept.</div></div></div><div class="view"><div class="stage"><figure class="part" data-kind="draw"><div class="clip"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">&quot;connect my Stripe&quot;</span>
<span class="ln" data-note="item-5-line-2" tabindex="0"> → services list: Stripe, waiting</span>
<span class="ln" data-note="item-5-line-3" tabindex="0"> → key sent to the app, sealed</span>
<span class="ln" data-note="item-5-line-4" tabindex="0"> → Stripe: Read &amp; write for you</span>
<span class="ln" data-note="item-5-line-5" tabindex="0"> → 3 charges today</span></pre></div><figcaption>Drawing</figcaption></figure></div></div></li>
<li class="item card" id="item-6"><div class="words"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Using an MCP server through the app goes.</b> The assistant no longer lists or calls an MCP server's tools through the app, and /connect no longer offers it as a way to add a tool. A tool that offers only an MCP server shows as not connected yet, with the reason. Every other way to add a tool stays.</div></div><div class="table"><table class="tbl"><thead><tr><th>Way to add a tool</th><th>Before</th><th>After</th></tr></thead><tbody><tr data-note="item-6-row-1" tabindex="0"><td>A fixed key</td><td>yes</td><td>yes</td></tr><tr data-note="item-6-row-2" tabindex="0"><td>An ID and a secret</td><td>yes</td><td>yes</td></tr><tr data-note="item-6-row-3" tabindex="0"><td>An MCP server</td><td>yes</td><td>no: not connected yet</td></tr></tbody></table></div></div></li>
<li class="item card has-view" id="item-7"><div class="words"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>Other modules use Access through their slots.</b> Memory's sign-in is the first. When a project has memory and Access, Access's setup offers to connect them, so memory knows who each person is and what they may see.</div></div></div><div class="view"><div class="stage"><figure class="part" data-kind="draw"><div class="clip"><pre class="art">
<span class="ln" data-note="item-7-line-1" tabindex="0">memory's sign-in slot  ◀── Access fills it</span>
<span class="ln" data-note="item-7-line-2" tabindex="0">a key's level          ──▶ asked of Access</span>
<span class="ln" data-note="item-7-line-3" tabindex="0">an app's tick          ──▶ asked of Access</span></pre></div><figcaption>Drawing</figcaption></figure></div></div></li>
<li class="item card has-view" id="item-8"><div class="words"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>WongStack's own parts move out, and work the same.</b> WongStack's database, the keys its code lists, Project code, the GitHub people on previews, and the app's own actions are WongStack's, not Access's. They move to WongStack's own folders, as memory's database did. Everyone in a WongStack app keeps every person, role, app, and key level, with no step for the owner.</div></div></div><div class="view"><div class="stage"><figure class="part" data-kind="draw"><div class="clip"><pre class="art">
<span class="ln" data-note="item-8-line-1" tabindex="0">stays in WongStack          goes in the module</span>
<span class="ln" data-note="item-8-line-2" tabindex="0">database tables             rules: people, roles,</span>
<span class="ln" data-note="item-8-line-3" tabindex="0">keys in the code              apps, key levels, Admin</span>
<span class="ln" data-note="item-8-line-4" tabindex="0">Project code                the Access page</span>
<span class="ln" data-note="item-8-line-5" tabindex="0">GitHub people on previews   Cloudflare sign-in</span>
<span class="ln" data-note="item-8-line-6" tabindex="0">the app's actions, login    services list, using a key,</span>
<span class="ln" data-note="item-8-line-7" tabindex="0">Cloudflare look-ups           saving keys, adding tools</span></pre></div><figcaption>Drawing</figcaption></figure></div></div></li>
<li class="item card" id="item-9"><div class="words"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>Updates keep your edits.</b> A full WongStack project gets Access with each update, as today. A project with only Access pastes the update message. Your own edits stay, and when an edit and an update touch the same lines, it stops and names each file.</div></div></div></li>
</ol>
</section>
<section id="needs" aria-labelledby="needs-h"><h2 id="needs-h">What the build needs</h2>
<ol class="needs">
<li class="need card" id="need-1" data-need="none"><p><b>Nothing.</b></p></li>
<li class="aside">Non-goals: Project code (install and publish through the app) and GitHub people on previews stay WongStack's; the app's actions and their helper (sign in, list, describe, call) stay with the app; /connect's browser steps are the Browser plan's; a server that runs no JavaScript gets no route from setup; no change to what the Access page shows or does in a WongStack app; no change to the stored people, roles, or levels.</li>
</ol>
</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-11</p>Asked how far the Access module should stand alone → chose any app: the module brings the rules, the page, and a store check; setup adds one route and one sign-in check to the project's own app and database; Cloudflare's sign-in comes ready, and another login fills the sign-in slot.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-11</p>Asked whether Project code is part of the Access module → chose that it stays WongStack's and joins Access through the keys slot.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-11</p>Assumed: GitHub people on previews stay WongStack's with Project code, because both read the project's GitHub and exist only for the change loop.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-11</p>Asked (in the Services chat) whether Services is its own module → chose to fold it into Access: the services list, /connect's key steps, and the <code>services</code>, <code>api</code>, <code>record</code> and <code>key</code> commands; the app's own helper (<code>login</code>, <code>list</code>, <code>describe</code>, <code>call</code>) stays with the app.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-11</p>Asked (in the Services chat) whether to keep MCP servers through the app → chose to remove them: 13 calls in 30 days, and no project has one saved.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-11</p>Asked whether <code>tool add</code> goes with MCP → chose to keep it in Access, so a new tool still works with no publish; only its MCP option goes.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-11</p>Asked whether Services and the MCP removal go in this plan or a second one → chose this plan, with the MCP removal first in the tasks.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-11</p>Assumed: <code>scripts/company-api.mjs</code> hands the moved commands to the module, because skills and habits in three projects call them by that name.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-11</p>Assumed: service definitions, types, and notes pages stay the project's files, named to the module by its slots, because they are the project's own record of each service.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-11</p>Assumed: a stored tool with an MCP setup is ignored after the update and named once in the change record, because no project has one and a strict read must not fail the whole key list.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-11</p>Assumed: &quot;any app&quot; means any server that runs JavaScript (Node, Workers, Bun, Deno), because the module's code is plain JavaScript, as memory's is; elsewhere setup stops and says so.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-11</p>Assumed: the Cloudflare sign-in and its list adapter ship inside the module, because Cloudflare is an outside service, not another WongStack part; the D1 store stays WongStack's, as memory's did.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-11</p>Assumed: the Access page ships as plain JavaScript files with a small bundled screen library and no build step, because any app can then serve the folder as it is, and a project's edits need no rebuild.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-11</p>Assumed: the module is one folder with hooks (a chat-start check and the <code>access</code> skill), because the guide asks every module to ask once at chat start when a part is missing.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-11</p>Assumed: no stored data changes, because WongStack's D1 store reads today's tables.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-12</p>Check: <code>scripts/measure-context.mjs</code> counts a module's <code>references/setup.md</code> as on-call, not as instructions, because the guide stops at its first step in a WongStack install, so no WongStack session reads it. Memory's guide moves out of the total too.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the gate refuses a request with no caller by default, and an optional <code>open</code> slot lets one in, because an app that forgets a sign-in check must not be open; WongStack fills <code>open</code> from its open-until-the-card switch, so its open starter works as today. This replaces the earlier pick that the gate trusts the sign-in.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: <code>serve()</code> answers the page's HTML at each address under <code>/apps/access/</code> that names no <code>.mjs</code> or <code>.css</code> file, and the app serves <code>screen/</code>'s files, because a reload deep in Access must open the page and a Worker can not read the module's folder.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: with no <code>definitions</code> named, the services helper says the keys are not set up and what to fill, before any request, and exits without a failure, because an Access-only project may have no app address to ask.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-12</p>Check: <code>app/src/apps/access/Leaving.test.tsx</code>, <code>app/src/apps/access/levels.test.ts</code>, <code>app/src/apps/access/note.test.ts</code>, <code>app/src/apps/access/Notices.test.tsx</code>, <code>app/src/apps/access/PersonPage.test.tsx</code>, <code>app/src/apps/access/ProjectStep.test.tsx</code>, <code>app/src/apps/access/Pushers.test.tsx</code>, <code>app/src/apps/access/Roles.test.tsx</code>, <code>app/src/apps/access/Services.test.tsx</code>, <code>app/src/apps/access/status.test.ts</code>, <code>app/src/apps/access/style.test.ts</code>, <code>app/src/apps/access/subjects.test.ts</code>, <code>app/src/apps/access/Welcome.test.tsx</code> and <code>app/src/lib/seal.test.ts</code> are removed, because the page moved to the module and its tests moved with it to <code>screen/*.test.mjs</code>, which the app's test run includes.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-12</p>Check: <code>app/worker/api/services.test.ts</code>, <code>app/worker/checked-caller.test.ts</code>, <code>app/worker/employee-access/core.test.ts</code>, <code>app/worker/employee-access/key-levels.test.ts</code>, <code>app/worker/employee-access/keys-route.test.ts</code>, <code>app/worker/employee-access/login-management.test.ts</code> and <code>app/worker/employee-access/tools-route.test.ts</code> are removed, because their code moved to the module's <code>server/</code> and <code>signin/</code>, and their tests moved beside it; the hand-built-caller guard is in the module's tests.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-12</p>Check: <code>scripts/tests/lib-openapi.test.mjs</code>, <code>scripts/tests/lib-scrub.test.mjs</code> and <code>scripts/tests/lib-services.test.mjs</code> are removed, because their code moved to the module's <code>scripts/lib/</code>, tested by <code>scripts/tests/access-openapi.test.mjs</code>, <code>access-scrub.test.mjs</code> and <code>access-services-lib.test.mjs</code>.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-12</p>Check: <code>app/worker/api/forward-mcp.test.ts</code>, <code>app/worker/api/mcp.test.ts</code> and <code>scripts/tests/mcp-session.test.mjs</code> are removed, because MCP through the app is removed with the code they tested.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-12</p>Check: <code>app/tsconfig.worker.json</code> drops <code>tests/employee-access/unchecked-caller.ts</code>, because the guard that file fed moved into the module's tests. <code>app/vitest.config.ts</code> adds the module's tests and lets the test server read the repo root, where they sit. <code>app/package.json</code> runs the same service-records check from its new path. <code>app/.oxlintrc.json</code> lets the Access app import the module's page alone. <code>app/knip.jsonc</code> ignores <code>src/lib/utils.ts</code>, the ready-made parts' helper, which no moved screen imports now.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-12</p>Checkpoint: built and reviewed (13 findings fixed, then 1 more); every task but the preview walk (9.3) is done; saving for that walk.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-12</p>Asked: on the preview the checker opens every app and Matthew's own email is the owner, so no walk could show a person without an app being refused; Matthew chose the automatic tests (<code>403</code>, <i>App access denied</i>) as that check's evidence. The walk showed the rest: the Access page's pictures match today's at 390 and 1280 px, a practice-list save and its undo work as the checker, and <code>company-api.mjs services</code> and a Notion <code>users/me</code> look-up through the app answer.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-12</p>Archive checkpoint: every task done, archived as release 54.0.0, and saved for the merge.</li>
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
<div id="viewer" role="dialog" aria-modal="true" aria-label="Full screen" hidden>
  <div class="vtop"><div class="names" role="tablist" aria-label="Pictures"></div><button type="button" class="primary" data-close>✕ Close</button></div>
  <div class="vspace"></div>
  <div class="vfoot"><p class="vhint"></p>
    <span class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button></span>
    <span class="sizes" role="group" aria-label="Width"><button type="button" data-size="0" aria-pressed="true">Phone</button><button type="button" data-size="1" aria-pressed="false">Computer</button></span>
    <a class="try" target="_blank" rel="noopener noreferrer" hidden>Try it ↗</a></div>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" data-actions="[{&quot;name&quot;:&quot;build&quot;,&quot;label&quot;:&quot;Build it&quot;,&quot;done&quot;:&quot;Asked the chat to build.&quot;},{&quot;name&quot;:&quot;publish&quot;,&quot;label&quot;:&quot;Build and publish&quot;,&quot;done&quot;:&quot;Asked the chat to build and publish.&quot;,&quot;confirm&quot;:{&quot;say&quot;:&quot;Goes live, can't be undone.&quot;,&quot;yes&quot;:&quot;Yes, publish&quot;,&quot;ask&quot;:&quot;Build and publish? This goes live and can't be undone.&quot;}}]" hidden>
    <div id="ready-confirm" role="group" hidden><p></p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span></span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    // A browser notice that a resize watcher waited a frame is no script error.
    if (/ResizeObserver loop/.test(e.message)) return;
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  // A preview page shows a finished build: its words name the preview. A review page of other work names its cards.
  const PREVIEW = document.body.getAttribute('data-kind') === 'preview', NAME = PREVIEW ? CHANGE.replace(/-preview$/, '') : CHANGE;
  const REVIEW = document.body.getAttribute('data-kind') === 'review', NOUN = REVIEW ? 'Card' : 'Change', PAGE = REVIEW ? 'page' : 'plan';
  if (PREVIEW) {
    document.title = 'Preview · ' + NAME;
    document.querySelector('.eyebrow').textContent = NAME;
    document.querySelector('h1').textContent = 'Built: look, then publish?';
    document.querySelector('.hint .lead').textContent = 'Tap a picture to see it full screen, then tap it to note it.';
    document.querySelector('.hint .tail').textContent = '';
  }
  if (REVIEW) document.querySelector('.hint .lead').textContent = 'Tap OK or Note on each card, or select words to note them.';
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {}, ok: {}, files: {} };
  // A note on words keeps its quote; a note on a picture spot keeps the picture, the spot in percent, and its name.
  const EXTRA = { quote: 'string', k: 'number', x: 'number', y: 'number', on: 'string' };
  const ok = function (r, id) {
    return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id)
      && Object.keys(EXTRA).every(function (f) { return r[f] === undefined || typeof r[f] === EXTRA[f]; });
  };
  function extraOf(rec) {
    const x = {};
    Object.keys(EXTRA).forEach(function (f) { if (rec && rec[f] !== undefined) x[f] = rec[f]; });
    return x;
  }
  const QID = /^need-\d+-q-\d+$/;
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  function load(text) {
    try {
      const saved = JSON.parse(text || 'null');
      if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
      if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
      if (saved && saved.ok && typeof saved.ok === 'object') {
        data.ok = {};
        Object.keys(saved.ok).forEach(function (id) { if (/^item-\d+$/.test(id) && (saved.ok[id] === true || saved.ok[id] === 'sent')) data.ok[id] = saved.ok[id]; });
      }
      const kept = function (name, fits) {
        if (!saved || !saved[name] || typeof saved[name] !== 'object') return;
        data[name] = {};
        Object.keys(saved[name]).forEach(function (id) { if (QID.test(id) && fits(saved[name][id])) data[name][id] = saved[name][id]; });
      };
      kept('files', function (v) {
        return Array.isArray(v) && v.every(function (f) { return f && /^[0-9a-f]{32}$/.test(f.id) && typeof f.name === 'string' && typeof f.size === 'number' && typeof f.sent === 'boolean'; });
      });
    } catch (e) { /* unreadable notes start empty */ }
  }
  load(store ? store.getItem(KEY) : null);
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture|row)-(\d+))?(?:-(words|spot)-\d+)?$/.exec(id) || [];
    if (m[5]) return Object.assign(where(id.replace(/-(words|spot)-\d+$/, '')), m[5] === 'words' ? { kind: 'words' } : {});
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'line' ? 'drawing line ' + m[4] : m[3] ? m[3] + ' ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: NOUN + ' #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, .more, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    // A table row's cells read joined with a dot. A screen's words sit in many small boxes: join every piece with a space.
    // A picture file, an ad, and a page read as their label.
    const row = el.tagName === 'TR', named = el.getAttribute('data-label');
    const cells = row ? c.querySelectorAll('td') : el.classList.contains('screen') ? texts(c) : el.classList.contains('pic') ? c.querySelectorAll('text') : [c];
    const text = named !== null ? named : Array.prototype.map.call(cells, function (n) { return n.textContent.replace(/\s+/g, ' ').trim(); })
      .join(row ? ' · ' : ' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function texts(c) {
    const found = [], walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) found.push(walk.currentNode);
    return found;
  }
  // A note on words or a spot sits on its base target: words are found again by their quote, a spot by the base's label.
  function find(id, rec) {
    const m = /^(.*)-(words|spot)-\d+$/.exec(id), el = document.querySelector('[data-note="' + (m ? m[1] : id) + '"]');
    if (!el) return null;
    if (m && m[2] === 'words') return textOf(el).indexOf(rec.quote) >= 0 ? el : null;
    return labelOf(el) === rec.label ? el : null;
  }
  function textOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .add, .more'), function (n) { n.parentNode.removeChild(n); });
    return c.textContent.replace(/\s+/g, ' ');
  }
  // A new note on words or a spot takes the next free number on its target.
  function nextId(base, kind) {
    const pre = base + '-' + kind + '-';
    let k = 1;
    data.notes.map(function (n) { return n.id; }).concat(Object.keys(data.drafts)).forEach(function (id) {
      if (id.indexOf(pre) === 0) k = Math.max(k, +id.slice(pre.length) + 1);
    });
    return pre + k;
  }
  // The notes list groups notes by Why, each card, and Decisions.
  function groupOf(id) {
    const m = /^(why|item|decision)-(\d+)/.exec(id) || [];
    return m[1] === 'why' ? [0, 'Why'] : m[1] === 'item' ? [+m[2], NOUN + ' ' + m[2]] : [1e6, 'Decisions'];
  }
  // A row's pin and Note button go in its last cell: a table row holds only cells.
  function slot(el) { return el.tagName === 'TR' ? el.lastElementChild : el; }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }))
      .map(function (id, i) { return [groupOf(id)[0], i, id]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; })
      .map(function (x) { return x[2]; });
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    let group = null;
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec);
      if (groupOf(id)[1] !== group) {
        group = groupOf(id)[1];
        const head = document.createElement('li');
        head.className = 'group'; head.textContent = group;
        $('note-list').appendChild(head);
      }
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        if (rec.x !== undefined) {
          pin.className += ' spot'; pin.style.left = rec.x + '%'; pin.style.top = rec.y + '%';
          el.appendChild(pin);
        } else slot(el).appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      const id = el.getAttribute('data-note');
      // An item's words take their note through the Note button beside OK; a part takes its notes full screen.
      if (el.closest('.art, .stage') || el.matches('.items > .item .text') || el.querySelector('.pin[data-open="' + id + '"]')) return;
      const add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      slot(el).appendChild(add);
    });
    all('.verdict', function (v) {
      const id = v.querySelector('[data-ok]').getAttribute('data-ok'), state = data.ok[id], n = id.slice(5);
      v.querySelector('.tag').hidden = !state;
      v.querySelector('.tag').textContent = state === 'sent' ? 'OK · Sent' : 'OK';
      v.querySelector('[data-ok]').textContent = state ? 'Undo' : 'OK';
      v.querySelector('[data-ok]').setAttribute('aria-label', (state ? 'Undo OK on ' : 'OK ') + NOUN.toLowerCase() + ' ' + n);
      v.querySelector('[data-open]').hidden = !!state;
    });
    const answers = replies();
    all('.form [data-q]', function (q) {
      const id = q.getAttribute('data-q'), held = data.files[id] || [];
      if (!held.length) return;
      if (!$('note-list').querySelector('.group.answers')) $('note-list').insertAdjacentHTML('beforeend', '<li class="group answers">Answers</li>');
      const line = asker(id) + ', "' + q.getAttribute('data-label') + '"', done = !answers.some(function (a) { return a.id === id; });
      $('note-list').insertAdjacentHTML('beforeend', '<li class="entry"><span class="where">' + esc(line) + (done ? '<span class="tag">Sent</span>' : '') + '</span>'
        + esc(held.map(function (f) { return f.name; }).join(', ')) + '</li>');
    });
    if (ids.length || $('note-list').querySelector('.answers')) { const none = $('note-list').querySelector('li.muted'); if (none) none.remove(); }
    drawFiles();
    views.forEach(counts);
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, chipExtra = null, tap = null;
  // True once the inbox opens this page closed, or a tap on it reaches the chat: it takes no note.
  let readOnly = false;
  const pointers = {};
  // `extra` makes the chip start a new note on selected words or a picture spot.
  function showChip(el, x, y, keyboard, extra) {
    if (readOnly) return;
    const id = el.getAttribute('data-note');
    chipFor = el; chipExtra = extra || null;
    chip.textContent = extra && extra.quote ? 'Note' : !extra && (noteOf(id) || data.drafts[id]) ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; chipExtra = null; }
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
    const offer = el && (el.closest('.clip.big') || (e.pointerType === 'mouse' && !el.closest('.stage')));
    if (offer) showChip(el, e.clientX, e.clientY, false, spotAt(el, t.target, e)); else hideChip();
  });
  // A tap on a whole part full screen notes that spot of it, kept in percent so it holds at any size; a drawing's line is a line.
  function spotAt(el, target, e) {
    if (!el.parentNode.classList.contains('big')) return null;
    const r = el.getBoundingClientRect(), fig = el.closest('.part');
    const pct = function (v, size) { return Math.max(0, Math.min(100, Math.round(v / Math.max(1, size) * 100))); };
    return { k: 0, x: pct(e.clientX - r.left, r.width), y: pct(e.clientY - r.top, r.height), on: fig.querySelector('figcaption').firstChild.textContent };
  }
  // Selected words in one note target offer a note on just those words.
  let picking = 0;
  document.addEventListener('selectionchange', function () {
    clearTimeout(picking);
    picking = setTimeout(function () {
      const s = window.getSelection ? window.getSelection() : null;
      if (!s || s.isCollapsed || !s.rangeCount || open) return;
      const range = s.getRangeAt(0), at = range.commonAncestorContainer, host = (at.nodeType === 1 ? at : at.parentNode).closest('[data-note]');
      const quote = s.toString().replace(/\s+/g, ' ').trim().slice(0, 200);
      if (!host || !quote || host.closest('.art, #editor, #viewer') || textOf(host).indexOf(quote) < 0) return;
      const r = range.getBoundingClientRect();
      showChip(host, r.left + r.width / 2, r.bottom, false, { quote: quote });
    }, 150);
  });
  chip.addEventListener('click', function () {
    if (!chipFor) return;
    const id = chipFor.getAttribute('data-note'), extra = chipExtra;
    openEditor(extra ? nextId(id, extra.quote ? 'words' : 'spot') : id, chipFor, extra);
  });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id);
    const el = rec ? find(id, rec) : t.closest('[data-note]') || document.querySelector('[data-note="' + id + '"]');
    if (el && t.classList.contains('entry')) { reveal(el, rec && rec.k); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) {
        const el = chipFor, words = chipExtra && chipExtra.quote;
        hideChip();
        if (words && window.getSelection) window.getSelection().removeAllRanges();
        el.focus();
      }
      else if (view) closeViewer(true);
    } else if (view && !open && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && V.f <= V.lo * 1.001) {
      openViewer(view.c, view.i + (e.key === 'ArrowRight' ? 1 : -1));
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el, extra) {
    if (readOnly) return;
    closeViewer(false); closeEditor(false); hideChip();
    const note = noteOf(id), draft = data.drafts[id];
    if (el) reveal(el, extra ? extra.k : (draft || note || {}).k);
    const quote = extra && extra.quote, clip = quote && quote.length > 60 ? quote.slice(0, 59) + '…' : quote;
    const label = draft ? draft.label : note ? note.label : quote ? 'words "' + clip + '"' : labelOf(el);
    open = { id: id, label: label, el: el, extra: extra || extraOf(draft || note) };
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
    else data.drafts[open.id] = Object.assign({ label: open.label, text: text }, open.extra);
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push(Object.assign({ id: id, label: open.label, text: text }, open.extra));
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length, k = oks().length, a = replies().length;
      copyNotes(function () { toast('Saved and copied ' + plural2(n, k, a) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── OK and Note on each card: an OK is kept with the notes until undone, and goes to the chat with them ──
  all('.items > .item', function (item) {
    const v = document.createElement('div');
    v.className = 'verdict';
    v.innerHTML = '<span class="tag" hidden>OK</span><button type="button" class="btn-ghost" data-ok="' + item.id + '">OK</button>'
      + '<button type="button" class="btn-ghost" data-open="' + item.id + '" aria-label="Note on ' + NOUN.toLowerCase() + ' ' + item.id.slice(5) + '">Note</button>';
    item.appendChild(v);
  });

  // ── the card view: each part sits in a labelled frame, sized by the card's words; a click opens it full screen ──
  const BASE = 13, PAGE_W = [390, 1280], FIRST_SCREEN = 760;
  const WIDE = window.matchMedia ? window.matchMedia('(min-width: 900px)') : { matches: false };
  const later = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (fn) { return setTimeout(fn, 16); };
  const views = [];
  // Each page frame's height, as its page posted it at 1 px tall; and each overflow seen at full height, measured once.
  const pageH = new WeakMap(), pageOver = new WeakMap(), PAGE_MAX = 40000;
  let view = null, queued = false;
  // A resize watcher's work waits for the next frame, so a size it sets never loops back into the same frame.
  function queue() {
    if (queued) return;
    queued = true;
    later(function () { queued = false; views.forEach(layout); if (view && big().paged) fitBig(); });
  }
  // A new width measures a page again from 1 px tall, so a shorter page doesn't keep the old height.
  function pageWidth(f, w) {
    if (f.style.width === w + 'px') return;
    f.style.width = w + 'px'; f.style.height = '1px'; pageH.delete(f);
  }
  // A page or live card drawn w px wide and h px tall, scaled by k; a page keeps the height its page posted.
  function frameAt(p, w, h, k) {
    const f = p.el.querySelector('iframe');
    if (!f) return;
    if (p.kind === 'page') pageWidth(f, w); else { f.style.width = w + 'px'; f.style.height = h + 'px'; }
    f.style.transform = k < 1 ? 'scale(' + k + ')' : '';
    p.el.style.width = w * k + 'px'; p.el.style.height = h * k + 'px';
  }
  // A part's own size: a drawing or picture at the base size, a page or live card at a phone's width.
  function natural(p) {
    if (p.kind === 'page') return { w: PAGE_W[0], h: pageH.get(p.el.querySelector('iframe')) || 200 };
    if (p.kind === 'live') return { w: PAGE_W[0], h: +p.el.getAttribute('data-height') || 640 };
    p.clip.style.setProperty('--f', BASE + 'px');
    return { w: p.el.offsetWidth, h: p.el.offsetHeight };
  }
  // On a computer the parts are as tall as the words, at least 420 px and at most the window, each shrunk whole
  // to fit the row down to about 110 px wide, past which the row scrolls. On a phone each is a small picture.
  function layout(c) {
    const wide = WIDE.matches, bar = document.querySelector('.bar'), verdict = c.item.querySelector('.verdict');
    const H = Math.min(Math.max(420, c.words.offsetHeight + (verdict ? verdict.offsetHeight : 0)), Math.max(240, window.innerHeight - (bar ? bar.offsetHeight : 0) - 32));
    c.el.style.height = wide ? H + 'px' : '';
    const room = wide ? H - 32 - 30 : 112;
    const sized = c.parts.map(function (p) {
      if (p.clip.classList.contains('big')) return null;
      const s = natural(p);
      if (!s.w || !s.h) return null;
      s.p = p;
      s.k = !wide ? (p.paged ? 84 / s.w : Math.min(84 / s.w, 112 / s.h))
        : p.paged ? Math.min(1, room / Math.min(s.h, FIRST_SCREEN)) : Math.min(p.kind === 'draw' ? 1.25 : 1, room / s.h);
      return s;
    }).filter(Boolean);
    if (wide) shrink(sized, c.stage.clientWidth - 32 - 16 * (c.parts.length - 1));
    sized.forEach(function (s) {
      const p = s.p;
      if (p.paged) frameAt(p, s.w, s.h, s.k); else p.clip.style.setProperty('--f', BASE * s.k + 'px');
      const h = s.h * s.k, shown = wide ? Math.min(room, Math.ceil(h)) : 112;
      p.clip.style.height = wide ? shown + 'px' : '';
      p.fig.style.width = wide ? Math.ceil(s.w * s.k) + 2 + 'px' : '';
      p.clip.classList.toggle('tall', h > shown + 2);
    });
  }
  // Parts too wide for the row shrink by one factor; one that would fall under 110 px keeps 110, and the rest share what is left.
  function shrink(sized, row) {
    let small = [], f = 1;
    for (let i = 0; i < sized.length; i += 1) {
      const rest = sized.filter(function (s) { return small.indexOf(s) < 0; });
      f = Math.min(1, (row - 110 * small.length) / Math.max(1, rest.reduce(function (t, s) { return t + s.w * s.k; }, 0)));
      const more = rest.filter(function (s) { return s.w * s.k * f < 110; });
      if (!more.length) break;
      small = small.concat(more);
    }
    sized.forEach(function (s) { s.k *= small.indexOf(s) >= 0 ? Math.min(1, 110 / (s.w * s.k)) : Math.max(f, 0); });
  }
  function counts(c) {
    c.parts.forEach(function (p) {
      const k = p.clip.querySelectorAll('.pin').length;
      p.count.textContent = k ? ' · ' + k : '';
      p.fig.setAttribute('aria-label', p.label + (k ? ', ' + plural(k) : '') + ', open full screen');
    });
  }
  all('.view', function (v) {
    const item = v.closest('.item'), c = { el: v, item: item, stage: v.querySelector('.stage'), words: item.querySelector('.words'),
      try: v.getAttribute('data-try') || '', at: 0, parts: [] };
    Array.prototype.forEach.call(c.stage.children, function (fig) {
      const cap = fig.querySelector('figcaption'), kind = fig.getAttribute('data-kind');
      const p = { fig: fig, clip: fig.querySelector('.clip'), el: fig.querySelector('.clip').firstElementChild, kind: kind, paged: kind === 'page' || kind === 'live', label: cap.textContent };
      p.count = document.createElement('span'); p.count.className = 'count'; cap.appendChild(p.count);
      fig.tabIndex = 0; fig.setAttribute('role', 'button');
      c.parts.push(p);
    });
    c.stage.addEventListener('click', function (e) {
      const fig = e.target.closest('.part');
      if (fig && !e.target.closest('.clip.big, [data-open]')) openViewer(c, partIndex(c, fig));
    });
    c.stage.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('part')) { e.preventDefault(); openViewer(c, partIndex(c, e.target)); }
    });
    if (window.ResizeObserver) { const watch = new ResizeObserver(queue); watch.observe(c.words); watch.observe(c.stage); }
    views.push(c);
  });
  const partIndex = function (c, fig) { return c.parts.map(function (p) { return p.fig; }).indexOf(fig); };
  // A picture file is as wide in em as its file is in px, so it scales like a drawing.
  all('.art.photo img', function (img) {
    const size = function () { if (img.naturalWidth) { img.style.width = img.naturalWidth / BASE + 'em'; queue(); } };
    if (img.complete) size(); else img.addEventListener('load', size);
  });
  // A note's target shows: folded words unfold.
  function reveal(el) {
    folds.forEach(function (f) { if (f.text === el && !f.open) { f.open = true; measure(f); } });
  }

  // ── full screen: one part over everything, the card's labels on top, its changes at the foot; it zooms and scrolls natively ──
  const vtop = viewer.querySelector('.vtop'), vfoot = viewer.querySelector('.vfoot'), names = viewer.querySelector('.names');
  const vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button'), sizes = viewer.querySelector('.sizes'), tryIt = viewer.querySelector('.try');
  const V = { f: BASE, lo: BASE, hi: BASE };
  const HINTS = { draw: ['Drag to move · pinch or + to zoom', 'tap a line or picture to note it'], photo: ['Pinch or + to zoom', 'tap a spot to note it'],
    page: ['Scroll to read', 'tap a spot to note it'], live: ['Try it here: it sends nothing', ''] };
  function big() { return view && view.c.parts[view.i]; }
  function scale(f, cx, cy) {
    const box = big().clip;
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (box.scrollLeft + cx) * k - cx, y = (box.scrollTop + cy) * k - cy;
    V.f = f; box.style.setProperty('--f', f + 'px');
    box.scrollLeft = x; box.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  // A drawing fits the screen's width; a picture fits whole; a page or live card shows at the picked width, shrunk to fit.
  function fitBig() {
    const p = big();
    root.style.setProperty('--vtop', vtop.offsetHeight + 'px'); root.style.setProperty('--vfoot', vfoot.offsetHeight + 'px');
    const aw = p.clip.clientWidth - 24, ah = p.clip.clientHeight - 24;
    V.f = V.lo = V.hi = BASE;
    if (p.paged) {
      const w = PAGE_W[view.c.at], k = Math.min(1, aw / w), f = p.el.querySelector('iframe');
      frameAt(p, w, p.kind === 'live' ? ah / k : pageH.get(f) || ah / k, k);
      return;
    }
    p.clip.style.setProperty('--f', BASE + 'px');
    const w = p.el.offsetWidth, h = p.el.offsetHeight;
    if (!w || !h || aw <= 0) return;
    V.lo = BASE * (p.kind === 'draw' ? aw / w : Math.min(aw / w, ah / h)); V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    p.clip.scrollLeft = p.clip.scrollTop = 0;
    scale(V.lo, 0, 0);
  }
  function openViewer(c, i) {
    hideChip();
    if (view) big().clip.classList.remove('big');
    view = { c: c, i: (i + c.parts.length) % c.parts.length };
    const p = big(), hint = HINTS[p.kind];
    viewer.hidden = false; document.body.classList.add('viewing');
    names.innerHTML = c.parts.map(function (q, k) {
      return '<button type="button" class="name" role="tab" data-i="' + k + '" aria-selected="' + (k === view.i) + '">' + esc(q.label) + '</button>';
    }).join('');
    viewer.querySelector('.vhint').innerHTML = esc(hint[0]) + (hint[1] ? '<span class="note-it"> · ' + esc(hint[1]) + '</span>' : '');
    vbar.hidden = p.paged; sizes.hidden = !p.paged; tryIt.hidden = !c.try;
    if (c.try) tryIt.href = c.try;
    Array.prototype.forEach.call(sizes.children, function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-size') === c.at)); });
    p.clip.classList.add('big');
    layout(c); fitBig();
    viewer.querySelector('[data-close]').focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const c = view.c, p = big();
    p.clip.classList.remove('big'); p.clip.scrollLeft = p.clip.scrollTop = 0;
    view = null; c.at = 0;
    viewer.hidden = true; document.body.classList.remove('viewing');
    layout(c); bar();
    if (restore) p.fig.focus({ preventScroll: true });
  }
  viewer.querySelector('[data-close]').addEventListener('click', function () { closeViewer(true); });
  names.addEventListener('click', function (e) { const b = e.target.closest('[data-i]'); if (b) openViewer(view.c, +b.getAttribute('data-i')); });
  sizes.addEventListener('click', function (e) {
    const b = e.target.closest('[data-size]');
    if (!b) return;
    view.c.at = +b.getAttribute('data-size');
    Array.prototype.forEach.call(sizes.children, function (s) { s.setAttribute('aria-pressed', String(s === b)); });
    fitBig();
  });
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target), box = big().clip;
    if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], box.clientWidth / 2, box.clientHeight / 2);
  });
  const zoomable = function (e) { return view && !big().paged && e.target.closest && e.target.closest('.clip.big'); };
  document.addEventListener('wheel', function (e) {
    if (!zoomable(e) || (!e.ctrlKey && !e.metaKey)) return;
    e.preventDefault();
    const r = big().clip.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively, or swipes to the next part at fit; two fingers pinch around their midpoint.
  // A swipe starts only on the shown part, so a swipe along the scrolling label row keeps the part.
  let pinch = null, swipe = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  document.addEventListener('touchstart', function (e) {
    const t = e.touches, on = e.target.closest && e.target.closest('.clip.big');
    swipe = view && on && t.length === 1 ? { x: t[0].clientX, y: t[0].clientY } : null;
    if (zoomable(e) && t.length === 2) pinch = { f: V.f, dist: span(t) };
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = big().clip.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  document.addEventListener('touchend', function (e) {
    const s = swipe, t = e.changedTouches[0];
    if (e.touches.length < 2) pinch = null;
    swipe = null;
    if (!s || !view || !t || V.f > V.lo * 1.001) return;
    const dx = t.clientX - s.x;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(t.clientY - s.y)) openViewer(view.c, view.i + (dx < 0 ? 1 : -1));
  });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });

  // ── page parts: a page posts its height at 1 px tall; a cover over it takes taps ──
  // A page frame is sealed from this page, so the kit's one script in it posts its height, and the link under a point.
  // Only a message from one of this page's own page frames counts; a height for an old width is dropped.
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (!m || (m.type !== 'review:page' && m.type !== 'review:link')) return;
    const f = Array.prototype.find.call(document.querySelectorAll('.page iframe'), function (x) { return x.contentWindow === e.source; });
    if (!f) return;
    if (m.type === 'review:link') {
      const cover = f.parentNode.querySelector('.cover'), href = typeof m.href === 'string' ? m.href.slice(0, 2000) : '';
      if (cover) { cover.title = href; cover.style.cursor = href ? 'pointer' : ''; }
      return;
    }
    if (typeof m.h !== 'number' || !isFinite(m.h) || typeof m.vh !== 'number' || m.w + 'px' !== f.style.width) return;
    const h = Math.max(1, Math.min(PAGE_MAX, Math.round(m.h)));
    // A height counts only when measured 1 px tall; a page past its full-height frame grew late, so it measures again.
    if (m.vh > 1) {
      if (m.vh === pageH.get(f) && h > m.vh && pageOver.get(f) !== h) { pageOver.set(f, h); f.style.height = '1px'; }
      return;
    }
    pageH.set(f, h); f.style.height = h + 'px';
    if (!f.parentNode.querySelector('.cover')) f.parentNode.insertAdjacentHTML('beforeend', '<span class="cover"></span>');
    queue();
  });
  // A link in a page goes nowhere: hovering over it shows its address.
  document.addEventListener('mousemove', function (e) {
    const cover = e.target.classList && e.target.classList.contains('cover') ? e.target : null, f = cover && cover.parentNode.querySelector('iframe');
    if (!f || !f.contentWindow) return;
    const r = cover.getBoundingClientRect(), k = r.width / f.offsetWidth;
    f.contentWindow.postMessage({ type: 'review:point', x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }, '*');
  });

  // ── long words fold after about two lines behind More, on a phone only; a note on hidden words unfolds them ──
  const folds = [];
  function measure(f) {
    // The fold never cuts the bold first sentence: it keeps at least the lines that sentence takes.
    f.text.classList.remove('folded');
    f.more.style.top = '';
    if (WIDE.matches) { f.more.hidden = true; return; }
    const lead = f.clamp.querySelector(':scope > b:first-child'), line = parseFloat(getComputedStyle(f.clamp).lineHeight) || 24;
    const leadLines = lead ? Math.ceil((lead.getBoundingClientRect().bottom - f.clamp.getBoundingClientRect().top - 1) / line) : 0;
    f.clamp.style.webkitLineClamp = String(Math.max(2, leadLines));
    f.text.classList.add('folded');
    const long = f.clamp.scrollHeight > f.clamp.clientHeight + 2;
    f.text.classList.toggle('folded', long && !f.open);
    f.more.hidden = !long;
    f.more.textContent = f.open ? 'Less' : 'More';
    f.more.setAttribute('aria-expanded', String(f.open));
    // Folded, More sits on the last shown line, at its end.
    if (long && !f.open) f.more.style.top = f.clamp.offsetTop + f.clamp.clientHeight - line + 'px';
  }
  all('.items > .item .text', function (text) {
    const clamp = document.createElement('span'), more = document.createElement('button'), f = { text: text, clamp: clamp, more: more, open: false };
    clamp.className = 'clamp';
    while (text.firstChild) clamp.appendChild(text.firstChild);
    text.appendChild(clamp);
    more.type = 'button'; more.className = 'more';
    text.appendChild(more);
    more.addEventListener('click', function () { f.open = !f.open; measure(f); });
    folds.push(f);
    measure(f);
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump(hash) {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(typeof hash === 'string' ? hash : location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return Object.assign({ id: n.id, label: n.label, text: n.text }, extraOf(n)); }); }
  // An OK not yet in the chat, as its card's id, in card order.
  function oks() {
    return Object.keys(data.ok).filter(function (id) { return data.ok[id] === true; }).sort(function (a, b) { return a.slice(5) - b.slice(5); });
  }
  function acknowledge(notes, okd, ans) {
    ans.forEach(function (a) {
      (data.files[a.id] || []).forEach(function (f) { if (a.files.indexOf(f.id) >= 0) f.sent = true; });
    });
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    okd.forEach(function (id) { if (data.ok[id] === true) data.ok[id] = 'sent'; });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id), spot = n.x === undefined ? '' : ', spot at ' + n.x + '% across and ' + n.y + '% down on "' + n.on + '"';
      return '- ' + w.spot + spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  // What goes to the chat: each OK on its own line, then the notes.
  function lines(notes, okd, ans) {
    return okd.map(function (id) { return NOUN + ' #' + id.slice(5) + ': OK'; }).concat(ans.map(function (a) { return a.line; }), bullets(notes)).join('\n');
  }
  function notesText() {
    const header = REVIEW ? document.body.getAttribute('data-header')
      : PREVIEW ? 'Notes on the preview of ' + NAME + ' from its review page. Don\'t publish yet.'
      : 'Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.';
    return header + '\n' + lines(unsent(), oks(), replies());
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  function plural2(n, k, a) {
    const parts = n || !(k || a) ? [plural(n)] : [];
    if (k) parts.push(k + (k === 1 ? ' OK' : ' OKs'));
    if (a) parts.push(a + (a === 1 ? ' answer' : ' answers'));
    return parts.join(' and ');
  }
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
    if (unsent().length || oks().length || replies().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
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
    if (hosted) return hostedAsk(path, body);
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), okd = oks(), ans = replies(), n = notes.length, k = okd.length, a = ans.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural2(n, k, a) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const body = { text: lines(notes, okd, ans) };
      if (fileIds(ans).length) body.files = fileIds(ans);
      const r = await ask('send', live, body);
      const changed = 'The ' + PAGE + ' changed. Reload to read it first.';
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (r.status === 409) { const why = ((await r.json()) || {}).gone ? GONE : changed; says(why); toast(why); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes, okd, ans);
      says('Sent ' + plural2(n, k, a) + ' to the chat.');
      toast('Sent ' + plural2(n, k, a) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length, k = oks().length, a = replies().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural2(n, k, a) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  document.addEventListener('click', function (e) {
    const b = e.target.closest ? e.target.closest('[data-ok]') : null;
    if (!b) return;
    const id = b.getAttribute('data-ok');
    if (data.ok[id]) delete data.ok[id]; else data.ok[id] = true;
    persist();
  });

  // ── the page's own buttons, from the builder; one that can't be undone asks once more above the footer ──
  let version = null, confirming = null;
  const ACTIONS = JSON.parse($('ready').getAttribute('data-actions') || '[]');
  const actionOf = function (name) { return ACTIONS.filter(function (a) { return a.name === name; })[0] || null; };
  const choice = function (name) { return $('ready').querySelector('[data-ready="' + name + '"]'); };
  ACTIONS.forEach(function (a) {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('data-ready', a.name); b.setAttribute('data-label', a.label);
    if (a.confirm) { b.textContent = a.label; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'ready-confirm'); }
    else b.innerHTML = '<span class="spinner" hidden aria-hidden="true"></span><span></span>';
    $('ready').insertBefore(b, $('ready-confirm'));
  });
  function fillConfirm(a) {
    confirming = a;
    $('ready-confirm').querySelector('p').textContent = a.confirm.say;
    $('ready-confirm').setAttribute('aria-label', a.confirm.ask);
    choice('yes').setAttribute('data-label', a.confirm.yes);
  }
  if (ACTIONS.filter(function (a) { return a.confirm; }).length) fillConfirm(ACTIONS.filter(function (a) { return a.confirm; })[0]);
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (focus && wasOpen && !$('ready').hidden && confirming) choice(confirming.name).focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    const gate = drawNeeds();
    all('#ready > [data-ready]', function (b) {
      if (!b.querySelector('.spinner')) b.textContent = gate || b.getAttribute('data-label');
    });
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready'), spinner = b.querySelector('.spinner');
      const active = !!spinner && pending === (step === 'yes' ? confirming && confirming.name : step);
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(active));
      if (spinner) {
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : (b.parentNode === $('ready') && gate) || b.getAttribute('data-label');
      }
    });
    const shown = $('ready').hidden ? 0 : $('ready').querySelectorAll('#ready > button:not([hidden])').length;
    el.style.setProperty('--cols', String(Math.min(3, 1 + shown)));
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  // Each button shows when the link offers it; the choices stay hidden when it offers none.
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || typeof answer.version !== 'string') return;
    const shown = ACTIONS.filter(function (a) {
      choice(a.name).hidden = names.indexOf(a.name) < 0;
      return names.indexOf(a.name) >= 0;
    });
    if (!shown.length) return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot(), okd = oks(), ans = replies();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length || okd.length || ans.length) body.text = lines(notes, okd, ans);
      if (fileIds(ans).length) body.files = fileIds(ans);
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? actionOf(name).done
        : r.status === 409 && a.changed === true ? 'The ' + PAGE + ' changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : r.status === 409 && a.gone === true ? GONE : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes, okd, ans);
      // A gone file keeps the buttons, as a 429 does: the person picks it again and taps once more.
      if (line !== GONE) hideActions();
      says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready'), a = actionOf(step), gaps = needsOpen();
    // While the build needs the person, a go button leads to the first thing it needs instead.
    if (a && gaps.length) {
      all('.hit', function (n) { n.classList.remove('hit'); });
      gaps[0].classList.add('hit'); gaps[0].scrollIntoView({ block: 'center' });
      return;
    }
    if (step === 'yes') act(confirming.name);
    else if (step === 'cancel' || a.confirm) {
      says('');
      if (a) fillConfirm(a);
      $('ready-confirm').hidden = step === 'cancel';
      all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', String(b === button)); });
      bar();
      choice(step === 'cancel' ? confirming.name : 'cancel').focus({ preventScroll: true });
    } else act(step);
  });

  // ── answers: the files a need asks for, sent with the notes under their question; a sent file never goes again ──
  const asker = function (id) { return 'Need #' + /^need-(\d+)/.exec(id)[1]; };
  function answered(q) { const id = q.getAttribute('data-q'); return !!(data.files[id] && data.files[id].length); }
  // Each question with files the chat has not got yet, in page order: its id, its line, and the files it names.
  function replies() {
    const out = [];
    all('.form [data-q]', function (q) {
      const id = q.getAttribute('data-q'), fresh = (data.files[id] || []).filter(function (f) { return !f.sent; });
      if (fresh.length) out.push({ id: id, files: fresh.map(function (f) { return f.id; }),
        line: '- ' + asker(id) + ', "' + q.getAttribute('data-label') + '": ' + fresh.map(function (f) { return f.name; }).join(', ') });
    });
    return out;
  }
  const fileIds = function (ans) { return ans.reduce(function (ids, a) { return ids.concat(a.files); }, []); };

  // ── files: checked here first, then sent at once through the link or the inbox; a send later names them by id ──
  const MB = 1024 * 1024, uploads = {}, waiting = {};
  let refs = 0;
  function upload(file, question) {
    if (hosted) {
      return file.arrayBuffer().then(function (buf) {
        return new Promise(function (resolve) {
          const ref = 'f' + (refs += 1);
          waiting[ref] = resolve;
          port.postMessage({ type: 'inbox:file', ref: ref, name: file.name, question: question, data: buf }, [buf]);
        });
      });
    }
    return fetch('file', { method: 'POST', cache: 'no-store', body: file,
      headers: { 'x-reply-key': live, 'x-file-name': encodeURIComponent(file.name), 'x-file-question': encodeURIComponent(question) } })
      .then(function (r) { return r.json().then(function (a) { return r.ok && a && /^[0-9a-f]{32}$/.test(a.id) ? { id: a.id } : { error: (a && a.error) || 'it was not sent; try again' }; }); })
      .catch(function () { return { error: 'it was not sent; try again' }; });
  }
  // The app deletes a file a day after it came, or with a tap that failed or was cancelled: one this page holds unsent
  // and the app no longer does goes back to its question, to be picked again.
  const GONE = 'A file is no longer held. Pick it again, then send.';
  function keepHeld(held) {
    let gone = 0;
    Object.keys(data.files).forEach(function (id) {
      data.files[id] = data.files[id].filter(function (f) {
        if (f.sent || held.indexOf(f.id) >= 0) return true;
        gone += 1;
        (uploads[id] = uploads[id] || []).push({ name: f.name, size: f.size, state: 'refused', why: 'the app no longer holds it; pick it again' });
        return false;
      });
    });
    if (gone) persist();
  }
  function bytesHeld() {
    return Object.keys(data.files).concat(Object.keys(uploads)).reduce(function (sum, id) {
      return sum + (data.files[id] || []).concat(uploads[id] || []).reduce(function (s, f) { return s + (f.state === 'refused' ? 0 : f.size); }, 0);
    }, 0);
  }
  function refusal(q, file) {
    const id = q.getAttribute('data-q'), ext = (/\.([a-z0-9]+)$/i.exec(file.name) || [])[1];
    const kept = (data.files[id] || []).length + (uploads[id] || []).filter(function (f) { return f.state === 'sending'; }).length;
    if (!live) return 'open this page from the chat\'s link to send files';
    if (!ext || q.getAttribute('data-types').split(',').indexOf(ext.toLowerCase()) < 0) return 'this question does not take this type of file';
    if (file.size > 25 * MB) return 'too big: 25 MB at most';
    if (kept >= +q.getAttribute('data-count')) return 'this question takes ' + q.getAttribute('data-count') + ' at most';
    if (bytesHeld() + file.size > 100 * MB) return 'the files for this page pass 100 MB';
    return '';
  }
  function send(q, entry) {
    const id = q.getAttribute('data-q');
    entry.state = 'sending'; entry.why = ''; render();
    upload(entry.file, asker(id) + ', "' + q.getAttribute('data-label') + '"').then(function (a) {
      if (a.id) {
        uploads[id] = uploads[id].filter(function (f) { return f !== entry; });
        (data.files[id] = data.files[id] || []).push({ id: a.id, name: entry.file.name, size: entry.file.size, sent: false });
        persist();
      } else { entry.state = 'refused'; entry.why = String(a.error); entry.retry = true; render(); }
    });
  }
  function pick(q, list) {
    const id = q.getAttribute('data-q');
    Array.prototype.forEach.call(list, function (file) {
      const why = refusal(q, file), entry = { file: file, name: file.name, size: file.size, state: why ? 'refused' : 'sending', why: why };
      (uploads[id] = uploads[id] || []).push(entry);
      if (!why) send(q, entry);
    });
    render();
  }
  const sizeText = function (n) { return n < MB ? Math.max(1, Math.ceil(n / 1024)) + ' KB' : (n / MB).toFixed(1) + ' MB'; };
  function drawFiles() {
    all('.form [data-kind="file"]', function (q) {
      const id = q.getAttribute('data-q'), list = q.querySelector('.files');
      list.innerHTML = (data.files[id] || []).map(function (f, i) {
        return '<li>' + esc(f.name) + ' · ' + sizeText(f.size) + ' <span class="tag">Sent</span><button type="button" class="btn-ghost" data-file="' + i + '">Remove</button></li>';
      }).concat((uploads[id] || []).map(function (f, i) {
        return '<li>' + esc(f.name) + ' · ' + sizeText(f.size) + (f.state === 'sending' ? ' <span class="muted">Sending…</span>'
          : ' <span class="why">Refused: ' + esc(f.why) + '</span>' + (f.retry ? '<button type="button" class="btn-ghost" data-retry="' + i + '">Retry</button>' : '')
            + '<button type="button" class="btn-ghost" data-drop="' + i + '">Remove</button>') + '</li>';
      })).join('');
    });
  }
  all('.form [data-kind="file"]', function (q) {
    const drop = q.querySelector('.drop'), input = drop.querySelector('input');
    input.addEventListener('change', function () { pick(q, input.files); input.value = ''; });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); pick(q, e.dataTransfer.files); });
    q.querySelector('.files').addEventListener('click', function (e) {
      const b = e.target.closest('button'), id = q.getAttribute('data-q');
      if (!b) return;
      if (b.hasAttribute('data-file')) { data.files[id].splice(+b.getAttribute('data-file'), 1); persist(); return; }
      const entry = uploads[id][+(b.getAttribute('data-retry') || b.getAttribute('data-drop'))];
      if (b.hasAttribute('data-retry')) send(q, entry);
      else { uploads[id] = uploads[id].filter(function (f) { return f !== entry; }); render(); }
    });
  });

  // ── what the build needs: an item that needs you counts until each of its questions has an answer ──
  function needsOpen() {
    return Array.prototype.filter.call(document.querySelectorAll('.need[data-need="needs"]'), function (n) {
      const qs = n.querySelectorAll('[data-q]');
      return !qs.length || Array.prototype.some.call(qs, function (q) { return !answered(q); });
    });
  }
  function drawNeeds() {
    const gaps = needsOpen();
    all('.need[data-need="needs"]', function (n) {
      const done = gaps.indexOf(n) < 0, tag = n.querySelector('.tag-outline, .tag');
      tag.className = done ? 'tag' : 'tag-outline';
      tag.textContent = done ? 'Answered' : 'Needs you';
    });
    return gaps.length ? gaps.length + (gaps.length === 1 ? ' thing needs you' : ' things need you') : '';
  }

  // ── live cards: the chat's own page in a sealed frame, to try; it sends this page nothing ──
  // A frame loads once; a second load means its page went somewhere else, so it starts again from its own copy.
  const cards = [];
  function mount(c) {
    const f = document.createElement('iframe');
    let loads = 0;
    f.setAttribute('sandbox', 'allow-scripts'); f.title = c.title; f.setAttribute('srcdoc', c.doc);
    f.addEventListener('load', function () {
      loads += 1;
      if (loads === 1) return;
      c.resets += 1;
      c.said.hidden = false;
      c.said.textContent = 'This card tried to leave the page.' + (c.resets > 2 ? ' Reload the page to try it again.' : '');
      if (c.resets > 2) f.remove(); else mount(c);
    });
    c.box.replaceChildren(f);
    queue();
  }
  // The card's view sizes the frame; a live card never moves, since a moved frame loads again.
  all('.live[data-live]', function (box) {
    const old = box.querySelector('iframe'), said = document.createElement('p');
    said.className = 'muted live-said'; said.setAttribute('role', 'status'); said.hidden = true;
    const c = { box: box, doc: old.getAttribute('srcdoc'), title: old.title, said: said, resets: 0 };
    box.closest('.item').querySelector('.words').appendChild(said);
    cards.push(c);
    mount(c);
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      folds.forEach(measure);
    }
    queue();
    if (view) fitBig();
    if (open) place();
    bar();
  });
  window.addEventListener('load', queue);
  // ── hosted: in the live app's inbox, a sealed frame that reaches the inbox only through the port its first greeting carries ──
  let hosted = null, port = null;
  const CODES = { sent: 200, changed: 409, done: 409, gone: 409, soon: 429, closed: 410, expired: 410 };
  function post(message) { port.postMessage(message); }
  // The inbox answers a tap only once the chat has it, or once it is refused, cancelled or failed.
  function hostedAsk(path, body) {
    return new Promise(function (resolve) {
      hosted.reply = function (state) {
        const status = Object.prototype.hasOwnProperty.call(CODES, state) ? CODES[state] : 502;
        const answer = status === 200 ? { sent: true } : state === 'changed' || state === 'done' || state === 'gone' ? { [state]: true } : { sent: false };
        resolve({ ok: status === 200, status: status, json: function () { return Promise.resolve(answer); } });
      };
      const tap = { type: 'inbox:tap', action: path === 'send' ? 'send' : body.action, text: body.text || '' };
      if (body.files) tap.files = body.files;
      post(tap);
    });
  }
  // The inbox's switch owns the look: this frame can't remember a choice, so its own switch goes. Unknown looks change nothing.
  function look(theme) { if (theme === 'light' || theme === 'dark') document.documentElement.classList.toggle('dark', theme === 'dark'); }
  function heard(m) {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'inbox:theme') look(m.theme);
    else if (m.type === 'inbox:notes' && (typeof m.value === 'string' || m.value === null)) {
      load(m.value);
      if (hosted.held) keepHeld(hosted.held);
      hosted.held = null; render();
    } else if (hosted.reply && m.type === 'inbox:result') {
      if (Array.isArray(m.files)) keepHeld(m.files);
      const reply = hosted.reply; hosted.reply = null; reply(m.state);
      // A tap that reached the chat closes the page in the inbox, so it reads as answered now, as its Archive shows it.
      if (m.state === 'sent') closePage();
    } else if (m.type === 'inbox:file-result' && waiting[m.ref]) {
      const done = waiting[m.ref];
      delete waiting[m.ref];
      done(typeof m.id === 'string' && /^[0-9a-f]{32}$/.test(m.id) ? { id: m.id } : { error: typeof m.error === 'string' ? m.error : 'it was not sent; try again' });
    }
  }
  // Back and the workspace sit first in the page, so they scroll away with its words; the inbox's own bar stays put.
  function backRow(workspace) {
    const row = document.createElement('div'), back = document.createElement('button');
    row.className = 'back'; back.type = 'button'; back.className = 'btn-ghost'; back.textContent = 'Back';
    back.addEventListener('click', function () { post({ type: 'inbox:back' }); });
    row.appendChild(back);
    if (typeof workspace === 'string' && workspace) {
      const where = document.createElement('span');
      where.className = 'muted'; where.textContent = workspace; row.appendChild(where);
    }
    document.querySelector('main > header').prepend(row);
  }
  // A closed or answered page in the inbox is read-only: no button, no note, no answer or file.
  function closePage() {
    readOnly = true; document.body.classList.add('read-only');
    all('.form input', function (el) { el.disabled = true; });
    render();
  }
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (hosted || window.parent === window || e.source !== window.parent || !e.ports || !e.ports[0] || !m || m.type !== 'inbox:hello'
      || typeof m.version !== 'string' || !Array.isArray(m.actions)) return;
    // The files the app still holds for this page, checked once its notes arrive.
    hosted = { reply: null, held: Array.isArray(m.files) ? m.files : null };
    port = e.ports[0];
    port.onmessage = function (ev) { heard(ev.data); };
    document.querySelectorAll('.theme-toggle').forEach(function (button) { button.remove(); });
    look(m.theme);
    // Notes live with the inbox page: this frame has no storage of its own.
    store = { setItem: function (key, value) { post({ type: 'inbox:notes-set', key: key, value: value }); } };
    post({ type: 'inbox:notes-get', key: KEY });
    backRow(m.workspace);
    if (m.readOnly === true) { closePage(); return; }
    setLive('inbox'); offer(m); render();
  });
  // In a frame, a link opens its own tab and a # link scrolls in place: the frame never leaves this page.
  // A srcdoc page resolves #why against the inbox's address, so following it would load the inbox here.
  document.addEventListener('click', function (e) {
    const a = window.parent !== window && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.charAt(0) !== '#') { a.target = '_blank'; a.rel = 'noopener noreferrer'; return; }
    e.preventDefault();
    if (href.charAt(1) === '/') { jump(href); return; }
    let el = null;
    try { el = document.getElementById(decodeURIComponent(href.slice(1))); } catch (err) { /* a bad escape names nothing */ }
    if (el) el.scrollIntoView({ block: 'start' });
  }, true);
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
