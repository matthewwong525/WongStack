# Design

## Context

See [proposal.md](proposal.md). Completed source checkpoints already implement trusted owner activation, current per-app membership checks, discovery filtering and Cloudflare policy/session reconciliation. The unshipped GitHub connection/issuance code and unfinished private repository helper were built under the superseded scope. Their successful tests are historical evidence, not a reason to retain withdrawn features.

This version connects employees to an existing protected business app and its company APIs. It does not require a repository, GitHub account or Cloudflare administration account for employee setup. The user explicitly chose manual repository access and tests only after the remaining implementation is complete.

## Goals / Non-Goals

App identity authorizes company API actions according to current app grants. Repository authentication and independently installed memory retain their own authority. Do not change the general verification workflow here: its improvement is being handled in the separate verification chat. This change only removes its intermediate verification checkpoints.

## Decisions

### 1. Reuse current membership and login management

Keep the trusted pinned owner, exact-email roster, stable app IDs, primary-read grants, tombstones and generation-guarded policy/session reconciliation in core Worker modules and app D1. Service identities, public markers, git email and first visits establish no owner authority. Owner operations prevent self-removal and owner transfer. New employees and newly added apps start without business grants; employees with zero apps retain self-service only.

Use the customer's separate Access-only management authority restricted to recorded account/app/policy resources. Do not reuse provisioning/deployment keys or modify unrelated policies. Private owner setup supplies authority; the UI exposes finite owner-checked operations and nonsecret readiness. Missing authority is unavailable/pending. Roster writes immediately affect company authorization; edge policy and sessions report independent durable retry results. Session revocation may affect other signed-in users.

Make activation usable without repository metadata or a GitHub readiness prerequisite. Preserve existing additive database migrations and customer records; deprecated repository columns may remain inert rather than rebuilding tables. Remove GitHub runtime routes, registration, issuance/renewal/revocation, publication inspection and optional editing permissions from this release. Retire unshipped GitHub secrets, dependency/config maps and private Git-facing skill modifications. Do not touch externally granted repository access or existing ordinary GitHub authentication.

### 2. Keep authorization consistent across all app entry points

Preserve the completed authoritative current-policy guards for described and bare routes, finite reviewed main-route scopes, conjunctive record/action checks and denied unmapped routes. Current permissions govern summaries, details, OpenAPI, conditional responses, app cards and direct navigation. Missing/unavailable active policy denies business work. Existing installs retain their previous behavior until trusted rollout. Core owner/self-service and independent memory/verification protocols remain distinct.

Core login-management material stays excluded from ordinary mini-app bindings. The Access page calls finite identity-checked core endpoints and never receives raw keys. Preview provider writes remain disabled and production management secrets must not be distributed to staging. A shared Worker cannot protect against malicious deployed code; publication remains reviewed by the owner through existing workflows.

### 3. Bootstrap only company API access

Trim the dependency-free standalone bootstrap to login, status, selective live action discovery and invocation. Reuse the employee cloudflared browser approval; privately pin a canonical HTTPS business origin and identity. New/expired sessions may need approval on the current computer. No website cookie transfer, raw provider authority, clone or memory imports are required.

Publish the bootstrap through reviewed payload/release distribution. Copy prompts identify a checked immutable Source commit and SHA-256 digest; verify the digest before execution. Keep session state in an OS-user-private directory outside any checkout. Refuse redirects/foreign origins and token-bearing URLs/arguments/diagnostics. Keep installed company clients compatible without changing personal GitHub credentials or repository skills. API readiness requires authenticated readback and current grants; repository and memory status clearly say separate setup.

Prompt generation receives trusted canonical origin and reviewed artifact pins. Missing pins show setup guidance rather than an invented or mutable executable URL. Copying does no work and grants no authority. A clipboard failure leaves selectable text. Setup must preserve existing local files and memory configuration.

### 4. Owner and employee views share Access

Implement Access under app/src/apps/access with a title/description manifest and core API management. Owner view lists people, add/edit email and app choices, managed login readiness, save/remove/retry and share-link actions. Employee view exposes only own app/API setup and status. Home loads current app-access readback, shows authorized cards and Copy setup prompt, and withholds employer personalization guidance from employees. Preserve the owner's existing removable tutorial and customized branding.

No repository editing checkbox, GitHub connection section or repository token status appears. Explain that repository access is granted separately through its provider and that memory setup remains independent.

## UX

### Use-case brief

Employees connect an assistant once per computer and use allowed apps regularly. Employers manage staff when people join, change responsibilities or leave; assume a few times per month, including on a phone. Mirror the existing Home/Hello narrow-column forms and shared stylesheet. Done means an employee can call allowed company actions without a checkout and denied actions remain inaccessible.

### Flow

Employee: sign in → Copy setup prompt → paste into assistant → approve the same business when needed → API ready. Employer: Access → add/edit person → select apps → save → share ordinary app link. Missing owner connection and delayed provider work are secondary status states.

### Hierarchy

Home/self-service: Copy setup prompt. People: Add person. Person form: Save access. Removal: Remove access. Pending/error: Retry. Owner connection: Copy private setup instructions. Keep one primary action per state, labeled fields, keyboard focus, live status announcements and selectable fallback prompt text.

### Review

[Review page](review.html). Proposal items Copy a setup prompt and Manage people and apps sketch Home and owner/employee Access. Show pending login changes sketches removal and retry. Each layout fits phone width.

### Components

Shared header/brand and app cards; permission-readback loading/error/empty states; selectable copy block; owner people list/person form/login status; employee setup status; removal confirmation and retry rows.

## Risks / Trade-offs

- App login on another computer can need browser approval → explain the same business login without promising cookie transfer.
- Provider changes can time out after being applied → retain durable intent, generations and independent policy/session readback.
- Custom routes can evade navigation-only checks → preserve explicit server mappings and deny unmapped employee requests.
- Repository and memory grants survive app removal → clearly state independent authority instead of claiming full revocation.
- Artifact pins need checked immutable source → show unavailable guidance until reviewed pins exist; never run a mutable or app-supplied script.

## Migration Plan

Keep additive migrations and current data. Remove only the withdrawn unshipped GitHub runtime/helper/config surface; repository placeholder fields may remain inert. Make owner pinning and rollout independent of repository connections. Ship Access/bootstrap explicitly in payload inventory and preserve custom apps, routing, tutorial removal, existing login and memory. Keep VERSION unchanged and revise the Next minor CHANGELOG entry.

Complete code, tests and documentation before running them. Then perform one /save checkpoint with required remote app/build/script/generated-starter/release checks and a deployed preview; fix real failures within the normal checkpoint budget. Verify the finished nonproduction owner/employee flow, keyboard/phone behavior and permission denials. Controlled live Cloudflare login acceptance remains separate and requires verified installation authority. Never enable production policy or send invitations during a preview.

## Open Questions

No remaining feature-scope decisions. Availability of controlled live installation authority and exact checked bootstrap release pins are acceptance prerequisites, not permission to invent readiness.
