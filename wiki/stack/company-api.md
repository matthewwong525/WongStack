# Company actions for assistants

Company actions let an employee’s assistant use the same approved work as an app, while service keys stay on the company’s server. Ask for the work you want available, such as “let the team look up an order.” The assistant builds a specific action, describes it, and follows [the usual change loop](../development/the-change-loop.md).

A saved key cannot explain which business actions are safe, their inputs, or who may use a record. Each integration needs a deliberately implemented handler. The supplied health and [Hello greeting](../../app/worker/apps/hello/greeting.ts) demonstrate the pattern with synthetic data; they prove no outside service connection. To find what a chat can use, actions and keys used directly, start with [the services list](service-catalogue.md).

## Define an action once

Main routes live in [the main router](../../app/worker/api/router.ts); mini-app routes keep [their existing folders](mini-apps.md). Use [the shared contract](../../app/worker/api/contract.ts), as [health](../../app/worker/api/health.ts) and greeting do. Paths and methods come from the route list. Zod schemas supply both input/output checks and the generated API guide; unsupported definitions, duplicate IDs and invalid examples fail the checks. Use a stable namespaced ID, purpose, scalar query or nested JSON input, successful JSON output, safe errors, synthetic examples, and `read`, `write` or `external` effect.

Give each top-level input a one-line description with Zod's `.describe()`, so an assistant knows what to fill in. An input without one fails the checks, which name the action and the input.

An action that changes something may set `confirmWith` to the ID of the `read` action that shows whether the change happened. The checks reject a name that is not a registered `read` action, and a `read` action that sets one. Discovery names it only to a caller who may see that read. Leave it out when nothing can be read back, such as a sent message.

