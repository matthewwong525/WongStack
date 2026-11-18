<!-- openspec-archive v1 2026-11-06-service-definitions -->
<!-- file proposal.md utf8 13894 -->
# One definition per outside service, and a services skill

**Status:** ready-to-ship
**Branch:** improve-integration-testing-setup
**Open questions:** none.

## Why

Any test that calls an outside service, such as Notion or Stripe, fails at once, so code that talks to those services has no test at all. The AI learns each service only from notes in plain words and never sees a real answer. One past chat skipped even those notes: nothing points it there at the moment it acts.

## What Changes

- **Each outside service gets one definition, kept with the code, that tests, code and the AI all read.** A folder per service holds a file of only the calls we have made, in the standard API format (OpenAPI), and real example answers. We build each call from our own use, never copy it from the service's own published file, so the file shows how we use the service, odd parts included. Each call says in plain words what we use it for and how, in the same place every time. Tests replay the examples, so adding a call to a service gives its tests the answer too, with no test file to change. The notes page keeps what is about the whole service, such as how its key is made.
  ```text
  schema/services/notion/
    openapi.json   only the calls we use
    examples/      real answers, made safe
  wiki/services/notion.md
                 key, access, limits
  ```
- **The AI reads a short view of a service, never the long file.** A command reads the definition and prints only what a call needs: one line per call, then for one call how we use it, what to send and the fields that come back. A services skill every chat can see sends the AI there before it calls a service or writes code for one.
  ```text
  $ node scripts/company-api.mjs api notion
  POST search          Search pages and databases
  GET  pages/{id}      Read one page

  $ node scripts/company-api.mjs api notion search
  POST search — Search pages and databases
    We sort by last edit for the newest.
    send { query?, page_size? }
    answer 200 { results: { id, url }[],
                 has_more }
    example: examples/search.json
  ```
- **Example answers come from real use, with private details swapped.** One command asks the service through the app, with your sign-in, so no key reaches your computer. It sends only look-ups. A change's answer is kept only from a change you already made for real work, never sent again just to save it. Before saving, emails, names, IDs and free text become made-up values with the same shape. A check blocks any example that still looks private, or that no longer fits its call.
  ```mermaid
  flowchart TD
    A["A look-up, or a change already made"] --> B["Swap private details"]
    B --> C["Save as an example"]
    C --> D["Tests replay it"]
    C --> E["Definition gains the call"]
  ```
- **Code that reads a service's answer is checked against its definition.** Each service's definition makes a types file. If code reads a field the service doesn't send, the type check fails and names it, so the AI need not remember the notes.
- **The definition grows as chats and skills use a service.** When a chat makes a call the definition lacks, the helper says so and gives the one command to add it. The chat then writes what the call is for and how we use it; a check blocks a call left without that. The next chat sees the call in the short view.
- **The app's own API description and the service files use the same version and the same way of writing a call.** Both move to OpenAPI 3.2.0, the newest version. Each call has the same parts on both sides: a name, a one-line purpose, how it is used, and whether it only looks or changes something. The same short view shows the app's own calls: `api company`. It reads them from the app each time, so nothing is saved that could go stale, and each person sees only the calls they may use.
- **A refresh command shows when a service changes what it sends.** It asks each saved look-up again and lists any answer that no longer fits its call. Then it saves the new answers, private details swapped. A look-up whose request holds a made-up value, such as a page ID, is never sent: it would ask for something else. A test that then fails means our code needs to catch up. You can later schedule it weekly.
  ```text
  saved again  notion/search
  not checked  stripe/refund (a real change)
  not checked  notion/get-page (its request was made up)
  doesn't fit  notion/search: answer.body.has_more: missing
  ```
- **Test chats prove the AI uses it.** Before publishing, a few fresh chats get real tasks, such as finding the newest Notion page and adding an action that lists Notion pages. Each must read the short view before it acts, never the long file, and its code must pass the type check.

Non-goals: calling live services in tests, a weekly refresh routine, sending a change to save it, copying calls from a service's published file, and changing which actions the app's own API description lists.

## What the build needs

- **Notion key**: Ready. The app holds it with Read, so the build saves one real Notion look-up to prove the full path.

## Capabilities

### New Capabilities

- `service-definitions`: one definition per outside service (OpenAPI with only the calls used, plus scrubbed examples) read by tests, types and the AI; a short view and search for the AI; a services skill every session can find; saving examples through the company app without sending a change; checks for private data and fit; a prompt to add a missing call; playback in runtime tests; refresh.

### Modified Capabilities

- `agent-api-discovery`: the app's own API description moves from OpenAPI 3.1 to 3.2.

## Impact

- `scripts/company-api.mjs`: `api` (list, one call), `record` (`--file -`, `--last`, `--refresh`), call counts in `services`, and a *not added yet* hint after a direct call; new `scripts/lib-scrub.mjs` and `scripts/lib-openapi.mjs`. A git-ignored `.cache/company-api/last.json` keeps the last change for `--last`.
- `app/worker/api/discovery.ts` and its test: version `3.2.0`.
- Install-owned, never in the payload: `schema/services/<key>/openapi.json` and `examples/`, and the generated `app/worker/services/<key>.ts`, added to the stack pack's `exclude`. This repo adds Notion.
- `app/tests/runtime/`: example playback in the outbound stub and its self-test.
- New check in `npm test`: `scripts/check-service-definitions.mjs`, with tests.
- New payload skill `.agents/skills/services/`, wired into `payload-files.json`; the `AGENTS.md` services lines become a pointer to it; `measure-context.mjs` needs an offsetting cut.
- Wiki: `wiki/stack/service-catalogue.md` and `wiki/stack/testing.md`. `areas.json` names the new spec. A minor `CHANGELOG.md` entry.

## Decision log

- **2026-11-06** — Asked how to keep saved answers that can hold customer data → chose scrub, then save with the code, with a check that blocks private-looking values.
- **2026-11-06** — Asked how the service docs stay current → chose a refresh command now; a weekly run can be scheduled later.
- **2026-11-06** — Assumed: save look-ups through `<key>.read` in the company app, because no key then reaches the computer and the read action already refuses anything but a look-up.
- **2026-11-06** — Assumed: the playback self-test uses a tool added in the test database with a made-up address, because the shipped app has no service key of its own.
- **2026-11-06** — Asked whether to describe each service's API as OpenAPI → chose a small OpenAPI file per service covering only the calls we use; not the service's full published spec, which is large and mostly unused.
- **2026-11-06** — Asked whether the description grows as skills use a service → yes: the notes rule, *add each call you worked out*, now adds it to the definition at the point of use.
- **2026-11-06** — Asked whether OpenAPI is the right tool, given the AI may never look → chose a services skill every chat can see, plus a types file for code.
- **2026-11-06** — Assumed: the skill's text is the same in every install and each install's services stay in its own definitions and notes pages, because an update replaces skill files and must never overwrite an install's own services.
- **2026-11-06** — Assumed: prove the AI uses the skill with a few fresh test chats before publishing, because a skill can still go unopened and only a real run shows it; this costs some AI usage once.
- **2026-11-06** — Asked whether tests should own the saved answers → chose the reverse: each service's definition is the one source and tests read its examples, so a skill that adds a call never edits a test file.
- **2026-11-06** — Asked whether a format made for agents fits better than OpenAPI → chose OpenAPI for storage, because services publish it, a copied call needs no translation, and the app's own API already uses it; what the AI reads is a separate, short view.
- **2026-11-06** — Asked whether a script can show only the important parts of the OpenAPI file → yes: an `api` command prints one line per call and a short view of one call, and searches the service's full published file; the AI never opens the file itself.
- **2026-11-06** — Asked whether the wiki's services folder is the right home → chose `schema/services/<key>/` beside the database migrations for the definition and examples, with the hand-written notes page kept in the wiki.
- **2026-11-06** — Assumed: a change's example is kept from a change already made for real work and never sent again, because sending a change only to save its answer would change real business data.
- **2026-11-06** — Assumed: answers are checked by a small validator for the schema words these files use, because a full validator is a new download and the goal is none.
- **2026-11-06** — Asked whether to split the plan → chose three plans: real-database tests and moving the pretend-database tests each plan in their own workspace; this plan keeps the service definitions. Playback joins the runtime suite as it is when this builds.
- **2026-11-06** — Asked whether to cut moving parts → chose: examples match their call by their own request, with no links to keep; the folder name is the key; refresh saves the answers again and the usual check reports misfits; the test chats run once at the end.
- **2026-11-06** — Asked whether to use OpenAPI 3.2.0 rather than 3.1 → chose 3.2.0 for both the service files and the app's own API description, so both sides share one version and one way of writing a call.
- **2026-11-06** — Asked whether to copy calls from a service's published file → chose to build every call from our own use, with its purpose and quirks in its `summary` and `description`, so the file shows how we use the service; this drops the search and copy commands planned earlier.
- **2026-11-06** — Assumed: a check blocks a new call left without a written purpose and description, because a call saved without them documents only its shape and loses the how.
- **2026-11-06** — Asked whether the app's own API description should be stored in a folder with the service files → chose no: it is built from the app's code and each person's access, so a saved copy would go stale; instead `api company` shows it in the same short view, read live.
- **2026-11-06** — Check: `app/knip.jsonc` treats `app/worker/services/*.ts` as entry files, because a generated types file exports a type per call whether or not code uses it yet.
- **2026-11-06** — Check: `app/.jscpd.json` ignores `app/worker/services/`, because generated types for two calls with the same shape repeat by design and are never edited by hand.
- **2026-11-06** — Check: `app/package.json` adds `check-service-definitions.mjs` to `npm test` and loosens nothing, because the check runner flags any change to the test script.
- **2026-11-06** — Assumed: the playback self-test starts a second runtime as production, because the app loads a chat-added tool only in production; it adds about 3 seconds, well inside the 30-second limit.
- **2026-11-06** — Assumed: offline, the check accepts a folder named for a key in `app/worker/keys.ts` or one with a notes page in `wiki/services/` or `knowledge/services/`, because a chat-added tool lives only in the app's database.
- **2026-11-06** — Assumed: a new definition takes its address from the read action's description, and the scrubber keeps that address's own URLs with their IDs made up, because the action states the address and no other source has it offline.
- **2026-11-06** — Assumed: the kept change sits in `.cache/company-api/last.json`, in a folder with its own `.gitignore` of `*`, so an install whose `.gitignore` lacks `.cache` still never saves it.
- **2026-11-06** — Assumed: `record` names a new call's `operationId` from its method and path, such as `postSearch`; the chat may rename it when it writes the summary.
- **2026-11-06** — Assumed: task 4.2's test chats are left to the person running `/ship`, because the build step never runs live acceptance.
- **2026-11-06** — Assumed: refresh lists an example whose request the scrubber changed as `not checked  <key>/<name> (its request was made up)` and never sends it, because a made-up ID asks the service for something else.
- **2026-11-06** — Assumed: the types-compile test uses the app's own `app/node_modules/.bin/tsc` and drops `typescript` from `scripts/tests/package.json`, because one compiler for the repo is enough.
- **2026-11-06** — Check: the types-compile test in `scripts/tests/lib-openapi.test.mjs` is skipped when `app/node_modules` is not installed, because the script tests install only their own dependencies.
- **2026-11-06** — Archive checkpoint: archived for /ship on branch improve-integration-testing-setup, with main brought in; the new spec's Purpose written in place of the archive placeholder.

