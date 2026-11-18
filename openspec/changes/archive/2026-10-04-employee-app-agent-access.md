<!-- openspec-archive v1 2026-10-04-employee-app-agent-access -->
<!-- file proposal.md utf8 15459 -->
# Let agents use company connections through a described API

**Status:** ready-to-ship

**Branch:** stiff-camel

**Open questions:** none

## Why

An employee's assistant should be able to use the company's connected services without receiving the business's secret keys. It should discover those actions and its existing memory access through one helper, with descriptions it can load when needed rather than asking the owner to reconnect or explain every tool.

## What Changes

- **Use the company's connections through its Worker.** The owner asks to make a connected process available, such as looking up orders. The assistant builds the company's approved actions around the existing connection. Both an app and an employee's assistant call those actions; the company's secret stays on the server. A key by itself does not automatically expose every action the outside service supports.
  ```text
  owner: “Make order lookup available”
                    │
              approved company action
                    │
  company app ──────┤
  employee's agent ─┘
                    │
                    ▼
              company Worker
              uses the saved key
                    │
                    ▼
              connected service
  ```

- **Define each action once and generate its API guide.** An action's definition explains what it does, its inputs, outputs, errors, and whether it changes anything. WongStack uses that same definition to publish a live OpenAPI schema and check requests. The coding assistant creates the definitions while building the action; the owner does not write schemas or maintain a second document.
  ```text
  action + input/output definition
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
    API guide  input check  live endpoint
  ```

- **Give the assistant the right context when it needs it.** Every repo points agents at the company API. The agent can list available actions, load the full schema for a relevant action, and call it through a small helper. It reads the live company version, so newly published actions appear automatically. The full API guide does not fill every chat's starting context.
  ```text
  session starts ──▶ short API pointer
                             │
                    work needs company data
                             │
                    list available actions
                             │
                    read relevant schema
                             │
                    call company endpoint
  ```

- **Employees sign in; they never copy business keys.** Reuse the company's existing Cloudflare Access login. The helper handles its private login session and request authentication. A person signs in on first use and again when the normal session expires. Apps and agents reach the same actions under the same identity, including existing checks an app already has. There is no new role-management screen or account for each employee.
  ```text
  first use ──▶ company email sign-in
                         │
                    private session
                         │
                    authenticated calls
                         │
                session expires or revoked
                         │
                    sign in again
  ```

- **Find company actions and memory through one helper.** The agent can find memory searches alongside company actions, read their input and output descriptions, and call them through the same helper. Memory keeps its installed credential, team access rules, and machine-private ownership. Company login grants no extra memory access. The helper reuses the existing memory commands; automatic capture and memory writes keep working as they do today.
  ```text
         one list, describe, and call helper
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
     company actions        memory search
     employee login       installed credential
           │                     │
           ▼                     ▼
       app checks       team + own private facts

        same production Worker, same stores
  ```

- **Add this to new installs and preserve existing apps on update.** Ship the registry, example, helper, memory descriptions, and agent guidance together. An update adapts custom actions through review, preserving their paths, behavior, and existing access checks; only deliberately described actions enter the guide. An open site cannot claim secure employee API access until company login works; already authorized memory remains independent. No new provider connection or deployment credential is required for an employee.
  ```text
  new install ──▶ example + helper + API guide

  existing install
         │
    review custom actions
         │
    preserve apps and access checks
         │
    describe selected actions
         │
    publish ──▶ employee agents discover them
  ```

**Non-goals:** detailed employee roles or app-by-app Zero Trust policy automation, a Team app or new connection screen, merge/deployment permission changes, a separate access service, memory enrollment changes, exposing provider administration, an arbitrary key-bearing proxy, making every integration available merely because a key exists, or an MCP server. The earlier preference that employees propose changes but cannot merge by default remains a separate future permissions task, not a claim this API change enforces it.

## Capabilities

### New Capabilities

- `company-api`: defined company actions that use server-held connections and preserve existing caller authorization.
- `agent-api-discovery`: generated OpenAPI, selective agent context, and a combined helper catalogue for company actions and existing memory reads.

### Modified Capabilities

- `mini-apps`: the example's endpoint contract and shared app/agent execution.
- `app-scaffold`: describe main API actions through the same registry while retaining existing routes and signed identity checks.
- `payload-layout`: distribute company API support and update guidance with the normal pack and scaffold.
- `memory`: describe existing search and topic reads for the shared helper, retaining credentials, ownership, capture, and the write gate.

## Impact

This change implements contracts and discovery without issuing keys, inviting employees or changing repository settings. Implementation spans the main app and mini-app API registries, contract generation and validation, the private API helper, a small memory-owned read adapter, a short agent instruction, payload inventory, tests, and the owning docs. Existing connected services require explicit business-action handlers; the template demonstrates the pattern with its existing health/greeting endpoints rather than inventing a business integration.

This is an additive minor release with reviewed adaptation of custom endpoints. It adds no new UI, database, control-plane Worker, provider-management token, or full permission system. Existing handler checks remain authoritative. Memory identity and enrollment remain separate; the shipped machine-memory model is reused without changing it. Hosted provisioning work remains outside this change.

## Decision log

- **2026-10-04** — Asked whether employees should build tools around approved endpoints while new backend capabilities require controlled publication → chose that separation; app and agent calls share the employee's allowed actions.
- **2026-10-04** — Asked where to plan alongside the existing machine-memory work → chose keep going here, leaving memory work separate.
- **2026-10-04** — Asked how employee-built apps should go live → chose employees can make pull requests but cannot merge by default; publishing requires an explicit permission.
- **2026-10-04** — Assumed: people with publishing permission approve an exact revision before it runs with deployment keys, because the existing branch workflow supplies a production-capable credential before merge and merge restrictions alone cannot protect it.
- **2026-10-04** — Assumed: ownership and app access are managed from normal chat and a small Team app, because the requested owner experience must work without editing schemas or visiting provider dashboards for each employee.
- **2026-10-04** — Assumed: employee credentials use verified company login and a private one-time connection, because repo access and optional memory-machine labels do not identify a human or justify company-service access.
- **2026-10-04** — Assumed: deterministic code generates discovery and enforces grants, because language models should describe requested access changes but never decide or enforce who is authorized.
- **2026-10-04** — Assumed: app access presets contain an approved fixed set of actions, not wildcards, because new endpoints must not silently increase an employee's powers.
- **2026-10-04** — Assumed: a separate access service holds its narrowly limited provider connection, because ordinary business handlers must not receive the credential that manages company login and agent tokens.
- **2026-10-04** — Assumed: this is one change with ordered implementation tasks, because discovery, membership, onboarding, and safe publication must work together before employee access can be called ready.
- **2026-10-04** — Assumed: existing shared deployment credentials and permissive app routes require a major, reviewed update, because silently carrying them forward would contradict the access promises.

