# One definition per outside service, and a services skill

**Status:** planned
**Branch:** not yet saved
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
