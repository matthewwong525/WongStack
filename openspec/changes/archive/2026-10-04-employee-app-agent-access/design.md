# Company actions, generated API context, and a private client

## Context

See [proposal.md](proposal.md) for the narrowed scope. The main Worker already verifies a signed Cloudflare Access identity before business content. Mini-app handlers receive that identity and the Worker's business bindings; the main `/api/` router currently dispatches bare handlers. Neither registry describes inputs or outputs. Employee agents therefore lack a discoverable API even when an app already performs the relevant action.

The existing branch deploy workflow exposes a production-capable deploy token during previews. That is a separate publishing problem, explicitly outside this narrowed change. This feature must not distribute that credential, the owner's `.env` or memory key, or the workspace verification service token to employees. Employees' existing individually installed memory credentials remain under the memory skill's policy. This feature must not claim to enforce the user's future contributor/publisher separation.

Memory already runs in this same production Worker, before the website's Access guard. Its handler checks a hashed per-machine repository credential and enforces team/private ownership. The memory CLI owns semantic search and topic reads over a guarded D1/R2 protocol. A website login only labels an installation; it grants no memory permission. See `wiki/development/memory-key.md` for that existing boundary.

## Goals / Non-Goals

**Goals:** company actions callable through existing Worker URLs; authoritative schemas generated from code; relevant schema available to LLM context on demand; one helper catalogue including existing memory reads; normal employee login for company actions; no underlying business keys on employee machines; unchanged app behavior, memory ownership, and existing authorization.

**Non-goals:** inspecting all keys to infer a universal integration API; implementing business actions for an unspecified service; a generic HTTP/SQL proxy; managing employee roles, merging, or deployments; changing memory identity; a new Worker, database, UI, or provider-management token. Browser-session login is the first version; unattended cloud-to-cloud jobs and their dedicated service credentials can follow separately.

## Decisions

### 1. Extend the existing route registries, not a second execution gateway

Add an endpoint-contract module under `app/worker/api/` shared by the main and mini-app routers. A described action contains a stable namespaced `operationId`, summary, description, input/output schemas, input encoding (`none`, `query`, or `json`), documented error shapes, effect (`read`, `write`, or `external`), and an explicit `agentAvailable` marker. Paths and methods come from the route registration, not duplicate metadata. For v1, describe exact existing routes and scalar query fields; JSON bodies can contain nested JSON. Do not add template path matching merely for discovery.

Use a common serializable operation envelope for company and memory descriptions: namespaced ID, purpose, input/output JSON Schemas, effect, errors, revision, transport and authentication kind. Company registrations add their HTTP method/path; memory registrations identify an installed-client adapter. Shared helper filtering, formatting and operation selection consume this envelope. Authentication and resource checks stay with each existing subsystem. No additional Worker, routing proxy, or per-mini-app copy of the discovery/client machinery is required. Extract dependency-free envelope utilities for both clients only where there is real repeated logic; do not force the core memory skill to depend on the app's installed Node packages.

The registry has an explicit compatible union for legacy bare handlers and described handlers. Legacy handlers keep their paths and behavior and are absent from discovery until reviewed and described. All newly agent-exposed actions must have valid contracts. The example and main health action demonstrate the described form without introducing a business provider.

Dispatch described actions through the same handler whether called from a browser or the client. Supply verified identity to main API handlers as well as mini apps. Preserve existing handler signatures through an adapter; do not replace installed business handlers. Keep resource-specific checks in their existing handlers. A reusable optional operation-level predicate can govern both discovery and execution for an app that already has a general restriction; no new role database is introduced. Being listed does not guarantee access to a particular order or record.

A future integration belongs in a main API handler folder or an existing mini-app folder. The owner asks for a business action, the coding agent reads the real service's documentation, implements the fixed request using the appropriate Worker secret, defines its contract, and takes the normal plan/preview/publish loop. A service key alone cannot supply that business meaning.

**Alternative considered:** a generated proxy over each connected service. Rejected because keys do not define safe operations, arbitrary forwarding expands authority, and browser-only connections may not provide any Worker API at all.

### 2. One schema definition for validation and OpenAPI

Use Zod 4 schemas for described actions and its stable JSON Schema conversion, with OpenAPI 3.1 output assembled from registered methods/paths. This adds one runtime dependency and updates only the app's dependency entry and lockfile; it is not a general dependency update. Preserve Worker compatibility and all current quality limits.