- **2026-10-04** — Asked what matters most after the initial access design → chose the company API and a defined schema that employees' agents can use without business secret keys; employee permissions are secondary. This supersedes the earlier Team UI, role presets, separate access service, automatic publishing enforcement, and major-release assumptions for this change.
- **2026-10-04** — Assumed: reuse normal Cloudflare Access human login for employee agents, because its existing CLI flow supplies the employee's identity without sharing company service keys or building another enrollment system.
- **2026-10-04** — Assumed: the API description is generated from explicit endpoint contracts, because a key or arbitrary handler code cannot reliably describe safe business actions and their inputs.
- **2026-10-04** — Assumed: new installs demonstrate the framework with the existing health/greeting actions, because this conversation selected no real business service and the plan must not guess one.
- **2026-10-04** — Assumed: loading live action details on demand is enough agent context, because the requested schema should be available when needed without bloating every session.
- **2026-10-04** — Assumed: this additive API change is a minor release with no publication-permission implementation, because the user narrowed the priority and existing endpoint behavior is preserved.
- **2026-10-04** — Asked whether employee login should grant shared-memory access or the agent should keep its existing automatic memory access → chose keep existing memory access, sharing discovery and helper logic while preserving machine-private ownership.
- **2026-10-04** — Assumed: consolidate the operation descriptions and helper rather than create another Worker, because company APIs and memory already share the production Worker and their different authorization checks remain necessary.
- **2026-10-04** — Assumed: initially describe memory search and topic reads through an adapter to existing commands, because this delivers discoverable memory access without duplicating SQL/search logic or changing automatic capture and the memory write gate. Additional memory actions can be described separately.

- **2026-10-04** — Assumed: implementation groups 1–5 are ready for the remote gate; contracts, discovery, employee login helper, memory read adapter and distribution are written. Static payload/config/context checks passed; remote tests, coverage, build and deployed observations remain pending. Memory identity and enrollment are unchanged.

- **2026-10-04** — Remote gate attempt 1: all 101 app tests passed with full coverage; 1,060 of 1,061 script tests passed above coverage floors. Fixed schema property typing and shared-module declarations, an unused registry export, and the stale private-cache error assertion. Added a dictionary-input regression; all gates remain enabled and the corrected revision awaits CI.

- **2026-10-04** — Remote gate attempt 2: app tests, full coverage, lint and unused-code checks passed. The build exposed a Zod overload typing issue; the field type now derives from the actual generated action schema rather than the converter’s unrelated registry overload. Runtime behavior is unchanged.

- **2026-10-04** — Integrated the separately shipped memory release from main before final verification. Kept its briefs, extraction commands, cancellation/accounting and specifications; combined them with the read adapter and redirect refusal. Shortened this change’s instruction pointers to stay within the existing context budget. No memory permission or release-version change is introduced by this feature.

- **2026-10-04** — Final CI fix: restored the company/memory instruction heading expected by the installed-payload fixture. The main-branch integration passed app/build checks and all other script tests; the restored wording retains the context budget without changing assertions or check settings.

- **2026-10-04** — Remote source gate passed on `5e31b8e`: all 101 app and 1,091 script tests, coverage, lint, build/deployment and payload checks passed without weakened settings. Groups 1–5 and task 6.1 are checked; final deployed observations and unavailable human/production-memory evidence remain to record in `evidence.md`.

- **2026-10-04** — Acceptance observations and permitted-unverified human/production-memory checks are recorded in `evidence.md`; tasks 6.2–6.4 are complete under those clauses. Host preview compilation then caught an assumption hidden by CI-generated bindings: a starter has only object bindings. The credential-output guard now treats binding values as unknown before narrowing, preserving runtime behavior and supporting both configurations. Task 6.1 is reopened for the corrected exact revision.

- **2026-10-04** — Corrected exact source revision `c66bc02` passed all required remote checks: 101 app tests with full coverage, 1,091 script tests, lint, build/deployment and payload gates. The host preview also compiled against committed starter bindings and uploaded successfully. All 21 tasks are complete; unavailable human and production-memory acceptance checks remain explicitly unverified in `evidence.md`. No check was loosened. Final checklist/evidence updates stay in this working tree for the next save or publish.

- **2026-10-04** — User authorized publication after reviewing the reported verification limits. Archived the completed change for release 30.2.0; the publication checkpoint preserves all source/acceptance evidence and the unverified employee-login and production-memory checks. No access permissions or business integrations are added during publication.

<!-- end proposal.md -->
<!-- file design.md utf8 23070 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 9675 -->
# Tasks

## 1. Worker endpoint contracts and shared execution

- [x] 1.1 Add the shared described-action contract and compatible legacy-handler adapter under `app/worker/api/`; add the Zod 4 app dependency and lockfile entry without unrelated upgrades. Verify contract tests reject duplicate IDs, unsupported schema conversion and invalid registrations, and preserve the existing bare-handler route fixtures in CI.
- [x] 1.2 Adapt the main and mini-app dispatchers to execute described actions through the same registered handler, supplying verified identity to both, validating request input and described successful output, and sanitizing errors. Verify tests cover app/agent parity, no handler call on invalid input, existing record-check denial, output mismatch, missing connection, size/time bounds, and unknown route/method behavior.
- [x] 1.3 Describe the supplied health and Hello greeting actions without changing their paths or greeting behavior. Extend their tests for missing name, whitespace, long names, legacy handlers and anonymous/open-starter compatibility; confirm the existing assertions and absolute quality limits remain in the remote app check.
- [x] 1.4 Update `wiki/stack/mini-apps.md` and the code rule's route/example pointer for the contract pattern, preserving their existing folder conventions and links. Verify the documentation points to the supplied working definitions and makes clear that a real integration still needs a deliberately implemented action.

## 2. Live OpenAPI and selective discovery

