# Access, with its keys and services, becomes a module any app can add

**Status:** in-progress
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