Restrict shared contracts to representable JSON types. Conversion fails on unsupported transforms/custom types; never silently emit unconstrained schemas. Query inputs use the explicit supported serialization subset. Request schemas describe accepted input, response schemas describe returned JSON, and examples use synthetic data. Optional/default behavior and query decoding must match the handler. In particular, preserve Hello's optional name, trimming and truncation behavior rather than adding a stricter length limit that changes the app.

Validate input before executing a described handler. Check described successful JSON output against its output schema and return a sanitized internal-error response on mismatch, rather than forwarding an accidental provider credential/error payload. Give exposed actions bounded request/response sizes and execution time; record legitimate larger limits in their explicit contract. Standard errors carry a stable code, safe message and request identifier, never credentials, raw provider headers, or `.env` values. Existing unexposed routes retain their error behavior.

The contract includes optional connection readiness based on business-binding availability. Discovery can mark a described action unavailable without naming a secret or exposing a value; its call returns a clear unavailable response before provider work. This is a readiness check, not employee authorization.

**Alternative considered:** infer schemas from TypeScript types or let an LLM maintain a separate API document. Rejected because runtime validation, accepted requests, and documentation would drift.

References: [Zod's stable JSON Schema conversion](https://zod.dev/json-schema) supports deriving schemas and rejecting unrepresentable types. [OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.1.html) supplies the published document format. The restrictions above are this design's choices.

### 3. Serve live discovery behind the existing login

Publish `GET /api/openapi.json` for the full document and `GET /api/actions` for a bounded summary list, with app/search filters and pagination. A detail request by operation ID returns that operation and its local schema dependencies. Bootstrap discovery routes are infrastructure and are not recursively advertised as business actions.

The document is generated from the currently deployed registry. Include a deterministic contract revision and ETag so a client can detect publication changes. Stable operation IDs survive ordinary implementation changes. Distinguish production and an explicitly selected staging origin; a preview's schema describes its own deployed actions.

Never include raw memory protocol routes, walk uploads, provider administration, deployment tools, or undeclared legacy routes in company OpenAPI. Exclude unavailable-to-caller company operations when an existing operation-level check provides that information. Schemas contain no binding values, account credentials, or real customer examples. Company discovery requires a verified Access identity even on a site using `WORKSPACE_LOGIN=off`; the safe existing open starter can remain open, but new key-bearing employee actions must not be enabled anonymously. Local substitutes remain confined to explicit loopback development.

This version retains one workspace-level Access application and audience. App-specific Access policies remain a future extension: matching a different path application changes its audience, so later work must adapt the guard and coverage checker together rather than merely add a dashboard rule. Existing supported handler restrictions remain in force now.

### 4. Authenticate the client as the employee using existing Cloudflare functionality

Add `scripts/company-api.mjs` with `login`, `list`, `describe <operation-id>`, and `call <operation-id>` operations. Pass input using a structured JSON file or stdin, not shell interpolation. The CLI resolves registered method/path/encoding from live discovery; it is not a credential-bearing arbitrary URL fetcher.

For HTTP actions, `call` resolves current company discovery. For locally registered `memory.*` actions it selects only the trusted installed memory adapter described below, never a command, executable, or authentication mode supplied by a remote document. Company actions cannot claim the reserved memory namespace. Company and memory credentials are never combined in one request or used as fallback for each other.

Use `cloudflared access login` for first login, capture any token output privately, and use `cloudflared access token -app=<approved-origin>` to obtain the cached application token. The helper then makes HTTPS requests using `cf-access-token` in memory. Cloudflare evaluates the login and the Worker still verifies the signed assertion it receives. Never print tokens or put them into command arguments, repo files, URLs, ordinary caches, model context, or diagnostics. Retain only the normal private per-user Cloudflare session; check that storage is outside the checkout and inaccessible to other OS users, with the existing platform-private-storage conventions used for the helper's own metadata.

Reuse the employee's own browser sign-in, not the owner's browser profile or the verification service-token pair. Session expiry or access removal produces a sign-in/denial instruction; it never falls back to an owner's credential or open mode. No infinite login loop, silent permission widening, or automatic replay of a write follows an authentication or network error. A headless employee host gives the employee the provider's login URL and waits for completion; it does not ask for an API key in chat.

Cloudflare documents first-use browser authentication with a cached session and a new login after expiry in [Authenticate coding agents](https://developers.cloudflare.com/cloudflare-one/access-controls/authenticate-agents/). Its [CLI reference](https://developers.cloudflare.com/cloudflare-one/tutorials/cli/) documents retrieval of an application-scoped token and the request header. We wrap this supported flow, not a new token broker. The actual default `workers.dev` login anchor and headless completion require deployed verification; source tests alone cannot prove them.

Pin a trusted HTTPS company origin in per-user helper metadata after the first connection, using public install metadata as a routing suggestion only. Reject credential forwarding to redirects, different origins, caller-supplied server URLs, or external schema references. A change of company target requires a new explicit connection, not reuse of a cached token. Do not import a configuration helper that loads all owner credentials from `.env`.

### 5. Load context only when the task needs company data

Add one short pointer in the shipped `WONG-STACK` instructions to an owning `wiki/stack/company-api.md` page. It says company actions and described memory reads are available through the helper, to list relevant operations and read their schema. Company calls use the company endpoint rather than requesting a business key; memory calls retain the existing memory client and authorization. Keep the complete procedure and public endpoint names in that page; other docs link to it.

`list` prints bounded summaries with operation ID, purpose, effect and readiness. `describe` prints the selected action's inputs, output, examples and errors with only its local schema dependencies. These outputs are the context the LLM needs. The full OpenAPI document remains downloadable for external tooling but is not loaded at every session start. No new memory hook or startup network request is needed.

`call` uses the current contract for its selected transport and handles structured failures. It executes only the selected operation after the normal agent's action authorization; discovery or description performs no business mutation. Effect metadata helps the assistant explain a requested action but does not itself implement an approval workflow or give permission to send/pay/delete. The same existing handler checks and session rules apply when a caller skips the helper and calls the endpoint directly.

### 6. Keep installation and updates additive

Ship the shared modules and example with the app scaffold, the helper with pack scripts, and the owner documentation with `wiki/stack/`. Record the actual production API origin from provider readback in a new nonsecret `components.companyApi` record; do not copy the meta-repo's values to an install. Explicit targets cover older records until their reviewed setup/update fills that field. No new provider resource is needed.

Adapt the source-only provisioning record writer and the shared config/install guidance, not `/wong-setup` or `/wong-sync` execution in this meta-repo. A sync inventories custom routes, preserves handler code and existing guards, and offers contracts for the actions the owner wants shared. Unselected routes remain functional and undescribed. Do not bulk expose every route, duplicate a service key, or turn legacy admin/memory routes into employee APIs.

Add a minor-release changelog entry whose Updating note tells the owner to ask which existing processes should be callable. Leave VERSION for /ship. No UI or database migration is needed; the old deployment/publication permissions remain unchanged and must be described honestly.

### 7. Add memory descriptions through its existing client, preserving authority

Add a small dependency-free operation registry/adapter inside `.agents/skills/memory/`, initially for `memory.search` and `memory.show`. Define their supported structured inputs alongside their existing command option metadata and type/enum/bound checks; use those definitions to generate their JSON Schema descriptions and adapter argument mapping. Descriptions have a deterministic local contract revision and synthetic examples, with successful output explicitly represented as a bounded text result rather than claiming the existing CLI returns structured facts. Preserve existing direct CLI behavior. The adapter's small supported input surface does not include raw SQL, arbitrary paths, credential/owner selection, or admin-wide `--everyone`. Reject unknown properties before any store request.

The adapter invokes the existing memory command path with an argument array and no shell, collecting bounded, redacted output and normalizing safe errors. It must not reimplement FTS, SQL construction, the Worker privacy filters, transcript access, credential issuance or capture. If a small command export is needed, keep that extraction under memory's ownership and preserve existing CLI callers. Memory remains runnable without installing the app or logging into the company API.

`list` and `describe` merge the installed memory descriptions with available live company descriptions using the common envelope and the same selective-context formatting. Include source, transport, authentication kind and separate revisions; do not present an installed command as a deployed HTTP endpoint. OpenAPI remains a truthful description of actual company HTTP routes, while the helper's combined catalogue also describes memory-client operations. No second manual API document or new memory schema endpoint is required. Support selecting company or memory scope. A failed company login must not hide memory descriptions or block a memory call. Known descriptions do not establish readiness: missing, revoked or unreachable memory credentials are distinct states, and metadata-only listing must not claim a successful store request.

Memory calls use the existing primary-checkout resolver, recorded `components.memory.worker` and private per-machine credential through the memory client. A company target override or preview selection cannot redirect that credential; it never goes to company HTTP endpoints. Company login cannot enroll memory, change roles or access another machine's private facts. Reuse existing credential redaction and cache-denial behavior. Enforce origin/redirect protection at the memory client's existing transport as needed rather than route its credential through the company session client. Preserve server denial for wrong-repository, revoked and missing credentials. Staging and previews still have no production memory bindings and answer memory requests with 404.

Existing digest/capture hooks, background runs, fact writes and their gate continue through the memory skill unchanged. This first adapter adds read access only. The company API owning doc links to `wiki/development/memory-key.md` for authorization instead of duplicating that policy. Document the short adapter procedure in the memory skill, and include its descriptions/utilities in the core skill payload; the stack-pack helper remains an optional additional entry point. There is no new startup request, enrollment step, database or permission model.

**Alternatives considered:** publishing the raw D1/R2 protocol as employee actions would give agents the wrong abstraction; implementing a second semantic memory service would duplicate the CLI's search logic; replacing memory credentials with Access would change the user's chosen machine-private model. Reuse the existing semantic commands and authorization instead.

## Risks / Trade-offs

- **A schema can describe a bad handler** → require the ordinary reviewed code change; fixed provider requests, declared outputs, meaningful tests and existing record checks remain necessary. The schema is not authorization.
- **A local-only or browser-only connection is unavailable to a Worker** → report that limitation and plan a specific server connection when requested; never move the owner's broad provider token automatically.
- **App and LLM schemas diverge** → one descriptor supplies dispatch validation and discovery; conversion and compatibility tests cover the actual registrations.
- **Stale context or transient call failure** → identify the live contract revision and fetch current details; never repeat a mutation automatically when its outcome is uncertain.
- **Stored employee sessions are still credentials** → keep them in private OS-user state and out of LLM output; this avoids distributing business keys, not authentication altogether.
- **Existing preview credentials remain too powerful for untrusted contributors** → no claim this change solves employee publishing; keep future contributor access restricted until the separate publishing boundary is implemented.
- **A new dependency grows the Worker** → use only schema validation/conversion required by this feature and inspect deployed build/bundle results in CI without weakening checks.
- **A combined catalogue is mistaken for combined authority** → label each operation's source/authentication and keep separate credential paths; successful company login never proves memory access.
- **Local memory descriptions are mistaken for live HTTP endpoints** → identify transport and local revision explicitly, omit invented endpoints from OpenAPI, and verify the adapter matches the installed command behavior.

## Migration and rollback

1. Implement and verify the registry/client with synthetic health/greeting data. Ship no real third-party action or key in the template.
2. Adapt existing routes through review; unconverted routes keep their behavior and are omitted from the guide. Preserve any target's custom app, login configuration and record restrictions.
3. A protected install publishes company discovery and records its real origin. An employee with an allowed email signs in and calls the same described action their browser app uses. An open install reports login required for company API use; existing credentialed memory remains independent.
4. Later business integrations are separate ordinary changes with their own handlers, examples, key handling and deployed acceptance.
5. Rollback removes the discovery/helper additions or reverts the compatible route adapters without changing existing business data or Access membership. Cache entries keyed by contract revision become stale; no helper may send a removed or mismatched action using old schema.
6. Add memory descriptions and the helper adapter without credential replacement or data migration. Removing them leaves the existing memory CLI, automatic hooks, private ownership and store protocol working as before.

## Validation

Tasks below require endpoint/contract compatibility tests, authentication/secret-handling tests and deployed acceptance. Keep CI as the source gate, existing absolute app coverage and all meaningful assertions. /save supplies the exact-revision remote checks and preview; no local build/test gate is introduced. Real employee login, denial, app/agent parity and new-action discovery are separate observed checks against that preview, with unknown results reported honestly.

Extend existing memory/client fixtures for descriptor/adapter parity, standalone operation, cross-machine privacy, credential separation, redirect/target refusal, and readable missing/revoked states. Preview evidence cannot prove production memory reads because previews have no memory bindings. Verify combined memory access through a separately authorized production installation with harmless existing reads if available; otherwise report that integration unverified without borrowing an admin key or moving production bindings into staging.