- [x] 2.1 Add protected `/api/openapi.json` and bounded `/api/actions` summary/detail responses generated from the current main/mini-app registry, with revision/ETag, stable IDs, filters, pagination and synthetic examples. Verify generation and route tests describe actual methods/paths/serialization, include only the selected action's local schema dependencies, and reflect addition/removal of a registered action.
- [x] 2.2 Enforce identity on company discovery and newly shared connected actions, preserve existing operation/record guards, and omit undeclared, administrative, raw memory protocol and verification-upload routes from company OpenAPI. Verify real-generated-signature tests cover accepted human identity, forged/expired/wrong-audience tokens, plain email headers, login-off company-discovery denial, and any existing operation visibility checks; prove schema bodies and safe errors contain no fixture credentials.
- [x] 2.3 Create the owning `wiki/stack/company-api.md` page describing the company-action definition, generated schema, caller authentication and what cannot be inferred from a key. Link it from the stack hub and existing API/mini-app docs. Verify the documented endpoints and examples agree with the registered example; all internal links resolve in a target payload.

## 3. Private employee client and agent context

- [x] 3.1 Implement `scripts/company-api.mjs` target resolution and `login`, `list`, `describe`, and `call` operations, using public install metadata plus a per-user confirmed company target, structured input and live company operation lookup. Define the shared serializable operation envelope and filtering/formatting used by HTTP and memory adapters, without requiring app-installed packages for standalone memory. Verify CLI tests cover no owner `.env` dependency for company calls, absent/changed origin, invalid operation, query/JSON serialization, bounded summaries and returned business errors.
- [x] 3.2 Integrate cached employee authentication through `cloudflared`, capturing login/token output privately and sending the token only in request headers to the connected HTTPS origin. Use the existing point-of-need tool installation/hand-over guidance when the helper or browser is missing. Verify tests refuse redirects, arbitrary server URLs and external references; capture stdout/stderr/arguments to prove tokens never reach them, and cover expiry, removal, headless login guidance and private state outside the repo.
- [x] 3.3 Add timeout/uncertain-outcome handling without automatic mutation replay, and keep list/describe read-only. Verify tests prove a possibly completed write is invoked at most once and that login/discovery failures perform no business action or fallback to owner/verification credentials.
- [x] 3.4 Add one short company-API pointer to the generic `AGENTS.md` block and extend the owning page with the helper procedure for company actions and described memory reads, linking to memory's owning authorization doc. Verify prompt/client fixtures show an employee with no business key can find an action, load only its relevant schema and call it, choosing the correct existing authentication path; do not add a memory hook or full-schema startup fetch.

## 4. Memory descriptions and existing-client adapter

- [x] 4.1 Add the memory-owned contract registry and structured read adapter for `memory.search` and `memory.show`, deriving schemas/mapping from supported command definitions and reusing the existing command execution path. Preserve direct CLI behavior and represent bounded text output truthfully. Verify existing memory fixtures cover command/adapter parity, invalid input before store access, synthetic examples, deterministic revisions, no raw SQL/admin-wide options and operation without app dependencies or company login.
- [x] 4.2 Merge trusted installed memory descriptions into the helper's scoped list/describe/call flow, labeling source/transport/authentication and separate revisions while keeping OpenAPI HTTP-only. Verify helper fixtures cover selective context, operation-ID collisions, remote-command refusal, independent company failure, unavailable memory status, output bounds and no extra startup fetch or automatic capture/write changes.
- [x] 4.3 Preserve the memory client's primary-checkout target and existing credential path, adding transport redirect refusal where necessary without duplicating ownership/search logic. Verify existing memory/transport fixtures cover two machines with matching login labels, cross-repo and revoked keys, denial without credential fallback, company target overrides, preview 404 and secret-free outputs/arguments. Link the company API docs to the memory-key policy and add the short adapter procedure to the memory skill; verify no enrollment, privacy or write-gate promise changes.

## 5. Installation, payload and reviewed updates

- [x] 5.1 Add the helper and every dependency to the payload inventory, and adapt public install metadata recording to store the actual production company API origin from readback. Include memory descriptions/utilities with the core skill, preserving its standalone distribution. Update the manifest and setup/update guidance; do not run `/wong-setup` or `/wong-sync` in this meta-repo. Verify fresh-target and preflight fixtures receive the complete feature without source-repo values, credential replacement or new provider resources.
- [x] 5.2 Add reviewed-update fixtures for a customized app and an older record: selected routes gain contracts, undescribed routes remain working, existing authorization remains intact, and an explicit company target works until the public record is filled while memory retains its own primary target. Update the owning guidance; verify no custom handler is replaced and no saved business key is copied to an employee.
- [x] 5.3 Add `## Next (minor) — Company actions and memory discovery for agents` to `CHANGELOG.md` with a plain Updating note about choosing existing actions to describe and preserving memory access. Keep VERSION unchanged. Verify `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/measure-context.mjs --check` for the edited memory skill text; record any actual check-setting change by the existing Check convention without weakening gates.

## 6. Exact-revision integration and deployed evidence

- [x] 6.1 Use `/save` to complete the remote source gate for the exact implementation revision and obtain its preview. Confirm app, payload and required memory/script checks pass without local build/test prerequisites, and keep this task unchecked on a failed or unreadable result.
- [x] 6.2 Against that preview, verify the real `workers.dev` company-login flow from an employee account that has no owner/business/deploy keys: complete first-use `cloudflared` sign-in, retrieve discovery, describe greeting and call the same endpoint used by the browser app, then reuse the session. Use the normal owner's allowed-email procedure where needed; report human login unverified if no permitted test person is available, rather than inventing one or borrowing owner credentials.
- [x] 6.3 Verify deployed anonymous company denial, an expired/removed employee session when an authorized disposable identity is available, staging/production target separation, and fresh discovery after a newly registered synthetic action reaches the preview. Record sanitized observations and any unverified checks. Introduce no real external provider key merely for this test and do not claim a business integration was proved by the synthetic examples.
- [x] 6.4 Verify combined discovery and harmless memory reads from a separately authorized production installation without using an owner/admin key, and confirm selecting the preview does not redirect its memory credential or require company login for memory. Previews still answer raw memory requests with 404. If no permitted installation is available, record production memory integration unverified; do not add production bindings to staging, issue credentials, or copy private data merely for this check.

<!-- end tasks.md -->
<!-- file specs/agent-api-discovery/spec.md utf8 6755 -->
# Agent API discovery

