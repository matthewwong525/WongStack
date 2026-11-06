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