<!-- end proposal.md -->
<!-- file design.md utf8 18338 -->
# Design

## Context

See proposal.md - Why. The pieces this builds on:

- `app/tests/runtime/` builds the real Worker with Vite, starts one workerd through Wrangler's `createTestHarness`, applies `schema/migrations/` to a temporary local D1, and runs its cases from one entry, `runtime.test.ts`. Its host `fetch` stub fails every outbound request but the Access JWKS. The plan *Test every part of the app on a real local database*, in its own workspace, adds seed data and a file per app; this change works with the suite either way.
- Direct use: `<key>.read` at `POST /api/direct/<key>/read` passes one look-up to a service with the app's key and refuses anything not a look-up (`app/worker/api/forward.ts`). `scripts/company-api.mjs` calls it under the employee's sign-in.
- `AGENTS.md` tells a chat to start with `company-api.mjs services` for any business service. One past session that called Notion directly ran `services` and `describe` but never opened `wiki/services/notion.md`, whose path `describe` prints deep in its JSON.
- Notes pages: `wiki/services/<id>.md`, owned by [the services list](../../../wiki/stack/service-catalogue.md#notes-on-each-key-based-service). `company-api.mjs` already names each key's notes path.
- The app describes its own API as OpenAPI 3.1.1 at `/api/openapi.json` (`app/worker/api/discovery.ts`, [agent API discovery](../../specs/agent-api-discovery/spec.md)): each operation has an `operationId`, `summary`, `description`, its key's tag, the guide as `externalDocs`, and `x-effect`. Service files follow the same way of writing a call (design 13).

## Goals / Non-Goals

**Goals:** one source per outside service, which tests, types and the AI all read; examples at the outbound edge only; deterministic scrubbing and checks; no new download.

**Non-Goals:** sending a change to save it, copying calls from a service's published spec, the AI reading `openapi.json` directly, changing what the app's own `/api/openapi.json` lists, matching on anything but method, path, query and body.

## Decisions

### 1. One folder per service: an OpenAPI file and its examples

```text
schema/services/notion/
  openapi.json          only the calls we use: the one source
  examples/search.json  one real exchange, scrubbed
```

`openapi.json` is OpenAPI 3.2.0 holding only the calls this install has made. The folder's name is the key in `app/worker/keys.ts` or the chat-added tool. `externalDocs.url` is the service's guide. Each call is written from our own use, never copied from the service's published spec, so the file records how we use the service, odd parts included. Each operation has:

| Field | Holds | Written by |
|---|---|---|
| `operationId` | a stable name, such as `searchPages` | the chat that adds the call |
| `summary` | one line: what we use it for | the chat that adds the call |
| `description` | how we use it: the inputs we rely on, quirks, what to avoid | the chat that adds the call, and later chats that learn more |
| `x-effect` | `read` or `change`, as on the app's own actions | `record` |
| parameters, request body, answer schema under its real status | the shape | `record`, from examples (design 5) |

`record` writes the shape and never touches the written fields.

An example file is one exchange. It names no call: its own request's method and path match it to one operation, so there is no link to keep.

```json
{ "source": "live", "recorded": "2026-11-06",
  "request": { "method": "POST", "path": "search", "body": { "page_size": 1 } },
  "answer": { "status": 200, "contentType": "application/json", "body": { "results": [] } } }
```

`source` is `live` (a look-up repeated by refresh) or `change` (kept from a change already made, never repeated). `body` is parsed JSON for a JSON answer, else text.

`schema/services/` sits beside `schema/migrations/`: both describe what the app talks to. The payload lists `schema/` files one by one, so the folder never ships and each install keeps its own, as it does `wiki/services/`. `wiki/services/<key>.md` keeps what is about the whole service: how its key is made, its access levels, limits. A quirk of one call goes in that call's `description`, its one place.

*Alternative:* link examples from operations, by `x-examples` or OpenAPI's `externalValue`. Rejected: a link is a second fact to keep in step, and `externalValue` splits one exchange over two files.

*Alternative:* copy calls from the service's published spec. Rejected: it describes everything the service can do, not how we use it, so two calls copied at different times disagree in style and say nothing of our quirks. Most published specs are also the older 3.0, which needs converting, and some services, such as Notion, publish none.

*Alternative:* the compact notation as the stored file. Rejected: nothing else reads it. OpenAPI is what the app's own `/api/openapi.json` uses, so one format covers both sides.

### 2. The `api` command: the short view the AI reads

The AI never opens `openapi.json`: a service's file grows long with schemas. `node scripts/company-api.mjs api` reads it and prints only what a call needs. `scripts/lib-openapi.mjs` holds the pure parts.

```text
$ node scripts/company-api.mjs api notion
POST search          Search pages and databases
GET  pages/{id}      Read one page
GET  users/me        The connection's own user

$ node scripts/company-api.mjs api notion search
POST search — Search pages and databases
  We send sort by last_edited_time to get the newest first.
  send { query?: string, filter?: {…}, page_size?: number }
  answer 200 { results: { id: string, url: string, properties: {…} }[], has_more: boolean, next_cursor: string | null }
  example: schema/services/notion/examples/search.json
```

- `api <key>` lists each operation on one line: method, path, summary.
- `api <key> <call>` takes a path, an `operationId`, or a unique word of the path. It resolves `$ref`s, prints the body and answer in a TypeScript-like notation with `?` for optional fields, cuts objects deeper than three levels to `{…}`, prints the operation's `description` and one-line field descriptions, and names the examples whose request matches the call.
- A call not in the file isn't shown: the AI reads the service's guide, makes the call, and adds it (design 3).
- `api company` and `api company <call>` give the same views of the app's own actions, read live from `/api/openapi.json` under the employee's sign-in, so they show only what that person may use. Nothing is saved: the app's code is its source (design 13). `company` is reserved; the services check refuses a service folder by that name.

`services` adds each row's count and next step: `calls: 3 · node scripts/company-api.mjs api notion`.

### 3. Record through `<key>.read`, keep a change already made

`record <key> <name> --file -` takes `<key>.read`'s input, calls it through the existing client, scrubs the answer and writes `examples/<name>.json`. If no operation matches its method and path template, it builds one from the answer (design 5), with a placeholder `summary` and no `description`, and asks the chat to write both. It then rebuilds the types (design 7) and prints the short view. A `not_a_lookup` refusal saves nothing; the refusal comes from the app, so the recorder can't be talked into a change.

A change is never sent to record it. After a successful `call <key>.change`, the helper keeps that one exchange in the git-ignored `.cache/company-api/last.json`, overwritten by the next. `record <key> <name> --last` scrubs and saves it with `source: change`, adding the operation the same way.

### 4. Deterministic scrubber

`scripts/lib-scrub.mjs` exports `scrub(value, { base })`, a pure walk:

| Value | Kept or replaced |
|---|---|
| numbers, booleans, null, keys | kept |
| ISO date or time | kept |
| short lowercase token (`^[a-z0-9_.-]{1,32}$`) | kept, unless its key hints private |
| email | `person<n>@example.com` |
| UUID, prefixed ID (`cus_…`), long hex or base62 | same prefix + stable fake |
| phone-like | `+1 555 0100`-style fake |
| URL on the service's own host | host kept, ID parts faked, query dropped |
| any other URL | `https://example.com/<n>` |
| key hints `name`, `email`, `phone`, `address`, `title`, `text`, `content`, `description`, `plain_text` | replaced whatever the form |
| anything else | `Sample text <n>` |

One map per example: the same input gets the same fake. `scrub(scrub(x))` equals `scrub(x)`. The request is scrubbed too; its `contentType` is kept as it is.

### 5. A call built from answers

`lib-openapi.mjs` builds each operation's shape from its examples. A path part the scrubber treats as an ID becomes `{id}`, `{id2}`…. The answer's JSON gives each field's type, array items merged, `null` as a type union. A field is `required` only when every example of that call holds it; a later example of the same call widens the schema, never narrows it. No enums or formats are guessed. The summary starts as *Recorded call: describe it*; the check fails until the chat replaces it (design 6).

### 6. The services check

`scripts/check-service-definitions.mjs`, run from `npm test` beside `check-app-keys.mjs`, for each `schema/services/<key>/`:

- the folder's name is a registered or chat-added key; `openapi.json` parses, is OpenAPI 3.2.0, and every `$ref` resolves; every operation has an `operationId`, an `x-effect`, a `summary` that isn't the placeholder, and a `description`;
- each example's request matches exactly one operation by method and path template, and its answer fits that operation's answer schema;
- re-scrubbing an example changes nothing (idempotence catches a hand-edit), and it holds no email outside `example.com`, no phone-like or token-like string;
- the types file equals what `openapi.json` builds.

Answers are checked by a small validator in `lib-openapi.mjs` for the keywords these files use: `type`, `properties`, `required`, `items`, `enum`, `oneOf`, `anyOf`, `allOf`, `$ref`; others are ignored. That keeps the goal of no new download. Each failure names file and field. With no services folder it passes.

### 7. Types built from the OpenAPI file

`lib-openapi.mjs` also renders `app/worker/services/<key>.ts` from `openapi.json`: an exported `type` per operation's request body and answer, named from its `operationId` or path (`NotionSearchAnswer`, `NotionPagesIdAnswer`), with `?` for fields not `required`, and a header saying it is generated and from where. App code types a service answer with it: `const answer = body as NotionSearchAnswer`. `record` and refresh rewrite it; the services check fails on a stale one. Knip ignores unused exports in `app/worker/services/`, and the folder joins the stack pack's `exclude` list.

### 8. Playback in the runtime stub

`app/tests/runtime/services.ts` loads the examples for the keys a test names and resolves each key's base from `app/worker/keys.ts` or the test database's chat-added tool. The outbound stub answers a request whose method, path, query and body match an example. A miss throws `No example for POST notion/pages (closest: notion/search)`. A test adds a case by adding an example to the service, never a test-owned file, so a call a skill adds is ready for its tests at once.

The playback self-test adds a made-up tool, `example` at `https://api.example.test/`, in the test database, with its folder under `app/tests/runtime/fixtures/services/example/`, and calls `example.read` end to end. The shipped app thus proves playback with no install-owned service. The self-test joins the runtime suite as it stands when this builds: today's single `runtime.test.ts`, or `apps/access.ts` once the real-database tests plan has split the suite into a file per app.

### 9. Refresh checks, then saves again

`record --refresh [<key>]` runs `record` again for each `live` example, with its saved request, through `<key>.read`. Before it saves a new answer, it checks that answer against the call's current schema (design 6) and lists each misfit as *doesn't fit*, so a field gone missing from a required place is named before widening drops it. Then it saves, and each call's shape widens as any `record` does (design 5), with its written fields kept. It prints the examples saved again and lists each `change` example as *not checked: a real change*. An example whose request holds a value the scrubber made up is listed as *not checked: its request was made up* and never sent, because the made-up request asks for something else. It then runs the services check for those keys. What widened shows in the changed files, so refresh keeps no report of its own. A refresh never sends a change.

*Alternative:* a separate shape diff in refresh. Rejected: it repeats what `record` and the check already do.

### 10. The services skill

`.agents/skills/services/SKILL.md`, a payload skill, model-invocable, so its description loads in every session:

```yaml
name: services
description: Use an outside tool or service (Notion, Stripe, a CRM…): call it through the company app, or write code that calls it.
```

Its body is short and fixed, the how only: run `services`; run `api <key>`, then `api <key> <call>` before calling or coding; never open `openapi.json` itself; read the notes page for the service's key and limits; for a call not listed, read the service's guide, then call with `<key>.read` or `.change`; save a new call with `record` when the helper says so, and write its `summary` and `description`; add what you learn about a call to its `description`; in code, type the answer from `app/worker/services/<key>.ts` and test it with playback. It links [the services list](../../../wiki/stack/service-catalogue.md) for the why and the rest. No install's service names appear in it, so `/wong-sync` replaces it safely.

`AGENTS.md`'s two service lines shrink to one pointer to the skill, keeping the key and MCP rules that aren't the skill's. `payload-files.json` gains `services` in `core.skillDirs`. The new description and body need offsetting cuts for `measure-context.mjs --check`; the `AGENTS.md` cut does not count toward skill text, so the cut comes from skill files that repeat the service flow, such as `connect`.

### 11. The not-yet-added hint

After a successful `call <key>.read` or `.change`, the helper matches the call's method and path against `openapi.json`. No match prints one line to standard error: for a look-up, `Not in schema/services/<key> yet. Add it: node scripts/company-api.mjs record <key> <name> --file -` with the same input as a here-doc; for a change, the same with `--last`. Standard output stays the answer, so scripts are unaffected. A known call prints nothing.

### 12. Test chats

Final-phase acceptance, not a shipped feature. In a scratch copy of this repo, run fresh headless chats with the host's own agent CLI, three per task:

1. *What's the title of the newest Notion page?*
2. *Add an action that lists the five newest Notion pages.*

Pass: each transcript runs `api notion` before its first Notion call or its first edit under `app/worker/`, and never reads `schema/services/notion/openapi.json` whole; task 2's code types the answer from `app/worker/services/notion.ts` and passes `tsc -b`. They run once, in the final phase. A miss changes the skill's description or body, then only that task's three chats run again; record the results in the change's evidence. Task 2's scratch code is thrown away.
### 13. One way of writing a call, in the app and for services

The app's own `/api/openapi.json` and every service file use OpenAPI 3.2.0. `discovery.ts` changes its version from `3.1.1` to `3.2.0`, and its test with it; nothing else in its output changes, because 3.2 only adds to 3.1. Both sides write a call the same way: `operationId`, `summary`, `description`, `x-effect`, and the guide as `externalDocs`. The same short-view code reads both, so `api company` shows the app's own actions as `api notion` shows Notion's (design 2). The app's description is not saved beside the service files: it is built from the registered actions and filtered by each person's access, so a saved copy would go stale and show actions some people may not use. `list` and `describe` stay, for search and memory operations.

3.2 adds what service calls may need: `itemSchema` for streamed answers, as AI services send, and the `QUERY` method. The plan uses neither yet; the validator ignores keywords it doesn't know (design 6).

*Alternative:* stay on 3.1. Rejected: our own scripts are the only readers, so 3.2's thinner tool support costs nothing, and one version on both sides keeps one way of writing.

## Risks / Trade-offs

- [The scrubber keeps a private short token, like a lowercase username] → Key hints cover the common fields; the check scans every string; the guide tells a person to read a new example before saving. A missed value lives in git history; the guide says how to remove it.
- [Money amounts and counts are kept] → They are business, not personal, data; a field named in the hint list is replaced anyway.
- [A built-from-answers call marks a field required that a service sometimes omits] → it needs the field in every example; a second example widens it, and refresh widens it too.
- [A call we never made has no entry, so the AI reads the service's guide for it] → that is the point: the file holds only proven use; the hint adds the call at its first use.
- [A chat writes a thin `description`] → the check only proves one exists; the test chats read the result, and later chats add what they learn.
- [Something reads the app's `/api/openapi.json` and refuses 3.2] → our helper reads paths, not the version; 3.2 only adds to 3.1.
- [An example's request matches no call, or two] → the check fails and names the example.
- [The AI still skips the skill, or opens `openapi.json` itself] → the test chats measure both before publishing; the types check catches wrong fields in code whether or not the skill was read.
- [The skill text pushes the budget] → keep the body to the how; cut repeated service flow from other skills.

## Migration Plan

Ships as a minor release. An install starts a `schema/services/<key>/` folder only when it saves or adds a call; until then the check and playback have nothing to do. Rollback: revert the release. No data or deployed state changes.

<!-- end design.md -->
<!-- file tasks.md utf8 6276 -->
# Tasks

## 1. Service definitions, the `api` view and types

- [x] 1.1 Write `scripts/lib-scrub.mjs` (design 4) with `scripts/tests/lib-scrub.test.mjs`: each row of the design's table, stable fakes within an example, key hints, own-host URLs, a scrubbed request, and idempotence. Verify: the test passes.
- [x] 1.2 Write `scripts/lib-openapi.mjs` with `scripts/tests/lib-openapi.test.mjs`: `$ref` resolving; the one-line list and the short view of design 2 (optional `?`, `{…}` past three levels, example names); finding an operation by path, `operationId` or a unique word; matching an example to one operation by its request; a `2XX` answer key, as the app's own file uses; building an operation from an example and widening it with a second (design 5); the answer validator's keywords (design 6); and the types file (design 7) compiling under `tsc`, identical for identical input. Verify: tests pass on a fixture definition, and the short view prints a call's `description`.
- [x] 1.3 Add `api` to `scripts/company-api.mjs` (design 2): `api <key>` and `api <key> <call>`, and `api company` from the live `/api/openapi.json` through the existing client; add the call count and `api` line to `services`. Verify: `scripts/tests/` cases cover each form, `api company` with a stubbed client showing only the actions it returns, a service with no folder yet, an unknown call naming the closest, and the usage text.
- [x] 1.4 Add `record` (design 3): `--file -` through `<key>.read`, and `--last` from the kept change in git-ignored `.cache/company-api/last.json`; scrub, write `schema/services/<key>/examples/<name>.json`, build the operation if no call matches, with `x-effect` and the placeholder summary, never touching a written `summary` or `description`; rebuild types; print the short view. Verify: tests with a stubbed client cover a save, a `not_a_lookup` refusal writing nothing, a new call, a second example widening a call with its written fields kept, `--last`, and that no change is ever sent.
- [x] 1.5 Add `record --refresh [<key>]` (design 9). Verify: tests cover an unchanged answer, a new field widening the call with its written fields kept, a field gone missing named before the save widens it, a `change` example and a made-up request listed as not checked and never sent, and that only `<key>.read` is called.
- [x] 1.6 Add the not-yet-added hint (design 11). Verify: tests show the hint on standard error for an unknown read and change, none for a known call, and standard output unchanged.
- [x] 1.7 Add `scripts/check-service-definitions.mjs` (design 6) to `npm test`, with tests for a broken `$ref`, a version other than 3.2.0, a folder named for no key or named `company`, an operation missing `operationId`, `x-effect` or `description`, a placeholder summary, a request that matches no call or two, an answer that doesn't fit, a hand-added real email, a token, and stale types. Add Knip's ignore for `app/worker/services/` exports, and `app/worker/services` to the stack pack's `exclude` in `.agents/skills/wong-sync/references/payload-files.json`. Verify: passes with no `schema/services/`; the payload tests still pass, and `schema/services/` ships nowhere.
- [x] 1.8 Add `app/tests/runtime/services.ts` playback (design 8) and its self-test in the runtime suite (design 8): a chat-added `example` tool at `https://api.example.test/` with its definition under `app/tests/runtime/fixtures/services/example/`, called through `example.read`; a miss names the closest example. Verify: the case passes and the live address is never fetched.
- [x] 1.9 In this repo, `record notion search` with one real search and read it for private values; write its `summary` and `description`, moving any search-specific pitfall from `wiki/services/notion.md` into the description. Verify: the services check passes; `api notion` lists the call; `api notion search` matches Notion's guide for the search call; `node scripts/check-payload-links.mjs` passes.
- [x] 1.10 Change `app/worker/api/discovery.ts`'s version to `3.2.0` and its test (design 13); update the version in `wiki/stack/service-catalogue.md`. Verify: `discovery.test.ts` passes; the output is otherwise unchanged.

## 2. The services skill

- [x] 2.1 Write `.agents/skills/services/SKILL.md` (design 10) and add `services` to `core.skillDirs` in `payload-files.json`. Verify: the payload test that lists skill folders passes; the skill names no install's service.
- [x] 2.2 Shrink `AGENTS.md`'s two service lines to one pointer to the skill, keeping the key and MCP rules, and cut the service flow other skills repeat, such as in `connect`. Verify: `node scripts/measure-context.mjs --check` passes; `node scripts/check-payload-links.mjs` passes.

## 3. Docs and release

- [x] 3.1 Update `wiki/stack/service-catalogue.md`: each service's definition in `schema/services/<key>/` and the `api` view; notes pages keep the how and pitfalls; *Add each call you worked out* now means `record` it and write its `summary` and `description`; a call's quirk goes in its description, and the notes page keeps what is about the whole service; and the refresh step. Add a section to `wiki/stack/testing.md` on service examples, playback and types, and how to remove a private value already saved. Link the services skill from both. Verify: `node scripts/check-payload-links.mjs` passes.
- [x] 3.2 Add `service-definitions` to `.claude/skills/memory/references/areas.json`; write the `## Next (minor)` `CHANGELOG.md` entry, whose Updating note says in plain words that the update adds a services skill and a folder per outside service the install uses, made once it adds a call. Verify: `memory-areas.test.mjs` passes; `VERSION` is unchanged.

## 4. Final checks

- [x] 4.1 Run the app's `npm test` and `npm run test:checks`.
- [x] 4.2 Run the test chats (design 12) once: three fresh chats per task, judged from their transcripts. Verify: all six run `api notion` before acting and none reads the whole definition file; task 2's code types its answer and passes `tsc -b`; record the results in the change's evidence.
- [x] 4.3 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate service-definitions --strict --no-interactive`. CI on `/save` is the gate; report local results as a pre-check.

<!-- end tasks.md -->
<!-- file specs/agent-api-discovery/spec.md utf8 1781 -->
## MODIFIED Requirements

### Requirement: Discovery describes the deployed company API

The protected company Worker SHALL publish OpenAPI 3.2 generated from its currently registered described actions and a bounded summary catalogue with per-action details. The outputs SHALL identify a contract revision, omit undeclared and infrastructure routes, preserve stable operation identities, and include only synthetic examples and nonsecret metadata. Every existing operation-level visibility restriction SHALL apply consistently to summary listings, selected details and OpenAPI; enabled Access per-app policy SHALL additionally enforce current employee app permissions on all three outputs. Permission changes SHALL govern the next discovery request even during an existing session; conditional or cached responses SHALL not reveal another caller's or a previously permitted action's contract. Discovery remains descriptive and SHALL grant no execution or memory authority.

#### Scenario: A new action is published

- **WHEN** a reviewed action joins the production registry and deploys
- **THEN** production discovery describes its real method, path, input, output and effect to permitted employees without a second manually maintained API document

#### Scenario: A route is not an employee action

- **WHEN** the Worker also serves the raw memory protocol, verification uploads, administrative operations or undescribed legacy handlers
- **THEN** discovery does not advertise those routes as company actions

#### Scenario: Employee app permission is removed

- **WHEN** an employee requests summaries, selected details or OpenAPI after their app permission is removed
- **THEN** none of those responses or conditional cache paths reveal that app's unauthorized action contract

<!-- end specs/agent-api-discovery/spec.md -->
<!-- file specs/service-definitions/spec.md utf8 8143 -->
## ADDED Requirements

### Requirement: Each outside service has one definition

Each outside service an install uses SHALL have one definition, kept with the code: an OpenAPI file holding only the calls the install uses, and real example exchanges, each matched to its call by its own request. Each call SHALL be written from the install's own real use, never copied from the service's published description, and SHALL say in its standard fields what the install uses it for and how, quirks included. The definition SHALL use the same OpenAPI version and the same way of writing a call as the app's own API description. Tests, code types and the AI SHALL all read this one definition; no test SHALL keep its own copy of a service's answer. The definition SHALL stay with the install: an update SHALL never add, change or remove it.

#### Scenario: A skill adds a call

- **WHEN** a skill starts using Notion's page read and the call is added to Notion's definition with an example
- **THEN** the AI's call list, the code types and the runtime tests all have the call, and no test file changed

#### Scenario: An update arrives

- **WHEN** an install with a Notion definition takes an update
- **THEN** its Notion definition and examples are unchanged

### Requirement: The AI reads a short view of a service, never the whole file

The helper SHALL list a service's calls one line each, and print one call's input and answer in a short form: references resolved, deep nesting cut, and the example named. The short view SHALL include how the install uses the call. The same views SHALL show the app's own actions, read from the app at the time of asking and limited to what the person may use; the app's own description SHALL never be saved as a file. Every installed repo SHALL carry a services skill whose description every session loads, saying it is for calling an outside tool or service and for writing code that calls one, and sending the AI to the short view before it calls or codes. The skill's text SHALL be the same in every install and name no install's service.

#### Scenario: A chat is asked about a service

- **WHEN** a person asks a fresh chat for the newest Notion page
- **THEN** the chat reads Notion's short view before its first call to Notion, without opening the whole definition file

#### Scenario: A call has a quirk

- **WHEN** Notion's search call's description says the install sorts by last edit to get the newest page
- **THEN** a chat reading the search call's short view sees that note beside what to send and what comes back

### Requirement: Examples are saved without a key on the computer and without sending a change

A look-up example SHALL be made by sending the look-up through the company app under the caller's own sign-in and key level, so no business key reaches the computer. Only a request the app accepts as read-only SHALL be sent to make an example. An example of a change SHALL be kept only from a change already made for real work, and never sent again.

#### Scenario: Save a look-up

- **WHEN** a person with Read on Notion saves a Notion page search as an example
- **THEN** the example holds the request, status and body, Notion's definition gains the call if missing, and no key value appears in it or on the computer

#### Scenario: Try to save a change as a look-up

- **WHEN** someone saves a request the app does not accept as a look-up
- **THEN** nothing is sent to the service and nothing is saved

### Requirement: An example holds no private data

Before an example is saved, every email, name, ID, phone number, free text and key-like value SHALL be replaced with a made-up value of the same kind, keeping field names, types and nesting. The same real value SHALL get the same made-up value within one example, so links between fields survive. The test command SHALL fail on an example that still holds a value that looks private, naming the file and field.

#### Scenario: A customer email in an answer

- **WHEN** a saved answer holds a customer's real email
- **THEN** the example holds a made-up `example.com` email in its place

#### Scenario: A private value is added by hand

- **WHEN** someone edits an example to hold a real-looking email or token
- **THEN** the test command fails and names the file and field

### Requirement: The definition and its examples agree

The test command SHALL fail, naming the file and field, when a definition doesn't parse, uses another OpenAPI version than the app's own, or has a broken reference, when a call lacks a written summary or description, when an example's request matches no call or more than one, or when an example's answer doesn't fit its call's answer schema.

#### Scenario: A new call is not described

- **WHEN** a chat saves a first Notion user look-up and leaves the call's summary as the placeholder
- **THEN** the test command fails and names the call

#### Scenario: An example no longer fits

- **WHEN** an example's answer lacks a field its call marks required
- **THEN** the test command fails and names the example and the field

### Requirement: Code that reads a service answer is type-checked against its definition

Each service definition SHALL produce types for each call's input and answer. App code reading a service answer through those types SHALL fail the type check when it reads a field the definition doesn't hold. The types SHALL be rebuilt whenever the definition changes, and the test command SHALL fail on stale types.

#### Scenario: Code reads a field the service doesn't send

- **WHEN** an action reads `results[0].heading` from a Notion search answer and Notion's definition has no `heading`
- **THEN** the type check fails and names the field

### Requirement: The definition grows with use

After a successful direct call that the service's definition doesn't hold, the helper SHALL say the call is not added yet and give the one command that adds it with an example. A call the definition holds SHALL produce no such message.

#### Scenario: A chat works out a new call

- **WHEN** a chat's look-up of `GET users/me` on Notion succeeds and Notion's definition lacks it
- **THEN** the helper prints that the call is not added and the command to add it, and after that command the short view lists it

### Requirement: Runtime tests replay the definition's examples

A runtime test SHALL be able to answer the app's outside requests from the service's examples, matched by service, method, path and input. A request no example matches SHALL fail the test and name the closest example.

#### Scenario: Code that calls a service

- **WHEN** a runtime test runs an app route that searches Notion and Notion's definition has a search example
- **THEN** the route gets the example's answer and the live service is never contacted

### Requirement: Examples can be refreshed

A refresh SHALL repeat each look-up example through the company app and report, per example, whether the new answer fits its call, naming fields that don't fit and fields the definition doesn't name. It SHALL check each new answer against the call's current answer schema before it saves. It SHALL save each new answer scrubbed. Each call's shape SHALL widen to match, and its written summary and description SHALL stay. A change example SHALL be listed as not checked. An example whose request the scrubber changed SHALL be listed as not checked and never sent. A refresh SHALL never send a change.

#### Scenario: A service adds a field

- **WHEN** Notion's page answer gains a field since its example was saved
- **THEN** the refresh names the new field, saves the new answer scrubbed, and the call gains the field in its definition and types, with its description unchanged

#### Scenario: A service drops a required field

- **WHEN** Notion's search answer no longer holds `has_more`, which every saved example held
- **THEN** the refresh lists `has_more` as missing, then saves the new answer and widens the call

#### Scenario: A request holds a made-up value

- **WHEN** an example's saved request holds a page ID the scrubber made up
- **THEN** the refresh lists it as not checked and never sends it

<!-- end specs/service-definitions/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-11-06

~~~
<!-- end .openspec.yaml -->
<!-- file evidence.md utf8 1904 -->
# Evidence

## Test chats (task 4.2, design 12)

One round, 2026-11-06, on the built tree before the review fixes (the fixes touched refresh, the scrubber and the guide, not what the chats read). Each chat ran headless with `claude -p` (Claude Code 2.1.310) in its own detached scratch worktree of this repo, with the build copied in. Transcripts were judged from their tool calls.

| Chat | Task | Before its first Notion call or edit | Read the whole `openapi.json` | Code typed from `app/worker/services/notion.ts`, `tsc -b` | Result |
|---|---|---|---|---|---|
| 1 | Newest Notion page | services skill, `services`, `api notion`, `api notion search` | no | — | pass; Notion returned no pages (none shared with the connection), and the chat said so |
| 2 | Newest Notion page | same | no | — | pass; same empty answer |
| 3 | Newest Notion page | same | no | — | pass; same empty answer |
| 4 | Add an action | read the skill, the types file and the example; no `api notion` | no | no code | stopped before any call or edit, asking how a chat-added key reaches built code |
| 5 | Add an action | read the skill, `api notion search` | no; read one call's `description` with a one-line script | `NotionSearchAnswer`, `NotionSearchRequest`; `tsc -b` passes | pass |
| 6 | Add an action | read the skill, `api notion search` | no | `NotionSearchAnswer`; `tsc -b` passes | pass |

No chat acted on Notion before reading its short view or the files the skill names, so the skill's text was not changed and no task was run again.

All three action chats met the same limit, which existed before this change: a key added from a chat lives in the live database, while built server code can use only keys listed in `app/worker/keys.ts`. Listing Notion there ships it to every install, so in this repo each chat stopped or asked before doing that. Task 2's scratch code was thrown away with the worktrees.

<!-- end evidence.md -->
<!-- file review.html utf8 118720 fence=~~~ -->
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
<title>Review · 2026-11-06-service-definitions</title>
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
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; }
  .item > .drawing:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 var(--pad); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--foreground); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--border); background:var(--muted); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
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
  /* Picture files: a wrapping row of labelled figures in em, so the fit and zoom scale them like a drawing; two sit side by side when they fit. */
  .art.photo { width:49.2em; display:flex; flex-wrap:wrap; align-items:flex-start; gap:.8em; white-space:normal; line-height:1.3; }
  .art.photo figure { flex:1 1 18em; min-width:0; margin:0; text-align:center; }
  .art.photo img { display:block; width:100%; height:auto; max-height:40em; object-fit:contain; border:1px solid var(--border); border-radius:.4em; background:var(--background); }
  .art.photo figcaption { margin-top:.3em; color:var(--muted-foreground); font-size:.95em; }
  .shot { position:relative; display:block; } .art .pin.spot { position:absolute; margin:0; transform:translate(-50%, -50%); }
  /* An ad: the card a feed or a story shows, in em like a picture; several sit side by side when they fit. */
  .art.ads { width:auto; max-width:49.2em; margin-right:1px; }
  .ad { flex:1 1 15em; max-width:20em; min-width:0; overflow:hidden; border:1px solid var(--border); border-radius:.6em; background:var(--card); color:var(--card-foreground); text-align:left; }
  .ad .ad-account { margin:0; padding:.5em .7em; } .ad .ad-account span { color:var(--muted-foreground); font-size:.85em; }
  .art.photo .ad img { max-height:none; aspect-ratio:4 / 5; object-fit:cover; border:0; border-radius:0; }
  .ad-words { display:flex; flex-wrap:wrap; align-items:center; gap:.3em .6em; padding:.6em .7em; }
  .ad-words .ad-text { flex:1 1 100%; margin:0; } .ad-words .ad-headline { flex:1 1 0; min-width:0; }
  .ad-button { padding:.3em .8em; border-radius:.4em; background:var(--primary); color:var(--primary-foreground); font-size:.9em; }
  .ad.story { position:relative; } .art.photo .ad.story img { aspect-ratio:9 / 16; }
  .ad.story .ad-account { position:absolute; top:0; left:0; right:0; z-index:1; background:color-mix(in oklab, var(--background) 70%, transparent); }
  .ad.story .ad-words { position:absolute; left:0; right:0; bottom:0; background:color-mix(in oklab, var(--background) 80%, transparent); }
  .try { margin:8px 0 0; padding:0 var(--pad); }
  .item > .verdict { grid-column:1 / -1; display:flex; align-items:center; gap:8px; margin-top:10px; }
  .verdict button { min-width:64px; }
  .note-list .group { margin:12px 0 6px; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  .item > .table { grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; overflow-x:auto; border-top:1px solid var(--border); }
  .item > .table:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .tbl th, .tbl td { padding:6px var(--pad); text-align:left; vertical-align:top; border-bottom:1px solid var(--border); }
  .tbl th { color:var(--muted-foreground); font-weight:500; background:var(--muted); }
  .tbl tbody tr:last-child td { border-bottom:0; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:var(--pad); min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted-foreground); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--background); }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--muted); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:13px; }
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
  /* Live cards, forms, files, and the needs list: the look's parts, with inputs at 16px so a phone never zooms. */
  .item > .live, .item > .form { grid-column:1 / -1; margin-top:10px; min-width:0; }
  .live-tools { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 6px; }
  .live-tools [aria-pressed="true"] { background:var(--secondary); color:var(--secondary-foreground); }
  .live-box { overflow:hidden; border:1px solid var(--border); border-radius:var(--radius); background:var(--muted); }
  .live iframe { display:block; border:0; transform-origin:0 0; background:var(--background); }
  .live.full { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; margin:0; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; background:var(--background); }
  .live.full .live-box { flex:1; min-height:0; overflow:auto; }
  .live.full iframe { margin:0 auto; }
  .live-said { margin:6px 0 0; }
  .form { display:grid; gap:14px; }
  .need .form { margin-top:10px; }
  .q { min-width:0; margin:0; padding:0; border:0; }
  .q-label { display:block; margin:0 0 4px !important; font-weight:500; }
  .q :is(input:not([type=checkbox], [type=radio], [type=file]), textarea) { display:block; width:100%; padding:8px 10px; font:inherit; font-size:16px; }
  .opt { display:flex; align-items:center; gap:8px; min-height:40px; }
  .opt input { width:20px; height:20px; margin:0; }
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
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
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
<body data-change="2026-11-06-service-definitions" data-own-back>
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-11-06-service-definitions</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#needs">Needs</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint"><span class="lead">Tap + Note to comment.</span> <span class="copies">Saving a note copies all your notes.</span> <span class="tail">Open a drawing and tap it to see it full screen.</span></p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Any test that calls an outside service, such as Notion or Stripe, fails at once, so code that talks to those services has no test at all. The AI learns each service only from notes in plain words and never sees a real answer. One past chat skipped even those notes: nothing points it there at the moment it acts.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Each outside service gets one definition, kept with the code, that tests, code and the AI all read.</b> A folder per service holds a file of only the calls we have made, in the standard API format (OpenAPI), and real example answers. We build each call from our own use, never copy it from the service's own published file, so the file shows how we use the service, odd parts included. Each call says in plain words what we use it for and how, in the same place every time. Tests replay the examples, so adding a call to a service gives its tests the answer too, with no test file to change. The notes page keeps what is about the whole service, such as how its key is made.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">schema/services/notion/</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">  openapi.json   only the calls we use</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">  examples/      real answers, made safe</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">wiki/services/notion.md</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">               key, access, limits</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The AI reads a short view of a service, never the long file.</b> A command reads the definition and prints only what a call needs: one line per call, then for one call how we use it, what to send and the fields that come back. A services skill every chat can see sends the AI there before it calls a service or writes code for one.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">$ node scripts/company-api.mjs api notion</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">POST search          Search pages and databases</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">GET  pages/{id}      Read one page</span>

<span class="ln" data-note="item-2-line-5" tabindex="0">$ node scripts/company-api.mjs api notion search</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">POST search — Search pages and databases</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">  We sort by last edit for the newest.</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">  send { query?, page_size? }</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">  answer 200 { results: { id, url }[],</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">               has_more }</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">  example: examples/search.json</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Example answers come from real use, with private details swapped.</b> One command asks the service through the app, with your sign-in, so no key reaches your computer. It sends only look-ups. A change's answer is kept only from a change you already made for real work, never sent again just to save it. Before saving, emails, names, IDs and free text become made-up values with the same shape. A check blocks any example that still looks private, or that no longer fits its call.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-3-picture-1" tabindex="0" style="width:30.231em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 393 376" width="393" height="376" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_A_B_0"><path d="M179.82,80L179.82,121"/><path class="pele-marker" d="M179.82,128L176.46,120L183.18,120Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_B_C_0"><path d="M179.82,176L179.82,217"/><path class="pele-marker" d="M179.82,224L176.46,216L183.18,216Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_C_D_0"><path d="M141.34,272C141.34,289.5 75.79,289.5 75.79,307L75.79,313"/><path class="pele-marker" d="M75.79,320L72.43,312L79.15,312Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_C_E_0"><path d="M218.3,272C218.3,289.5 283.84,289.5 283.84,307L283.84,313"/><path class="pele-marker" d="M283.84,320L280.48,312L287.2,312Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="A" transform="translate(179.82,44)"><rect x="-98.49" y="-36" width="196.98" height="72" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" text-anchor="middle" xml:space="preserve"><tspan x="0" y="-6.4">A look-up, or a change</tspan><tspan x="0" y="17.6">already made</tspan></text></g><g class="pele-node pele-shape-rect" data-id="B" transform="translate(179.82,152)"><rect x="-89.58" y="-24" width="179.17" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Swap private details</text></g><g class="pele-node pele-shape-rect" data-id="C" transform="translate(179.82,248)"><rect x="-90.48" y="-24" width="180.96" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Save as an example</text></g><g class="pele-node pele-shape-rect" data-id="D" transform="translate(75.79,344)"><rect x="-67.79" y="-24" width="135.58" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Tests replay it</text></g><g class="pele-node pele-shape-rect" data-id="E" transform="translate(283.84,344)"><rect x="-100.26" y="-24" width="200.51" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Definition gains the call</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Code that reads a service's answer is checked against its definition.</b> Each service's definition makes a types file. If code reads a field the service doesn't send, the type check fails and names it, so the AI need not remember the notes.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The definition grows as chats and skills use a service.</b> When a chat makes a call the definition lacks, the helper says so and gives the one command to add it. The chat then writes what the call is for and how we use it; a check blocks a call left without that. The next chat sees the call in the short view.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>The app's own API description and the service files use the same version and the same way of writing a call.</b> Both move to OpenAPI 3.2.0, the newest version. Each call has the same parts on both sides: a name, a one-line purpose, how it is used, and whether it only looks or changes something. The same short view shows the app's own calls: <code>api company</code>. It reads them from the app each time, so nothing is saved that could go stale, and each person sees only the calls they may use.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>A refresh command shows when a service changes what it sends.</b> It asks each saved look-up again and lists any answer that no longer fits its call. Then it saves the new answers, private details swapped. A look-up whose request holds a made-up value, such as a page ID, is never sent: it would ask for something else. A test that then fails means our code needs to catch up. You can later schedule it weekly.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-7-line-1" tabindex="0">saved again  notion/search</span>
<span class="ln" data-note="item-7-line-2" tabindex="0">not checked  stripe/refund (a real change)</span>
<span class="ln" data-note="item-7-line-3" tabindex="0">not checked  notion/get-page (its request was made up)</span>
<span class="ln" data-note="item-7-line-4" tabindex="0">doesn't fit  notion/search: answer.body.has_more: missing</span></pre></div></details></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>Test chats prove the AI uses it.</b> Before publishing, a few fresh chats get real tasks, such as finding the newest Notion page and adding an action that lists Notion pages. Each must read the short view before it acts, never the long file, and its code must pass the type check.</div></div></li>
</ol>
<p class="aside">Non-goals: calling live services in tests, a weekly refresh routine, sending a change to save it, copying calls from a service's published file, and changing which actions the app's own API description lists.</p>

</section>
<section id="needs" aria-labelledby="needs-h"><h2 id="needs-h">What the build needs</h2>
<ol class="needs">
<li class="need card" id="need-1" data-need="ready"><p><span class="tag">Ready</span> <b>Notion key</b>: The app holds it with Read, so the build saves one real Notion look-up to prove the full path.</p></li>
</ol>
</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-06</p>Asked how to keep saved answers that can hold customer data → chose scrub, then save with the code, with a check that blocks private-looking values.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-06</p>Asked how the service docs stay current → chose a refresh command now; a weekly run can be scheduled later.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-06</p>Assumed: save look-ups through <code>&lt;key&gt;.read</code> in the company app, because no key then reaches the computer and the read action already refuses anything but a look-up.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-06</p>Assumed: the playback self-test uses a tool added in the test database with a made-up address, because the shipped app has no service key of its own.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-06</p>Asked whether to describe each service's API as OpenAPI → chose a small OpenAPI file per service covering only the calls we use; not the service's full published spec, which is large and mostly unused.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-06</p>Asked whether the description grows as skills use a service → yes: the notes rule, <i>add each call you worked out</i>, now adds it to the definition at the point of use.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-06</p>Asked whether OpenAPI is the right tool, given the AI may never look → chose a services skill every chat can see, plus a types file for code.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-06</p>Assumed: the skill's text is the same in every install and each install's services stay in its own definitions and notes pages, because an update replaces skill files and must never overwrite an install's own services.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-06</p>Assumed: prove the AI uses the skill with a few fresh test chats before publishing, because a skill can still go unopened and only a real run shows it; this costs some AI usage once.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-06</p>Asked whether tests should own the saved answers → chose the reverse: each service's definition is the one source and tests read its examples, so a skill that adds a call never edits a test file.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-06</p>Asked whether a format made for agents fits better than OpenAPI → chose OpenAPI for storage, because services publish it, a copied call needs no translation, and the app's own API already uses it; what the AI reads is a separate, short view.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-06</p>Asked whether a script can show only the important parts of the OpenAPI file → yes: an <code>api</code> command prints one line per call and a short view of one call, and searches the service's full published file; the AI never opens the file itself.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-06</p>Asked whether the wiki's services folder is the right home → chose <code>schema/services/&lt;key&gt;/</code> beside the database migrations for the definition and examples, with the hand-written notes page kept in the wiki.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-06</p>Assumed: a change's example is kept from a change already made for real work and never sent again, because sending a change only to save its answer would change real business data.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-06</p>Assumed: answers are checked by a small validator for the schema words these files use, because a full validator is a new download and the goal is none.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-06</p>Asked whether to split the plan → chose three plans: real-database tests and moving the pretend-database tests each plan in their own workspace; this plan keeps the service definitions. Playback joins the runtime suite as it is when this builds.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-06</p>Asked whether to cut moving parts → chose: examples match their call by their own request, with no links to keep; the folder name is the key; refresh saves the answers again and the usual check reports misfits; the test chats run once at the end.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-06</p>Asked whether to use OpenAPI 3.2.0 rather than 3.1 → chose 3.2.0 for both the service files and the app's own API description, so both sides share one version and one way of writing a call.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-06</p>Asked whether to copy calls from a service's published file → chose to build every call from our own use, with its purpose and quirks in its <code>summary</code> and <code>description</code>, so the file shows how we use the service; this drops the search and copy commands planned earlier.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-06</p>Assumed: a check blocks a new call left without a written purpose and description, because a call saved without them documents only its shape and loses the how.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-06</p>Asked whether the app's own API description should be stored in a folder with the service files → chose no: it is built from the app's code and each person's access, so a saved copy would go stale; instead <code>api company</code> shows it in the same short view, read live.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-06</p>Check: <code>app/knip.jsonc</code> treats <code>app/worker/services/*.ts</code> as entry files, because a generated types file exports a type per call whether or not code uses it yet.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-06</p>Check: <code>app/.jscpd.json</code> ignores <code>app/worker/services/</code>, because generated types for two calls with the same shape repeat by design and are never edited by hand.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-06</p>Check: <code>app/package.json</code> adds <code>check-service-definitions.mjs</code> to <code>npm test</code> and loosens nothing, because the check runner flags any change to the test script.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-06</p>Assumed: the playback self-test starts a second runtime as production, because the app loads a chat-added tool only in production; it adds about 3 seconds, well inside the 30-second limit.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-06</p>Assumed: offline, the check accepts a folder named for a key in <code>app/worker/keys.ts</code> or one with a notes page in <code>wiki/services/</code> or <code>knowledge/services/</code>, because a chat-added tool lives only in the app's database.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-06</p>Assumed: a new definition takes its address from the read action's description, and the scrubber keeps that address's own URLs with their IDs made up, because the action states the address and no other source has it offline.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-06</p>Assumed: the kept change sits in <code>.cache/company-api/last.json</code>, in a folder with its own <code>.gitignore</code> of <code>*</code>, so an install whose <code>.gitignore</code> lacks <code>.cache</code> still never saves it.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-06</p>Assumed: <code>record</code> names a new call's <code>operationId</code> from its method and path, such as <code>postSearch</code>; the chat may rename it when it writes the summary.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-06</p>Assumed: task 4.2's test chats are left to the person running <code>/ship</code>, because the build step never runs live acceptance.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-06</p>Assumed: refresh lists an example whose request the scrubber changed as <code>not checked  &lt;key&gt;/&lt;name&gt; (its request was made up)</code> and never sends it, because a made-up ID asks the service for something else.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-06</p>Assumed: the types-compile test uses the app's own <code>app/node_modules/.bin/tsc</code> and drops <code>typescript</code> from <code>scripts/tests/package.json</code>, because one compiler for the repo is enough.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-06</p>Check: the types-compile test in <code>scripts/tests/lib-openapi.test.mjs</code> is skipped when <code>app/node_modules</code> is not installed, because the script tests install only their own dependencies.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-06</p>Archive checkpoint: archived for /ship on branch improve-integration-testing-setup, with main brought in; the new spec's Purpose written in place of the archive placeholder.</li>
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
  <p class="vhint">Drag to move · pinch or + to zoom<span class="note-it"> · tap a line or picture to note it</span></p>
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
  if (REVIEW) document.querySelector('.hint .lead').textContent = 'Tap OK or Change on each card, or select words to note them.';
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {}, ok: {}, answers: {}, said: {}, files: {} };
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
  const QID = /^(?:item|need)-\d+-(?:q|live)-\d+$/;
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
      const words = function (v) { return typeof v === 'string' && v.length <= 2000; };
      kept('answers', function (v) { return words(v) || typeof v === 'boolean' || (Array.isArray(v) && v.every(words)); });
      kept('said', function (v) { return typeof v === 'string'; });
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
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    // A table row's cells read joined with a dot.
    // A screen's words sit in many small boxes: join every piece of text with a space.
    // Picture files read as their labels, joined with a dot.
    const row = el.tagName === 'TR', photo = el.classList.contains('photo'), cells = row ? c.querySelectorAll('td') : photo ? c.querySelectorAll('img')
      : el.classList.contains('screen') ? texts(c) : el.classList.contains('pic') ? c.querySelectorAll('text') : [c];
    const text = Array.prototype.map.call(cells, function (n) { return (photo ? n.alt : n.textContent).replace(/\s+/g, ' ').trim(); }).join(row || photo ? ' · ' : ' ').replace(/\s+/g, ' ').trim();
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
    if (m && !el.querySelectorAll('.shot')[rec.k]) return null;
    return labelOf(el) === rec.label ? el : null;
  }
  function textOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .add'), function (n) { n.parentNode.removeChild(n); });
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
          el.querySelectorAll('.shot')[rec.k].appendChild(pin);
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
      if (el.closest('.art') || el.querySelector('.pin[data-open="' + id + '"]')) return;
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
    Object.keys(data.answers).forEach(function (id) {
      const q = document.querySelector('[data-q="' + id + '"], [data-live="' + id + '"]');
      if (!q || q.getAttribute('data-kind') === 'tick') return;
      if (!$('note-list').querySelector('.group.answers')) $('note-list').insertAdjacentHTML('beforeend', '<li class="group answers">Answers</li>');
      const line = q.hasAttribute('data-live') ? asker(id) + ' answer' : asker(id) + ', "' + q.getAttribute('data-label') + '"', v = data.answers[id];
      const sent = !answers.some(function (a) { return a.id === id; });
      $('note-list').insertAdjacentHTML('beforeend', '<li class="entry"><span class="where">' + esc(line) + (sent ? '<span class="tag">Sent</span>' : '') + '</span>'
        + esc(Array.isArray(v) ? v.join(', ') : v) + '</li>');
    });
    if (ids.length || $('note-list').querySelector('.answers')) { const none = $('note-list').querySelector('li.muted'); if (none) none.remove(); }
    fill(); drawFiles();
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
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
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false, spotAt(el, t.target, e)); else hideChip();
  });
  // A tap on a picture file in full screen notes that spot of it, kept in percent so it holds at any size.
  function spotAt(el, target, e) {
    if (!el.closest('#viewer') || !el.classList.contains('photo') || target.tagName !== 'IMG') return null;
    const r = target.getBoundingClientRect(), pct = function (v, size) { return Math.max(0, Math.min(100, Math.round(v / Math.max(1, size) * 100))); };
    return { k: Array.prototype.indexOf.call(el.querySelectorAll('img'), target), x: pct(e.clientX - r.left, r.width), y: pct(e.clientY - r.top, r.height), on: target.alt };
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
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
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
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
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
    fit(d); bar();
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
      if (a.said) data.said[a.id] = a.said;
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

  // ── OK and Change on each card: an OK is kept with the notes until undone, and goes to the chat with them ──
  all('.items > .item', function (item) {
    const v = document.createElement('div');
    v.className = 'verdict';
    v.innerHTML = '<span class="tag" hidden>OK</span><button type="button" class="btn-ghost" data-ok="' + item.id + '">OK</button>'
      + '<button type="button" class="btn-ghost" data-open="' + item.id + '" aria-label="Change ' + NOUN.toLowerCase() + ' ' + item.id.slice(5) + '">Change</button>';
    item.appendChild(v);
  });
  document.addEventListener('click', function (e) {
    const b = e.target.closest ? e.target.closest('[data-ok]') : null;
    if (!b) return;
    const id = b.getAttribute('data-ok');
    if (data.ok[id]) delete data.ok[id]; else data.ok[id] = true;
    persist();
  });
  // A picture file's spot pins sit over the picture itself.
  all('.art.photo img', function (img) {
    const shot = document.createElement('span');
    shot.className = 'shot';
    img.parentNode.insertBefore(shot, img);
    shot.appendChild(img);
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

  // ── answers: a form's inputs and a live card's answer, kept with the notes and sent with them under their card ──
  // `said` holds each answer as the chat last got it, so a changed answer goes again and an unchanged one never does.
  const asker = function (id) { const m = /^(item|need)-(\d+)/.exec(id); return (m[1] === 'item' ? NOUN : 'Need') + ' #' + m[2]; };
  function inputValue(q) {
    const kind = q.getAttribute('data-kind'), boxes = q.querySelectorAll('input:checked');
    if (kind === 'tick') return !!boxes.length;
    if (kind === 'choice') return boxes.length ? boxes[0].value : undefined;
    if (kind === 'choices') return boxes.length ? Array.prototype.map.call(boxes, function (b) { return b.value; }) : undefined;
    const v = q.querySelector('input, textarea').value.slice(0, 2000);
    return v.trim() ? v : undefined;
  }
  function fill() {
    all('.form [data-q]', function (q) {
      const v = data.answers[q.getAttribute('data-q')], kind = q.getAttribute('data-kind');
      if (kind === 'file') return;
      Array.prototype.forEach.call(q.querySelectorAll('input, textarea'), function (el) {
        if (el.type === 'radio' || el.type === 'checkbox') el.checked = kind === 'tick' ? v === true : kind === 'choice' ? v === el.value : Array.isArray(v) && v.indexOf(el.value) >= 0;
        else if (el.value !== (v || '')) el.value = v || '';
      });
    });
  }
  function answered(q) {
    const id = q.getAttribute('data-q'), v = data.answers[id];
    if (q.getAttribute('data-kind') === 'file') return !!(data.files[id] && data.files[id].length);
    return q.getAttribute('data-kind') === 'tick' ? v === true : v !== undefined;
  }
  // Each answer the chat has not got yet, in page order: its id, its line, and the files it names.
  function replies() {
    const out = [];
    all('.form [data-q], .live[data-live]', function (q) {
      const id = q.getAttribute('data-q') || q.getAttribute('data-live'), v = data.answers[id];
      if (q.getAttribute('data-kind') === 'file') {
        const fresh = (data.files[id] || []).filter(function (f) { return !f.sent; });
        if (fresh.length) out.push({ id: id, files: fresh.map(function (f) { return f.id; }),
          line: '- ' + asker(id) + ', "' + q.getAttribute('data-label') + '": ' + fresh.map(function (f) { return f.name; }).join(', ') });
        return;
      }
      if (v === undefined || data.said[id] === JSON.stringify(v)) return;
      const text = v === true ? 'Yes' : v === false ? 'No' : Array.isArray(v) ? v.join(', ') : v.replace(/\s*\n\s*/g, ' ');
      out.push({ id: id, said: JSON.stringify(v), files: [],
        line: '- ' + asker(id) + (q.hasAttribute('data-live') ? ' answer: ' : ', "' + q.getAttribute('data-label') + '": ') + text });
    });
    return out;
  }
  const fileIds = function (ans) { return ans.reduce(function (ids, a) { return ids.concat(a.files); }, []); };
  function typed(e) {
    const q = e.target.closest ? e.target.closest('.form [data-q]') : null;
    if (!q || q.getAttribute('data-kind') === 'file') return;
    const v = inputValue(q), id = q.getAttribute('data-q');
    if (v === undefined) delete data.answers[id]; else data.answers[id] = v;
    persist();
  }
  document.addEventListener('input', typed);
  document.addEventListener('change', typed);

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

  // ── live cards: the chat's own page in a sealed frame, talking to this page only through the port it is handed ──
  // A frame loads once; a second load means its page went somewhere else, so it starts again from its own copy.
  const cards = [];
  function mount(c) {
    if (c.port) c.port.close();
    c.port = null;
    const f = document.createElement('iframe');
    let loads = 0;
    f.setAttribute('sandbox', 'allow-scripts'); f.title = c.title; f.setAttribute('srcdoc', c.doc);
    f.addEventListener('load', function () {
      loads += 1;
      if (loads === 1) {
        const ch = new MessageChannel();
        c.port = ch.port1;
        ch.port1.onmessage = function (e) { heardCard(c, e.data); };
        f.contentWindow.postMessage({ type: 'review:hello' }, '*', [ch.port2]);
        return;
      }
      c.resets += 1;
      c.said.hidden = false;
      c.said.textContent = 'This card tried to leave the page.' + (c.resets > 2 ? ' Reload the page to try it again.' : '');
      if (c.resets > 2) { f.remove(); c.port.close(); c.port = null; } else mount(c);
    });
    c.stage.replaceChildren(f);
    c.frame = f;
    fitCard(c);
  }
  function heardCard(c, m) {
    if (!m || m.type !== 'review:answer' || typeof m.text !== 'string') return;
    const text = m.text.slice(0, 2000);
    if (text.trim()) data.answers[c.id] = text; else delete data.answers[c.id];
    persist();
  }
  // Phone and Computer draw the page at that width, scaled to the card; full screen shows it at true size.
  function fitCard(c) {
    if (!c.frame) return;
    const full = c.box.classList.contains('full'), k = full ? 1 : Math.min(1, c.stage.clientWidth / c.width);
    c.frame.style.width = c.width + 'px';
    c.frame.style.height = full ? '100%' : c.height + 'px';
    c.frame.style.transform = k < 1 ? 'scale(' + k + ')' : '';
    c.stage.style.height = full ? '' : Math.ceil(c.height * k) + 'px';
  }
  function full(c, on) {
    c.box.classList.toggle('full', on);
    document.body.classList.toggle('viewing', on);
    c.tools.querySelector('[data-full]').textContent = on ? 'Close' : 'Full screen';
    fitCard(c);
    if (!on) bar();
  }
  all('.live[data-live]', function (box) {
    const old = box.querySelector('iframe'), tools = document.createElement('div'), said = document.createElement('p');
    tools.className = 'live-tools';
    tools.innerHTML = '<button type="button" class="btn-ghost" data-width="390" aria-pressed="true">Phone</button>'
      + '<button type="button" class="btn-ghost" data-width="1280" aria-pressed="false">Computer</button><button type="button" class="btn-ghost" data-full>Full screen</button>';
    said.className = 'muted live-said'; said.setAttribute('role', 'status'); said.hidden = true;
    const c = { box: box, id: box.getAttribute('data-live'), height: +box.getAttribute('data-height') || 640, width: 390, doc: old.getAttribute('srcdoc'),
      title: old.title, stage: box.querySelector('.live-box'), tools: tools, said: said, port: null, frame: null, resets: 0 };
    box.insertBefore(tools, c.stage); box.appendChild(said);
    tools.addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-full')) { full(c, !box.classList.contains('full')); return; }
      c.width = +b.getAttribute('data-width');
      all('[data-live="' + c.id + '"] [data-width]', function (w) { w.setAttribute('aria-pressed', String(w === b)); });
      fitCard(c);
    });
    cards.push(c);
    mount(c);
    // A stage first laid out at no width, as in an Inbox frame still opening, fits again once it gets its width.
    if (window.ResizeObserver) new ResizeObserver(function () { if (c.stage.clientWidth !== c.seen) { c.seen = c.stage.clientWidth; fitCard(c); } }).observe(c.stage);
  });
  window.addEventListener('load', function () { cards.forEach(fitCard); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cards.forEach(function (c) { if (c.box.classList.contains('full')) full(c, false); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    cards.forEach(fitCard);
    if (open) place();
    bar();
  });
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
    all('.form input, .form textarea', function (el) { el.disabled = true; });
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