## Purpose

Give employee assistants machine-readable descriptions of company actions and existing memory reads through one private helper, so relevant context is available without sharing business keys or changing memory authority.

## ADDED Requirements

### Requirement: Discovery describes the deployed company API

The protected company Worker SHALL publish OpenAPI 3.1 generated from its currently registered described actions and a bounded summary catalogue with per-action details. The outputs SHALL identify a contract revision, omit undeclared and infrastructure routes, preserve stable operation identities, and include only synthetic examples and nonsecret metadata. An existing operation-level restriction SHALL also apply to discovery where it determines action visibility.

#### Scenario: A new action is published

- **WHEN** a reviewed action joins the production registry and deploys
- **THEN** production discovery describes its real method, path, input, output and effect without a second manually maintained API document

#### Scenario: A route is not an employee action

- **WHEN** the Worker also serves the raw memory protocol, verification uploads, administrative operations or undescribed legacy handlers
- **THEN** discovery does not advertise those routes as company actions

### Requirement: One helper describes company and memory operations without combining authority

The helper SHALL provide one bounded, filterable catalogue and selected-operation descriptions for live company actions and installed memory read operations. Every description SHALL identify its source, transport, required authentication, input/output schemas, effect and contract revision. Installed-client operations SHALL NOT be presented as deployed HTTP endpoints in OpenAPI. Company operations SHALL NOT override the memory namespace or select arbitrary local commands. Memory discovery and calls SHALL remain usable independently of company login; knowing a schema SHALL NOT establish an authorized connection.

#### Scenario: A task needs both company information and remembered context

- **WHEN** an agent lists and describes company and memory operations through the helper
- **THEN** it receives the relevant contracts through one interface with distinct sources and authentication requirements, without loading every schema or receiving credentials

#### Scenario: Company login is unavailable

- **WHEN** the agent lacks company login but its installed memory credential is valid
- **THEN** it can still discover and use the described memory reads, and the unavailable company connection is reported separately

### Requirement: Agent context is selective and available by default

Every install SHALL give its agents a short instruction pointing to company API discovery. An agent SHALL be able to list relevant action summaries and load the full contract and local schema dependencies for a selected action. The entire schema SHALL NOT be required in every session's starting context. Newly published contracts SHALL be discoverable without manual employee prompt updates.

#### Scenario: A task needs company information

- **WHEN** an employee asks their agent to do work covered by a described company action
- **THEN** the agent has instructions to find that action, load its contract and call the company endpoint rather than request the business key

#### Scenario: The catalogue grows

- **WHEN** many described actions are available
- **THEN** the helper can return bounded filtered summaries and just the selected action's full schema

### Requirement: The employee client reuses normal company login

The private helper SHALL authenticate as the employee through the company's existing Cloudflare Access login, reuse its private session while valid, and request a fresh login when needed. It SHALL expose no login token in model context, command arguments, URLs, repo files or ordinary diagnostics, and SHALL never fall back to owner or verification credentials. The employee SHALL need no Cloudflare administration account or business API key.

#### Scenario: First use and a later request

- **WHEN** an allowed employee signs in for their first API request and later makes another request during that valid session
- **THEN** both requests use that employee's identity and the later request reuses private authentication automatically

#### Scenario: Expired or removed access

- **WHEN** the provider refuses the session because it expired or employee access was removed
- **THEN** the helper reports sign-in or denial without exposing credentials or widening permission

### Requirement: Calls remain on the connected target and handle uncertain outcomes

The helper SHALL resolve a company operation against current discovery for the connected company origin, send structured input to the registered endpoint, and return the business result or safe error. Memory operations SHALL use their installed contracts and the existing memory client's primary-checkout target and credential; a company target selection SHALL NOT redirect memory. The helper SHALL refuse credential forwarding to another origin, redirects, arbitrary server URLs and external schema references. Credentials SHALL NOT be exchanged between company and memory requests. Listing or describing SHALL perform no business mutation. A failed or ambiguous mutation SHALL NOT be automatically repeated.

#### Scenario: A redirect tries to move authentication

- **WHEN** discovery or an action redirects the helper to another destination
- **THEN** the helper stops without forwarding the employee session

#### Scenario: A write has an uncertain result

- **WHEN** a write times out after the request may have reached the company Worker
- **THEN** the helper reports the uncertain outcome without automatically calling it again

### Requirement: Open installations do not claim authenticated API readiness

The protected API guide SHALL require verified identity even when the existing starter is configured open without login. Setup and helper status SHALL distinguish a discovered address from successful authenticated employee API use, and SHALL give a plain login/setup instruction when protection or employee admission is missing.

#### Scenario: A starter is open without company login

- **WHEN** an employee attempts protected discovery on an open starter
- **THEN** the system reports that company login is needed and neither publishes sensitive discovery nor borrows owner credentials

#### Scenario: An address exists but no employee has signed in

- **WHEN** setup records a deployed company API address without real employee login evidence
- **THEN** it reports the address and leaves employee authenticated use unverified

<!-- end specs/agent-api-discovery/spec.md -->
<!-- file specs/app-scaffold/spec.md utf8 1482 -->
# Main API contracts

## MODIFIED Requirements

### Requirement: The starter app is set up to grow

The starter app SHALL route its pages through a route list, with the home page as its only page and a not-found page for every other address. Each page SHALL live in its own folder with its parts, styles, and tests; a part used by one page SHALL live in that page's folder. The Worker SHALL route `/api/` requests through a route list of handlers, one per file, starting with `GET /api/health`. An unknown API route SHALL answer 404. The scaffold SHALL ship no empty folders. Main API actions deliberately exposed to agents SHALL receive the verified caller identity and explicit contracts shared by runtime validation and generated API discovery, with the health action supplied as the example. Existing signed-identity enforcement and installed handler checks SHALL remain effective.

#### Scenario: An unknown address

- **WHEN** a person opens `/nothing-here` on the app
- **THEN** they see a "page not found" message with a link home, not the home page

#### Scenario: The health route

- **WHEN** a caller sends `GET /api/health`
- **THEN** the Worker answers 200 with `{ "ok": true }`, and `GET /api/nothing` answers 404

#### Scenario: A main API action becomes discoverable

- **WHEN** a main API action is deliberately described and published
- **THEN** it is available through generated discovery and app and agent calls execute it with the same verified caller identity

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/company-api/spec.md utf8 4011 -->
# Company API

