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
- [ ] 9.3 `/save`, then walk the preview: the Access page's pictures match today's, a save on the practice list works as the checker, a person without an app is refused, and `company-api.mjs services` and one look-up answer.
