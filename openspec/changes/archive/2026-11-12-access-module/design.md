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