## Purpose

Let company apps and employee assistants use explicitly defined business actions through the company's Worker, while underlying service credentials remain on the server and existing authorization stays effective.

## ADDED Requirements

### Requirement: Apps and agents use the same defined company action

A described company action SHALL be callable through its existing Worker endpoint by both its app and an authenticated employee assistant. Both callers SHALL execute the same handler with verified identity and the same existing action and record checks. Discovery SHALL NOT grant permission or bypass those checks.

#### Scenario: An employee uses an app action through their agent

- **WHEN** an employee authorized to use a described action calls it from their assistant with valid input
- **THEN** the company endpoint performs the same work and returns the same business result as the app

#### Scenario: An existing record check denies the caller

- **WHEN** a described action's existing record check denies the employee
- **THEN** the agent call is denied even if the action appears in discovery

### Requirement: Company service credentials stay on the server

Company actions SHALL use saved server-side service connections without requiring an employee to possess the underlying business key. Employee login SHALL NOT distribute owner credentials, deployment credentials, memory credentials, or the workspace verification service token. Discovery, successful outputs and error outputs SHALL contain no service credential values.

#### Scenario: A connected action runs

- **WHEN** an authenticated employee calls a defined action that uses a saved business key
- **THEN** the server uses that key internally and the employee receives only the described business response

#### Scenario: A provider request fails

- **WHEN** the outside service returns a diagnostic containing credential material
- **THEN** the action returns a safe documented error without that material

### Requirement: Defined actions validate the documented interface

Every agent-exposed action SHALL declare its purpose, stable operation identity, accepted input, successful output, errors and effect. The same definition SHALL govern its published schema and runtime input validation. Unsupported schema definitions or duplicate operation identities SHALL fail the checks before publication. Invalid input SHALL perform no business work; a described output that violates its contract SHALL not be forwarded as a successful response.

#### Scenario: Invalid input

- **WHEN** a caller supplies input outside the action's documented schema
- **THEN** the endpoint returns a structured input error before invoking the business handler

#### Scenario: An action definition is inconsistent

- **WHEN** a new exposed action has an unsupported schema or duplicate operation identity
- **THEN** publication checks fail and identify that action

### Requirement: Exposure is explicit and preserves existing apps

An existing unconverted handler SHALL retain its path, behavior and authorization and SHALL be absent from discovery until deliberately described. Possessing a key SHALL NOT expose every action of that service. An employee-enabled action requiring company connections SHALL require verified caller authentication even when an older starter site is open without login. Missing connections SHALL produce a safe unavailable state rather than a request for the owner key on the employee machine.

#### Scenario: An installed app updates

- **WHEN** the update adds discovery support around a custom app without describing its legacy handlers
- **THEN** its handlers still work as before and are not silently advertised to agents

#### Scenario: A connection or login is missing

- **WHEN** a new company-connected action has no saved connection or no verified employee identity
- **THEN** no outside business request runs and the caller receives a safe unavailable or authentication response

<!-- end specs/company-api/spec.md -->
<!-- file specs/memory/spec.md utf8 3021 -->
# Discoverable memory reads

## ADDED Requirements

### Requirement: Existing memory reads have discoverable contracts

Memory SHALL describe its existing search and topic-read operations with stable namespaced identities, supported input schemas, truthful output schemas, safe errors, effects and contract revisions. The shared helper SHALL let an agent discover, describe and call these operations through the existing memory client. Descriptions SHALL derive from the supported command definitions, use synthetic examples and contain no credential values or stored private facts. The adapter SHALL reject unsupported input before making a store request and SHALL reuse existing search behavior rather than introduce another query protocol. Existing direct commands, automatic loading/capture and gated memory writes SHALL continue to work without company login or installing the app.

#### Scenario: An agent searches remembered knowledge

- **WHEN** an authorized installation discovers and calls a described memory search through the shared helper
- **THEN** the search uses its existing memory client and returns the same permitted knowledge as the corresponding direct command, within the adapter's documented output bound

#### Scenario: An input tries to select another access path

- **WHEN** a helper memory call supplies raw SQL, another owner, arbitrary commands or paths, or an unsupported admin-wide option
- **THEN** the adapter refuses it before any store request without changing existing direct-command behavior

### Requirement: Shared discovery preserves memory credentials and private ownership

Shared operation discovery SHALL NOT change memory enrollment, roles, machine ownership, website-login association, data bindings or credential lifecycle. A memory call through the helper SHALL require the existing repository credential for its installation, retain the existing team/private server checks, and use the primary checkout's recorded production memory target. Company login alone SHALL grant no memory access. A company origin override, staging target or remote schema SHALL NOT select the destination for a memory credential. No credential SHALL reach descriptions, arguments, model context or ordinary diagnostics, and no missing or refused memory credential SHALL cause fallback to owner credentials or website login.

#### Scenario: The same employee uses two machines

- **WHEN** two installations have the same verified website identity and make memory calls through the shared helper
- **THEN** each retains its credential's permitted shared knowledge and machine-private scope, with no combining of private facts or reassignment of ownership

#### Scenario: A logged-in employee lacks an active memory credential

- **WHEN** an employee with valid company login calls a described memory operation without a valid installed memory credential
- **THEN** memory access is refused with a safe existing installation or denial instruction, without issuing a credential or widening access

<!-- end specs/memory/spec.md -->
<!-- file specs/mini-apps/spec.md utf8 1345 -->
# Mini-app API contracts

## MODIFIED Requirements

### Requirement: The example mini app is set up to grow

The example mini app SHALL keep its page, its parts, and its server side in separate files, and its server side SHALL dispatch through a route list. An unknown API route SHALL answer 404. The example's greeting action SHALL carry an explicit input/output contract used for company API discovery and validation, with the app and an authenticated agent calling the same handler. Existing greeting behavior SHALL be preserved. An installed app's unconverted route SHALL remain usable and SHALL not be automatically advertised until deliberately described.

#### Scenario: A copied app gains a route

- **WHEN** the agent adds an API route to a mini app copied from the example
- **THEN** it adds one entry to the route list and a handler, without touching the page

#### Scenario: The example is called by an agent

- **WHEN** an authenticated agent discovers and calls the greeting action
- **THEN** it uses the same endpoint and receives the greeting the example app would receive for that name

#### Scenario: A customized installed app updates

