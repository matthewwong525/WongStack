# The services list

The services list is where a chat starts for any outside service: one short list of the saved keys you can use, then a search, one opened entry, and a call through the app. The app holds every business key, so a chat never reads one from a file. [Company actions](company-api.md) owns how an action is built and how the helper signs in.

When no action or key can do a task on a website, the agent does it in [the browser](../development/browsing.md), as you.

```mermaid
flowchart TD
  services --> search["list --q"] --> describe --> call
  call --> short["short answer, or a file"]
```

## List the services you can use

```bash
node scripts/company-api.mjs services
```

```text
Stripe   Payments and refunds   ready  Read
  notes: wiki/services/stripe.md  guide: https://docs.stripe.com/api
Notion   Team notes and docs    not saved yet: ask the owner
  notes: none yet; start wiki/services/notion.md
2 more keys need access: ask the owner
```

- **A key shows when you hold a level for it**, with its purpose line, whether it is saved, your [level](employee-access.md#key-levels), and for a key used directly the link to the service's API guide. An MCP server's row adds the command that lists its tools: [use an MCP server through the app](company-api.md#use-an-mcp-server-through-the-app). The other keys are one count. `--all` lists them too, each with no level.
- **Each row names its [notes page](#notes-on-each-key-based-service)**, and whether it exists yet.
- **Project code is left out**: it is the stack's own key, reached through [the project's route](employee-project.md#who-gets-what).
- **The list stays short.** One row per service, however many actions each has, at most 200 rows, and never a key value. `--json` prints the whole answer.

A row says what to do next. A key that isn't saved: [send its key link](../development/secrets.md#receive-a-key-through-a-private-link). A key you have no level for: ask the owner or an Admin.

Behind it is `GET /api/services` (`?all=1` for every key), with the same login, cache and credential rules as the action list below. Each key's purpose and guide link come from [the key registry](api-keys.md#a-saved-key-shows-in-access).

## Discover only what the task needs

Verified [company login](cloudflare-access.md) protects these live endpoints, including on an otherwise open starter:

- `GET /api/actions` — bounded summaries: ID, purpose, effect, readiness, source, revision, and `keys`, the saved keys the action uses with the level a caller needs. Filter with `app` and with `q`, which finds an action when every word appears in its ID, purpose or description, in any order: `look up order` finds *Look up an order*. Paginate with `limit` (1–50, default 20) and `offset`.
- `GET /api/actions?id=hello.greeting` — only that action’s inputs, output, synthetic examples, safe errors and local schema dependencies. Each of its `keys` adds the key's name, purpose line and, when it has one, `docs`, the service's API guide, so you need no second look-up. `describe` in the helper adds each key's `notes`: its [notes page](#notes-on-each-key-based-service) path and whether it exists yet.
- `GET /api/openapi.json` — OpenAPI 3.1 for deliberately described HTTP routes, with actual methods and serialization. It omits bare handlers, administration, raw memory and preview-picture routes. `info.description` says how to use it in a few lines. Each key your actions use is a tag, with its purpose and guide link; each operation names its keys' tags. A key's own `<key>.read` or `<key>.change` also carries the guide as `externalDocs`, since the guide is that request's reference. A built action keeps its guide on the tag: its handler is the contract.

Once [Access permissions have started](employee-access.md#what-a-persons-apps-govern), all three endpoints read current membership, apps and [key levels](employee-access.md#key-levels) before describing an action or answering a conditional request. A person who holds an app sees all its actions, reads and changes; a key's own action shows only at the level it needs. A key's tag shows only beside an action you can see. Main registrations use the same reviewed method/path mappings as dispatch; a shared action requires every mapped app. Existing action visibility checks also apply. An unassigned new app stays hidden, and an unavailable policy returns an unavailable response.

The document and summaries carry a deterministic contract revision. Each ETag also includes the caller, current policy revision and selected response, so an old grant, another caller or another query cannot reuse a permitted response. Selected-action authorization and input checks run before a 304 response. Responses require private cache revalidation; denials are never cached. New published registrations appear on the next lookup. Never load the full schema at chat startup; list relevant actions and describe the selected one when needed.

## Short answers in the chat

The helper keeps each answer small, so one call can't fill the chat:

- **`list` prints one line per match**: `<id>  <read|change>  <readiness>  <summary>`, then `next: --offset N` when there are more.
- **`describe` prints one action's contract** as compact JSON, without [the shared error shape](#the-shared-error-shape).
- **`call` prints an answer of up to about 20 KB as JSON.** A longer one is saved whole to a private file, readable only by you, in your own `wong-answers-<user>/` folder under this computer's temporary folder, cleared after 24 hours. The helper prints `{ "truncated": true, "bytes": N, "file": "<path>", "preview": "…" }`, with the first few KB as the preview. Read the file for the rest, a part at a time.
- **A failed call prints its error whole** and exits non-zero, so a script stops there.

`--json` on `list` or `describe` prints the full object, and `--full` on `call` prints the whole answer. A script that reads a long answer adds `--full`; one that reads short answers needs nothing.

## The shared error shape

Every refusal, from an action or a key used directly, has one shape:

```json
{ "error": { "code": "unavailable", "message": "Connection unavailable", "requestId": "…" } }
```

`message` is plain words, safe to show the person. A bad input adds `issues`, as [an action's errors](company-api.md#define-an-action-once) say. A `timeout` means the outcome is unknown: check before you repeat a change.

## Notes on each key-based service

What chats learn about a key-based service lives in that install's wiki, one page per key: `wiki/services/<id>.md`, such as `wiki/services/notion.md`. The guide link stays the source; the notes are what earlier chats proved works.

1. **Read the notes first.** Before using a key directly, open the page its row in `services` names.
2. **Make the page on first use.** No page yet: write the `#` title, the purpose line and the guide link, then what you learn. The first page also makes the hub, `wiki/services/README.md`, and links it from the wiki's root, as [people pages](../wiki-style.md#people) do.
3. **Add each call you worked out**: the method and path, the inputs that mattered, and a pitfall. Save it in the next wiki save, like any page ([repeatable knowledge](../wiki-style.md#repeatable-knowledge)).

```markdown
# Notion

Team notes and docs. API guide: https://developers.notion.com/reference

## Search pages

`POST search` with `{"query": "…", "filter": {"property": "object", "value": "page"}}`.
Pitfall: a page shows only once it is shared with the key's integration.
```

A notes page never holds a key value, a sign-in, or a customer's data. WongStack ships none: each install writes its own.

Part of [the Cloudflare stack](README.md).