Described actions require verified identity by default. Only a harmless public example may explicitly set `requiresIdentity: false`; a connection readiness check still requires identity. An optional existing action guard controls both visibility and execution. Record checks remain inside the handler. A description never grants access to a particular order or fact. Business bindings exclude the memory store for mini apps; [memory's roles](../development/memory.md#who-sees-what) come from the same sign-in.

Requests and successful outputs are validated and bounded. A bad output or provider exception becomes a safe error with `code`, `message` and `requestId`. A bad input also lists up to ten `issues`, each with the input's `path` and the reason, so the assistant fixes it in one retry, not by guessing. A request that cannot be read gets one issue with fixed text; the body is never quoted back, and issues holding a credential value are dropped. The handler receives an abort signal; pass it to provider calls so a timeout can stop work. A timeout can leave a write’s outcome unknown, so the assistant must check the result before repeating it, with the action's `confirmWith` read when it names one. A `ready` predicate can report a missing server connection without naming or returning a secret.

Existing bare handlers retain their paths, behavior and guards, and stay absent from discovery. During a reviewed update, inventory the target’s custom routes, describe only the actions its owner selects, and preserve its handler code and access checks. Never replace a custom handler with the template example or copy a saved business key to an employee.

## Map business routes before employee policy

Once [Access permissions have started](employee-access.md#the-first-open), the Worker checks current membership and that the caller holds [the app](employee-access.md#apps) before either a bare handler or a described action runs. A mini app's API uses its folder's stable slug automatically; [a server folder with no screen](mini-apps.md#work-with-no-screen) is mapped to its keys alone. Main APIs require an exact method/path entry in `routeAccess` beside the route in [the main router](../../app/worker/api/router.ts). For example, a reviewed orders handler at `GET /api/orders` uses `{ apps: ["orders"] }`; a shared orders/payroll handler uses `{ apps: ["orders", "payroll"] }` and requires both apps. A missing, empty or invalid mapping denies business work, and the checks fail on a mapping that names a folder nobody built. A new app is given to no employee automatically.

A held app runs every call mapped to it, reads and changes alike, and no key level is checked. Without the app the refusal is `App access denied`.

Only explicitly reviewed harmless infrastructure uses `{ kind: "infrastructure" }`; the supplied health response is such an exception. It returns no business data and still passes the Worker's existing login boundary. Core owner operations and employee self-service use separate finite exceptions. Self-service requires current membership even with no selected apps; a removed person is denied. Existing action visibility, connection-readiness and handler record checks still apply after the app check.

Each business call reads installation, membership, apps and key levels together from a D1 session beginning at the primary. The server retains no positive permission cache between requests. A request admitted before a removal may finish; the next request observes the committed removal, including with the same unexpired app login. Missing or unavailable authority returns a safe unavailable response. Preserve this mapping and every existing custom handler during updates.

[Access](employee-access.md) knows its owner by the recorded sign-in email. Its people-management routes are administration, absent from action discovery. Before permissions start, every signed-in person keeps their existing access. Repository authentication stays manual through its provider.

## List the keys a route uses

A route is handed only the saved keys it lists. A person needs [a level](employee-access.md#key-levels) for each one only when the route belongs to keys alone. Name a key by its id in [the key registry](../../app/worker/keys.ts).

- **An action lists its own keys**: `keys: ["stripe"]` in its definition.
- **A mini app lists the keys its routes share**: `export const keys = ["stripe"]` in its `api.ts`. Its bare handlers get those, and so do its actions that list none.
- **A main route lists them in its mapping**: `{ apps: ["orders"], keys: ["stripe"] }` in `routeAccess`. An action's own list comes first.
- **A route that lists none gets none.** Every other saved key is left out of the `env` the handler is handed, in a main route and a mini app alike.

**A route can belong to a key alone.** Map it `{ keys: ["cloudflare"] }`, with no `apps`: [the key's level decides](employee-access.md#a-key-with-no-app) and no app is needed. A mapping with no keys, or with a key nobody registered, denies everyone.

The level such a call needs comes from what it does: an action with `effect: "read"` needs Read, and `write` or `external` needs Read & write. A bare handler has no effect to read, so `GET` and `HEAD` need Read and every other method needs Read & write; a `POST` that only looks things up is better described as an action with `effect: "read"`. A listed key that is not saved answers `unavailable` before the handler runs, so a `ready` check for a missing key is no longer needed.

`node scripts/check-app-keys.mjs` runs with the code checks, as [the skill check](#build-a-skill-on-actions) does. It fails when a file under `app/worker/apps/<name>/` or `app/worker/api/` names a registered secret whose key the file, the app's `api.ts`, or the main router does not list. Like [the memory exclusion](mini-apps.md#the-rules), handing out only listed keys stops mistakes, not code written to get around it: handlers share one Worker.

## Look things up in Cloudflare

`cloudflare.read`, at `GET /api/cloudflare/read`, sends one `GET` to the Cloudflare API with [the read-only key setup made](cloudflare-credentials.md#the-read-only-look-up-key) and returns Cloudflare's `success`, `result`, `result_info` and `errors`. It belongs to the Cloudflare key alone: a person with *Cloudflare: Read* can have their assistant read settings, logs and usage with no app ticked, and nobody is handed the key.

- **Input:** `path`, an API path with no leading slash, and an optional `query` string. `accounts` lists the account and its id; then `accounts/<account id>/...` or `zones/...`.
- **This account only, and no stored data.** Another account's path is refused. So are paths under D1, KV, R2, Queues, Vectorize, Hyperdrive, Durable Objects, Secrets Store, Stream and Images, and the key has no permission for them: two locks on the app's database, files and memory. A path with `.` or `..` is refused too.
- **It changes nothing, and its answer is bounded.** One method, `GET`, and a key with no write permission. An answer over about 1 MB says to narrow the request.

Read & write is not offered for Cloudflare: a write key held by the live app would be close to full control of the account.

## Use a key directly

A saved key can be used with no built action, once its service is set up. The caller's [level for the key](employee-access.md#key-levels) decides, and nothing else switches it on. The app passes one request on and adds the key, which never reaches the person's device.

- **Two actions per key, each the key's alone.** `<key>.read`, at `POST /api/direct/<key>/read`, needs Read. `<key>.change`, at `POST /api/direct/<key>/change`, needs Read & write.
- **Input:** `method`; `path`, under the service's address with no leading slash; optional `query`, `body` and `contentType`. **Output:** the service's `status`, `contentType` and `body`. A status of 400 or more is the service's own refusal.
- **A look-up is a `GET`, a `HEAD`, or a request the key's setup names.** `<key>.read` answers `not_a_lookup` to anything else.
- **It reaches only its own service.** A path that leaves the address is refused and no redirect is followed. An answer over about 1 MB says to narrow the request, and one holding the key is never returned. Each request is logged with who sent it, never its query or body.

Before a direct call, read the service's [notes page](service-catalogue.md#notes-on-each-key-based-service), and add a call you worked out there.

**Build an action instead** for work done again and again, or that touches money or customers: only a built action can limit a person to one record. Direct use opens everything the key can see; make a narrower key at the service when that is too wide.

**Set a service up when you save its key.** Doing so opens the service to the owner, and to everyone who holds a level for that key. Add `forward` and `docs`, the guide's HTTPS link, to its entry in [the key registry](../../app/worker/keys.ts), from the service's own API guide, as the commented entries there show. The registry's comments say what each field is. `lookups` names, as `METHOD path` with `*` for one path part, only requests the guide documents as read-only: a wrong entry lets Read change things. A service that works through one `POST`, such as GraphQL, gets none, so it needs Read & write. A key renewed through a sign-in, such as Google's, can't be set up: build an action. The app's tests fail on an entry that breaks a rule.

## Use an MCP server through the app

An outside MCP server goes through the app, never into a chat's own server settings such as `.mcp.json`. A server connected to a chat loads every one of its tool descriptions into every chat, even one that never uses it; through the app, a chat sees them only when a task asks.

- **Set it up as a key used directly**, [as above](#use-a-key-directly), with `mcp: { path, reads }` in its `forward`: `path` is the server's address under `base`, and only that path is passed on. A public server names no secret, `secret` or `header`:
  ```ts
  deepwiki: { title: "DeepWiki", purpose: "Questions about public code", secrets: [], docs: "https://docs.devin.ai/work-with-devin/deepwiki-mcp",
    forward: { base: "https://mcp.deepwiki.com/", mcp: { path: "mcp", reads: ["read_wiki_structure", "ask_wiki_question"] } } },
  ```
- **`reads` names the tools that only look things up.** List only tools the server marks read-only, each checked by hand. Opening the session and listing tools also need only Read; any other tool, including one the service adds later, needs Read & write.
- **Call it with the helper:** `node scripts/company-api.mjs mcp <key> tools` lists the tools, `tools <name>` shows one tool's arguments, and `mcp <key> tool <name> --file -` runs one with its arguments as JSON. It keeps the server's session across calls and tries Read first.

A service-specific helper may wrap [`scripts/mcp-session.mjs`](../../scripts/mcp-session.mjs) for friendlier commands.

## Connect and call

From an empty folder, use the [setup message](employee-project.md#install-in-one-step). A copy that [Connect your assistant installed](employee-project.md#install-in-one-step) is an installed project: run the helper from inside it with no `--state`. It finds the sign-in setup saved for the origin the copy records, and setup checks this before saying *Nothing else is needed*. A reused sign-in starts the summary with *Used this computer's existing sign-in as <email>*: a shared computer never connects as someone else unnoticed. Installed projects run [the helper](../../scripts/company-api.mjs) from the repository root; `--state` can select the same private connection, while existing private folder locators remain compatible. It reads only public install metadata for company routing. New installs record `components.companyApi.origin` in `.claude/.wong-stack.json`, using the production Worker name and the account hostname read back during provisioning. An older record names only `components.memory.worker`; a workspace then uses that app's sign-in, else its main copy's.

```bash
node scripts/company-api.mjs login --origin https://company.example.com
node scripts/company-api.mjs list --scope company --q greet
node scripts/company-api.mjs describe hello.greeting
node scripts/company-api.mjs call hello.greeting --file - <<'JSON'
{"name":"Ada"}
JSON
```

`login` confirms the HTTPS company origin for this OS user. It uses [cloudflared’s employee sign-in](https://developers.cloudflare.com/cloudflare-one/tutorials/cli/), opens the employee’s browser, checks discovery, and privately records the target outside the repository. Install a missing helper at [the point of need](../development/required-tools.md); the employee finishes login in their own browser ([when a step needs you](../development/browsing.md#when-a-step-needs-you)). On a headless host, only a validated provider login URL is shown while the helper waits. Never print the token or raw login output.

Keep `~/.cloudflared` owned by the current OS user, mode 0700, with token files mode 0600. The helper captures token output privately and sends it only in request headers to the connected origin. Cloudflared caches the normal session; expiry or removal requires the employee’s own login again. Changed public routing requires an explicit connection. Redirects, arbitrary server URLs and outside schema references are refused. The helper never borrows owner, deploy, business, memory or verification credentials for company calls.

`list` and `describe` perform no business action. `call` consults the live selected contract and executes it once. Each prints [a short answer](service-catalogue.md#short-answers-in-the-chat); `--full` prints a long one whole. A call that returns an error, company or memory, still prints the error and ends with a failing exit status, so a script stops there. Check a failed write’s outcome before repeating it; the helper never retries it automatically. When a write times out or its connection drops and it names a confirming read, the helper names that read in the error: run it first, and repeat the write only if the change is missing. Effect metadata helps explain work, while the assistant’s normal action authorization still applies.

## Build a skill on actions

A skill that reads or changes business data does it through company actions, never with a key. It then runs under the login of whoever uses it, so it works on every teammate's device, which holds no business key, and the app decides what each of them may do. A skill that reads a key from your own files works for you alone.

When someone asks for such a skill:

1. **Build or reuse the action first.** Find one with `list`, or [define it](#define-an-action-once) in the app: in a mini app's folder, or [behind a key](mini-apps.md#work-with-no-screen) when the work fits no app. A one-off job nobody has built may list a key's [direct actions](#use-a-key-directly), `<key>.read` or `<key>.change`.
2. **List what the skill calls** in `actions.json` beside its `SKILL.md`: `{ "title": "Refund a customer", "actions": ["orders.lookup", "orders.refund"] }`.
3. **Call each action through the helper**, as [above](#connect-and-call): `node scripts/company-api.mjs call <id> --file -`.
4. **Never read a business key in the skill**: no `.env`, no `app/.dev.vars`, no secret's name.

Nobody is given a skill, and [Access lists none](employee-access.md#skills): the app judges each call by the caller's apps and key levels, like any other call.

Two checks hold the rule. `node scripts/check-skill-actions.mjs` runs on every check run and fails, naming the skill, when a file in a skill folder names a business key's secret, calls an action its `actions.json` does not list, or the file is malformed. A key setup makes, or the Worker itself uses, is the stack's own and may be named; a `memory.*` read needs no listing. The app's suite fails when an `actions.json` lists an action no route registers. An id built while the skill runs is caught only by review, so write each id out.

## Memory uses the same sign-in

`list --scope memory` describes installed fact reads plus `memory.documents` and `memory.recall` without company login or a store request. [Document retrieval](../development/document-retrieval.md) needs only checkout access; recall reads facts with the company sign-in and reports each source independently. `list` combines these with company summaries; company connection failure leaves installed reads available. Source, transport, authentication and separate revisions identify each operation. Readiness is `not_checked` until a call; a description proves no live sign-in or prepared model.

```bash
node scripts/company-api.mjs describe memory.search
node scripts/company-api.mjs call memory.search --file - <<'JSON'
{"terms":"delivery","limit":5}
JSON
node scripts/company-api.mjs call memory.show --file - <<'JSON'
{"slug":"sample-topic"}
JSON
```

The [memory-owned adapter](../../.agents/skills/memory/scripts/operations.mjs) validates its supported inputs and invokes the existing read commands. Its result is bounded text with a `truncated` flag. It exposes no raw SQL, credential selection, admin-wide option or arbitrary command. It also works independently through [the memory skill](../../.agents/skills/memory/SKILL.md).

Company target choices never select memory’s destination: the client keeps the primary checkout’s production record. Memory and company actions share one sign-in, so `company-api.mjs login` renews both, and [the app's Access page](employee-access.md) sets memory's role. A memory call with no live sign-in fails and says to run `login` again ([sign-in and expiry](../development/memory.md#sign-in-and-expiry)). A company action whose session ended prints the same step. Automatic capture, read hooks and the memory write gate stay as they are. Preview memory remains unavailable with 404.

Part of [the Cloudflare stack](README.md).