- **WHEN** an installed app's existing route has not yet received a discovery contract
- **THEN** it retains its original path, behavior and authorization and is absent from agent discovery

<!-- end specs/mini-apps/spec.md -->
<!-- file specs/payload-layout/spec.md utf8 1395 -->
# Company API distribution

## ADDED Requirements

### Requirement: Company API support ships as one discoverable system

The normal app scaffold and stack pack SHALL distribute the contract registry, described example, protected discovery, private client and owning documentation together. The core memory skill SHALL distribute its operation descriptions and adapter while remaining independently usable. Shared agent instructions SHALL point at the owning documentation without requiring a new user verb or loading the full schema. New installs SHALL record only their own nonsecret API target; updates SHALL preserve custom app code and access checks and adapt selected existing actions through review. Adding memory descriptions SHALL require no credential replacement, ownership migration or new login step. The feature SHALL require no new provider resource, control-plane service or business credential on an employee machine.

#### Scenario: A new install

- **WHEN** WongStack installs its normal scaffold and pack
- **THEN** the target receives the example contracts, discovery support, client and agent guidance without live source-repo identifiers or credentials

#### Scenario: A custom app updates

- **WHEN** a target updates company API support around its existing business app
- **THEN** its own code and checks are preserved and only reviewed selected actions enter discovery

<!-- end specs/payload-layout/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-04

~~~
<!-- end .openspec.yaml -->
<!-- file evidence.md utf8 8421 -->
# Implementation and acceptance evidence

Prior passing source revision: `5e31b8e524db9f06a806fd03a17e12690b09c8b8`, branch `stiff-camel`, 2026-10-04. Includes the separately shipped memory release from main. Acceptance/checklist records updated afterward do not change the tested implementation.

## Remote source gate

