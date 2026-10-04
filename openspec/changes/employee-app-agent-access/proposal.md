# Let agents use company connections through a described API

**Status:** in-progress

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

Plan only: no implementation, provider writes, keys, invitations, or repository settings changes in this stage. Implementation spans the main app and mini-app API registries, contract generation and validation, the private API helper, a small memory-owned read adapter, a short agent instruction, payload inventory, tests, and the owning docs. Existing connected services require explicit business-action handlers; the template demonstrates the pattern with its existing health/greeting endpoints rather than inventing a business integration.

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
