# Company actions for assistants

Company actions let an employee’s assistant use the same approved work as an app, while service keys stay on the company’s server. Ask for the work you want available, such as “let the team look up an order.” The assistant builds a specific action, describes it, and follows [the usual change loop](../development/the-change-loop.md).

A saved key cannot explain which business actions are safe, their inputs, or who may use a record. Each integration needs a deliberately implemented handler. The supplied health and [Hello greeting](../../app/worker/apps/hello/greeting.ts) demonstrate the pattern with synthetic data; they prove no outside service connection.

## Define an action once

Main routes live in [the main router](../../app/worker/api/router.ts); mini-app routes keep [their existing folders](mini-apps.md). Use [the shared contract](../../app/worker/api/contract.ts), as [health](../../app/worker/api/health.ts) and greeting do. Paths and methods come from the route list. Zod schemas supply both input/output checks and the generated API guide; unsupported definitions, duplicate IDs and invalid examples fail the checks. Use a stable namespaced ID, purpose, scalar query or nested JSON input, successful JSON output, safe errors, synthetic examples, and `read`, `write` or `external` effect.

Described actions require verified identity by default. Only a harmless public example may explicitly set `requiresIdentity: false`; a connection readiness check still requires identity. An optional existing action guard controls both visibility and execution. Record checks remain inside the handler. A description never grants access to a particular order or fact. Business bindings exclude the memory store for mini apps; [memory authorization](../development/memory-key.md) remains separate.

Requests and successful outputs are validated and bounded. A bad output or provider exception becomes a safe error with `code`, `message` and `requestId`. The handler receives an abort signal; pass it to provider calls so a timeout can stop work. A timeout can leave a write’s outcome unknown, so the assistant must check the result before repeating it. A `ready` predicate can report a missing server connection without naming or returning a secret.

Existing bare handlers retain their paths, behavior and guards, and stay absent from discovery. During a reviewed update, inventory the target’s custom routes, describe only the actions its owner selects, and preserve its handler code and access checks. Never replace a custom handler with the template example or copy a saved business key to an employee.

## Map business routes before employee policy

An enabled [employee policy](employee-access.md#enable-current-app-checks) checks current membership and app grants before either a bare handler or a described action runs. Mini-app APIs use their folder's stable app slug automatically. Main APIs require an exact method/path entry in `routeAccess` beside the route in [the main router](../../app/worker/api/router.ts). For example, a reviewed orders handler at `GET /api/orders` uses `{ apps: ["orders"] }`; a shared orders/payroll handler uses `{ apps: ["orders", "payroll"] }` and requires both grants. A missing, empty or invalid mapping denies business work. New app IDs receive no employee grant automatically.

Only explicitly reviewed harmless infrastructure uses `{ kind: "infrastructure" }`; the supplied health response is such an exception. It returns no business data and still passes the Worker's existing login boundary. Core owner operations and employee self-service use separate finite exceptions. Self-service requires current membership even with no selected apps; a removed person is denied. Existing action visibility, connection-readiness and handler record checks still apply after the app check.

Each business call reads installation, membership and selected apps together from a D1 session beginning at the primary. The server retains no positive permission cache between requests. A request admitted before a removal may finish; the next request observes the committed removal, including with the same unexpired app login. Missing or unavailable authority returns a safe unavailable response. Preserve this mapping and every existing custom handler during updates.

[Employee access activation](employee-access.md) uses private operator configuration and a verified owner session. Its core identity/activation endpoints are administration, absent from action discovery. Activation alone assigns no employee app or project access.

## Discover only what the task needs

Verified [company login](cloudflare-access.md) protects these live endpoints, including on an otherwise open starter:

- `GET /api/actions` — bounded summaries: ID, purpose, effect, readiness, source and revision. Filter with `q` and `app`, paginate with `limit` (1–50, default 20) and `offset`.
- `GET /api/actions?id=hello.greeting` — only that action’s inputs, output, synthetic examples, safe errors and local schema dependencies.
- `GET /api/openapi.json` — OpenAPI 3.1 for deliberately described HTTP routes, with actual methods and serialization. It omits bare handlers, administration, raw memory and preview-picture routes.

The document and summaries carry a deterministic revision and ETag. New published registrations appear on the next lookup. Never load the full schema at chat startup; list relevant actions and describe the selected one when needed.

## Connect and call

Run [the helper](../../scripts/company-api.mjs) from the repository root. It reads only public install metadata for company routing. New installs record `components.companyApi.origin` in `.claude/.wong-stack.json`, using the production Worker name and the account hostname read back during provisioning. Older records can use an explicit origin until the reviewed update fills it.

```bash
node scripts/company-api.mjs login --origin https://company.example.com
node scripts/company-api.mjs list --scope company --q greet
node scripts/company-api.mjs describe hello.greeting
node scripts/company-api.mjs call hello.greeting --file - <<'JSON'
{"name":"Ada"}
JSON
```

`login` confirms the HTTPS company origin for this OS user. It uses [cloudflared’s employee sign-in](https://developers.cloudflare.com/cloudflare-one/tutorials/cli/), opens the employee’s browser, checks discovery, and privately records the target outside the repository. Install a missing helper at [the point of need](../development/required-tools.md); use [browser hand-over](../development/browsing.md#hand-the-browser-over) when the employee must finish login. On a headless host, only a validated provider login URL is shown while the helper waits. Never print the token or raw login output.

Keep `~/.cloudflared` owned by the current OS user, mode 0700, with token files mode 0600. The helper captures token output privately and sends it only in request headers to the connected origin. Cloudflared caches the normal session; expiry or removal requires the employee’s own login again. Changed public routing requires an explicit connection. Redirects, arbitrary server URLs and outside schema references are refused. The helper never borrows owner, deploy, business, memory or verification credentials for company calls.

`list` and `describe` perform no business action. `call` consults the live selected contract and executes it once. Check a failed write’s outcome before repeating it; the helper never retries it automatically. Effect metadata helps explain work, while the assistant’s normal action authorization still applies.

## Memory keeps its own access

`list --scope memory` describes installed fact reads plus `memory.documents` and `memory.recall` without company login or a store request. [Document retrieval](../development/document-retrieval.md) needs only checkout access; recall uses the existing credential for facts and reports each source independently. `list` combines these with company summaries; company connection failure leaves installed reads available. Source, transport, authentication and separate revisions identify each operation. Readiness is `not_checked` until a call; a description proves no active credential or prepared model.

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

Company target choices never select memory’s destination: the existing client keeps the primary checkout’s production record and installed credential. Company login grants no memory permission, enrollment or ownership change. Matching website labels on two machines never join private facts. Missing or revoked memory credentials follow [the memory-key procedure](../development/memory-key.md); there is no fallback. Automatic capture, read hooks and the memory write gate stay as they are. Preview memory remains unavailable with 404.

Part of [the Cloudflare stack](README.md).