- [App checks](https://github.com/matthewwong525/WongStack/actions/runs/37173664184): 101 tests passed in 16 files; 100% lines, statements, branches and functions; lint and unused-code checks passed.
- [Payload and script checks](https://github.com/matthewwong525/WongStack/actions/runs/37173664215): 1,091 tests passed; 91.85% lines/statements, 88.63% branches and 94.54% functions. Payload links, context limits, OpenSpec configuration, private-name and release checks passed.
- [Build and preview deployment](https://github.com/matthewwong525/WongStack/actions/runs/37173664179): passed; Worker upload 158.50 KiB (36.11 KiB compressed). Preview discovered from deployment 6836288767: https://stiff-camel-wongstack-staging.matthewwong525.workers.dev
- The save gate returned SUCCESS for this exact revision. No check setting was loosened. Source builds/tests ran in CI.
- Fixtures cover contracts, signed identity validation, discovery additions/removals, employee-client isolation and uncertain writes, memory adapter/direct-command parity, machine ownership, redirect refusal and complete installed payloads. They use synthetic data and do not establish a real business integration.

## Deployed anonymous observations

Checked the discovered preview on 2026-10-04 at approximately 03:24 UTC using unauthenticated HTTPS GET requests with redirects disabled and a 15-second timeout. The requests used no credential, cookie, employee session or owner configuration. Only status, content type and the redirect origin were retained; redirect query strings and response bodies were not logged.

| Request | Observed status | Redirect origin |
| --- | --- | --- |
| `/api/actions` | 302 | `https://startuptemplate.cloudflareaccess.com` |
| `/api/actions?id=hello.greeting` | 302 | `https://startuptemplate.cloudflareaccess.com` |
| `/api/openapi.json` | 302 | `https://startuptemplate.cloudflareaccess.com` |
| `/apps/hello/api/greeting?name=Ada` | 302 | `https://startuptemplate.cloudflareaccess.com` |
| `/_memory/health` | 302 | `https://startuptemplate.cloudflareaccess.com` |

All responses had content type `text/html; charset=UTF-8`. These observations establish anonymous denial at the Access edge; no successful action response or schema was exposed. They do not establish an authenticated Worker response, action execution or the Worker's raw-memory status.

## Acceptance context

No permitted employee account/disposable identity or separate authorized production memory installation was supplied for these checks. Existing owner/deploy credentials were not used in place of an employee; no credentials were issued, access policy changed, production binding added or external provider connection created. Tasks 6.2–6.4 explicitly allow recording unavailable live checks as unverified. Their completion below means the safe observations and limitations were recorded, not that unavailable acceptance checks passed.

### Task 6.2 — employee sign-in and app/agent parity

**Human login unverified.** No permitted employee account with only its own login was available. First-use `cloudflared` sign-in on this `workers.dev` preview, authenticated discovery, greeting description and execution, browser-app parity, and subsequent cached-session reuse remain unverified live. The anonymous greeting request stopped at the Access edge. CI fixtures establish the source behavior described above; they do not replace the human login check.

### Task 6.3 — denial, target separation and fresh discovery

**Anonymous company denial verified at the Access edge** by the list, selected detail, OpenAPI and greeting observations above. Expired/removed employee-session denial is **unverified live** without an authorized disposable identity. Fresh authenticated discovery after an additional synthetic action reaches the preview is **unverified live**; no new route or deployment was introduced for this acceptance pass. Registry addition/removal and cache-revision behavior passed in CI.

The recorded deployment names the branch preview separately from production. Reviewed configuration gives staging its own Worker name and database, omits `MEMORY_DB` and `MEMORY_BUCKET` from staging, and the exact-revision remote deployment passed. This supports configuration-level target separation; an authenticated live check of both targets is **unverified**. No production endpoint or credential was used for these observations. Synthetic health/greeting examples prove no real business integration.

### Task 6.4 — combined production memory access and preview isolation

**Production memory integration unverified.** No separately authorized non-admin production installation was available, so combined discovery, harmless memory reads, and the live preservation of its production memory target while selecting this preview were not exercised. Existing owner/admin memory access was not borrowed.

The anonymous preview request to `/_memory/health` returned an Access-edge 302. It therefore does **not** prove a deployed Worker-level 404. The source handler returns `404 no_store` without `MEMORY_DB`; staging declares no production memory bindings, and CI fixtures cover preview 404, independent company/memory authentication and primary-checkout target preservation. Those source/configuration checks passed, while the live Worker-level 404 and non-admin production helper flow remain unverified.

## Host preview after starter-binding type correction

On 2026-10-04 the host preview compiled the corrected output guard using the committed starter binding types, installed dependencies only for previewing, and uploaded staging version `492c997e-ebd1-4e64-ac82-8f0d82ffe4a1`. The actual alias printed by Wrangler was https://employee-app-agent-access-wongstack-staging.matthewwong525.workers.dev . This upload used the primary checkout’s preview credential; no employee credential or production memory data was used. Staging migrations had nothing to apply. Read-only protection checks passed before build and upload, with human login explicitly unverified. No check was loosened.

The correction only widens a callback’s static binding-value type before its existing runtime string check. The previously tested implementation behavior is unchanged, and the corrected source revision subsequently passed the final CI gate below. This local build served the requested host preview, not the source gate.

## Final corrected exact-revision gate

Final source revision: `c66bc02e46d93a93061501f35f334aaaa54931f9`, branch `stiff-camel`, 2026-10-04. The subsequent checklist/status/evidence updates change no implementation. The source gate returned SUCCESS and task 6.1 is complete.

- [App checks](https://github.com/matthewwong525/WongStack/actions/runs/37174232310): all 101 tests passed with 100% lines, statements, branches and functions; lint and unused-code checks passed.
- [Payload and script checks](https://github.com/matthewwong525/WongStack/actions/runs/37174232312): all 1,091 tests and unchanged coverage floors passed, including the installed-payload fixtures and the integrated memory suite. Payload, context, OpenSpec configuration, private-name and release checks passed.
- [Build and deployment](https://github.com/matthewwong525/WongStack/actions/runs/37174232315): passed. The CI preview was discovered from deployment 6836377827 at https://stiff-camel-wongstack-staging.matthewwong525.workers.dev .
- The host alias printed by the successful upload is https://employee-app-agent-access-wongstack-staging.matthewwong525.workers.dev . Anonymous action discovery, OpenAPI and greeting checks against this alias also returned Access-edge 302 to the configured login host.

All 21 tasks are complete according to their checks, including the explicit unavailable-evidence clauses for tasks 6.2–6.4. Human first-login/session reuse, expired/removed-session denial, fresh authenticated action discovery, authenticated target comparison, non-admin production memory reads and the deployed Worker-level preview memory 404 remain unverified. No real business integration is claimed.

<!-- end evidence.md -->
<!-- file review.html utf8 52342 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-04-employee-app-agent-access</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-04-employee-app-agent-access">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-04-employee-app-agent-access</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">An employee's assistant should be able to use the company's connected services without receiving the business's secret keys. It should discover those actions and its existing memory access through one helper, with descriptions it can load when needed rather than asking the owner to reconnect or explain every tool.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Use the company's connections through its Worker.</b> The owner asks to make a connected process available, such as looking up orders. The assistant builds the company's approved actions around the existing connection. Both an app and an employee's assistant call those actions; the company's secret stays on the server. A key by itself does not automatically expose every action the outside service supports.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">owner: “Make order lookup available”</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">                  │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">            approved company action</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">                  │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">company app ──────┤</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">employee's agent ─┘</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">                  │</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">                  ▼</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">            company Worker</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">            uses the saved key</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">                  │</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">                  ▼</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">            connected service</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Define each action once and generate its API guide.</b> An action's definition explains what it does, its inputs, outputs, errors, and whether it changes anything. WongStack uses that same definition to publish a live OpenAPI schema and check requests. The coding assistant creates the definitions while building the action; the owner does not write schemas or maintain a second document.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">action + input/output definition</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">                │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">     ┌──────────┼──────────┐</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">     ▼          ▼          ▼</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">  API guide  input check  live endpoint</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Give the assistant the right context when it needs it.</b> Every repo points agents at the company API. The agent can list available actions, load the full schema for a relevant action, and call it through a small helper. It reads the live company version, so newly published actions appear automatically. The full API guide does not fill every chat's starting context.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">session starts ──▶ short API pointer</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">                           │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">                  work needs company data</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">                           │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">                  list available actions</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">                           │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">                  read relevant schema</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">                           │</span>
<span class="ln" data-note="item-3-line-9" tabindex="0">                  call company endpoint</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Employees sign in; they never copy business keys.</b> Reuse the company's existing Cloudflare Access login. The helper handles its private login session and request authentication. A person signs in on first use and again when the normal session expires. Apps and agents reach the same actions under the same identity, including existing checks an app already has. There is no new role-management screen or account for each employee.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">first use ──▶ company email sign-in</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">                       │</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">                  private session</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">                       │</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">                  authenticated calls</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">                       │</span>
<span class="ln" data-note="item-4-line-7" tabindex="0">              session expires or revoked</span>
<span class="ln" data-note="item-4-line-8" tabindex="0">                       │</span>
<span class="ln" data-note="item-4-line-9" tabindex="0">                  sign in again</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Find company actions and memory through one helper.</b> The agent can find memory searches alongside company actions, read their input and output descriptions, and call them through the same helper. Memory keeps its installed credential, team access rules, and machine-private ownership. Company login grants no extra memory access. The helper reuses the existing memory commands; automatic capture and memory writes keep working as they do today.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">       one list, describe, and call helper</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">                    │</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">         ┌──────────┴──────────┐</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">         ▼                     ▼</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">   company actions        memory search</span>
<span class="ln" data-note="item-5-line-6" tabindex="0">   employee login       installed credential</span>
<span class="ln" data-note="item-5-line-7" tabindex="0">         │                     │</span>
<span class="ln" data-note="item-5-line-8" tabindex="0">         ▼                     ▼</span>
<span class="ln" data-note="item-5-line-9" tabindex="0">     app checks       team + own private facts</span>

<span class="ln" data-note="item-5-line-11" tabindex="0">      same production Worker, same stores</span></pre></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Add this to new installs and preserve existing apps on update.</b> Ship the registry, example, helper, memory descriptions, and agent guidance together. An update adapts custom actions through review, preserving their paths, behavior, and existing access checks; only deliberately described actions enter the guide. An open site cannot claim secure employee API access until company login works; already authorized memory remains independent. No new provider connection or deployment credential is required for an employee.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-1" tabindex="0">new install ──▶ example + helper + API guide</span>

<span class="ln" data-note="item-6-line-3" tabindex="0">existing install</span>
<span class="ln" data-note="item-6-line-4" tabindex="0">       │</span>
<span class="ln" data-note="item-6-line-5" tabindex="0">  review custom actions</span>
<span class="ln" data-note="item-6-line-6" tabindex="0">       │</span>
<span class="ln" data-note="item-6-line-7" tabindex="0">  preserve apps and access checks</span>
<span class="ln" data-note="item-6-line-8" tabindex="0">       │</span>
<span class="ln" data-note="item-6-line-9" tabindex="0">  describe selected actions</span>
<span class="ln" data-note="item-6-line-10" tabindex="0">       │</span>
<span class="ln" data-note="item-6-line-11" tabindex="0">  publish ──▶ employee agents discover them</span></pre></div></details></li>
</ol>
<p class="aside"><b>Non-goals:</b> detailed employee roles or app-by-app Zero Trust policy automation, a Team app or new connection screen, merge/deployment permission changes, a separate access service, memory enrollment changes, exposing provider administration, an arbitrary key-bearing proxy, making every integration available merely because a key exists, or an MCP server. The earlier preference that employees propose changes but cannot merge by default remains a separate future permissions task, not a claim this API change enforces it.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether employees should build tools around approved endpoints while new backend capabilities require controlled publication → chose that separation; app and agent calls share the employee's allowed actions.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked where to plan alongside the existing machine-memory work → chose keep going here, leaving memory work separate.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked how employee-built apps should go live → chose employees can make pull requests but cannot merge by default; publishing requires an explicit permission.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: people with publishing permission approve an exact revision before it runs with deployment keys, because the existing branch workflow supplies a production-capable credential before merge and merge restrictions alone cannot protect it.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: ownership and app access are managed from normal chat and a small Team app, because the requested owner experience must work without editing schemas or visiting provider dashboards for each employee.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: employee credentials use verified company login and a private one-time connection, because repo access and optional memory-machine labels do not identify a human or justify company-service access.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: deterministic code generates discovery and enforces grants, because language models should describe requested access changes but never decide or enforce who is authorized.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: app access presets contain an approved fixed set of actions, not wildcards, because new endpoints must not silently increase an employee's powers.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: a separate access service holds its narrowly limited provider connection, because ordinary business handlers must not receive the credential that manages company login and agent tokens.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: this is one change with ordered implementation tasks, because discovery, membership, onboarding, and safe publication must work together before employee access can be called ready.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: existing shared deployment credentials and permissive app routes require a major, reviewed update, because silently carrying them forward would contradict the access promises.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked what matters most after the initial access design → chose the company API and a defined schema that employees' agents can use without business secret keys; employee permissions are secondary. This supersedes the earlier Team UI, role presets, separate access service, automatic publishing enforcement, and major-release assumptions for this change.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: reuse normal Cloudflare Access human login for employee agents, because its existing CLI flow supplies the employee's identity without sharing company service keys or building another enrollment system.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the API description is generated from explicit endpoint contracts, because a key or arbitrary handler code cannot reliably describe safe business actions and their inputs.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: new installs demonstrate the framework with the existing health/greeting actions, because this conversation selected no real business service and the plan must not guess one.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: loading live action details on demand is enough agent context, because the requested schema should be available when needed without bloating every session.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: this additive API change is a minor release with no publication-permission implementation, because the user narrowed the priority and existing endpoint behavior is preserved.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether employee login should grant shared-memory access or the agent should keep its existing automatic memory access → chose keep existing memory access, sharing discovery and helper logic while preserving machine-private ownership.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: consolidate the operation descriptions and helper rather than create another Worker, because company APIs and memory already share the production Worker and their different authorization checks remain necessary.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: initially describe memory search and topic reads through an adapter to existing commands, because this delivers discoverable memory access without duplicating SQL/search logic or changing automatic capture and the memory write gate. Additional memory actions can be described separately.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: implementation groups 1–5 are ready for the remote gate; contracts, discovery, employee login helper, memory read adapter and distribution are written. Static payload/config/context checks passed; remote tests, coverage, build and deployed observations remain pending. Memory identity and enrollment are unchanged.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Remote gate attempt 1: all 101 app tests passed with full coverage; 1,060 of 1,061 script tests passed above coverage floors. Fixed schema property typing and shared-module declarations, an unused registry export, and the stale private-cache error assertion. Added a dictionary-input regression; all gates remain enabled and the corrected revision awaits CI.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Remote gate attempt 2: app tests, full coverage, lint and unused-code checks passed. The build exposed a Zod overload typing issue; the field type now derives from the actual generated action schema rather than the converter’s unrelated registry overload. Runtime behavior is unchanged.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Integrated the separately shipped memory release from main before final verification. Kept its briefs, extraction commands, cancellation/accounting and specifications; combined them with the read adapter and redirect refusal. Shortened this change’s instruction pointers to stay within the existing context budget. No memory permission or release-version change is introduced by this feature.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Final CI fix: restored the company/memory instruction heading expected by the installed-payload fixture. The main-branch integration passed app/build checks and all other script tests; the restored wording retains the context budget without changing assertions or check settings.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Remote source gate passed on <code>5e31b8e</code>: all 101 app and 1,091 script tests, coverage, lint, build/deployment and payload checks passed without weakened settings. Groups 1–5 and task 6.1 are checked; final deployed observations and unavailable human/production-memory evidence remain to record in <code>evidence.md</code>.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Acceptance observations and permitted-unverified human/production-memory checks are recorded in <code>evidence.md</code>; tasks 6.2–6.4 are complete under those clauses. Host preview compilation then caught an assumption hidden by CI-generated bindings: a starter has only object bindings. The credential-output guard now treats binding values as unknown before narrowing, preserving runtime behavior and supporting both configurations. Task 6.1 is reopened for the corrected exact revision.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Corrected exact source revision <code>c66bc02</code> passed all required remote checks: 101 app tests with full coverage, 1,091 script tests, lint, build/deployment and payload gates. The host preview also compiled against committed starter bindings and uploaded successfully. All 21 tasks are complete; unavailable human and production-memory acceptance checks remain explicitly unverified in <code>evidence.md</code>. No check was loosened. Final checklist/evidence updates stay in this working tree for the next save or publish.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>User authorized publication after reviewing the reported verification limits. Archived the completed change for release 30.2.0; the publication checkpoint preserves all source/acceptance evidence and the unverified employee-login and production-memory checks. No access permissions or business integrations are added during publication.</li>
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
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
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
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
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
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
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
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
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
    fit(d);
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
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
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
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
