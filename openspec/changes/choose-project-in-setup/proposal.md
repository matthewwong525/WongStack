# Sign in once and connect your assistant

**Status:** in-progress
**Branch:** smooth-repo-selection
**Open questions:** none about the working scope; provider permissions and the existing repository's protection must pass implementation checks before project editing is enabled.

## Why

Employees should start from the business app they already use, copy one setup prompt, and let their assistant connect with their approved access. The employer should control that access in one small app.

## What Changes

- **Start with your existing app login.** The home page offers a setup prompt to paste into Codex or Claude Code. The assistant connects to this business with the same employee identity, including from another computer. A browser approval may be needed there, but employees need no separate Cloudflare account or GitHub sign-in for this flow.
  ```text
  HOME: BEFORE
  ═════════════════════════════════════
  Business name
  Your apps
  Orders                          Open

  HOME: AFTER
  ═════════════════════════════════════
  Business name
  Connect your assistant
  [Copy setup prompt]
  Paste it into Codex or Claude Code.

  Your apps
  Orders                          Open

  COPIED: Prompt copied. Paste in chat.
  COPY FAILED: Select and copy below.
  CHECKING: Checking your access...
  UNAVAILABLE: Could not load. [Retry]
  NO APPS: Ask your employer for access.
           Your setup prompt is available.
  ```
- **Let the assistant finish the connection.** The prompt contains the business address and setup instructions. The assistant handles credentials privately, connects approved API actions, and prepares the existing project only for people allowed to edit it. The setup page reports each connection separately and lets interrupted setup resume without replacing local work.
  ```text
  YOUR SETUP
  ═════════════════════════════════════
  Business: Acme
  API access: Ready
  Project editing: Allowed
  Project: Not connected yet
  [Copy setup prompt]

  PROMPT
  Connect my assistant to this business:
  https://acme.example.com
  Follow the published setup instructions.
  Use my app login and assigned access.

  WAITING: Finish app approval to continue.
  CONNECTING: Your assistant is connecting.
  READY: API and project are connected.
  APP ONLY: API ready. Editing not assigned.
  INTERRUPTED: [Copy resume instructions]
  DENIED: Ask your employer for access.
  ```
- **Manage people in an Access mini app.** The employer adds an email, chooses allowed apps, and optionally enables project editing. They share the ordinary app link with that person. Adding the email also updates the app's login permissions. The Access page reports when those changes take effect.
  ```text
  ACCESS: EMPTY
  ═════════════════════════════════════
  No employees added yet.
  [Add person]

  ACCESS: PEOPLE
  ═════════════════════════════════════
  Ana    Orders          App access
  Bo     Orders          Project editor
  [Add person]
  Person: edit access / remove

  ADD OR EDIT PERSON
  ═════════════════════════════════════
  Email: [                            ]
  Apps:  [ ] Orders    [ ] Payroll
  Project editing: [ ] Allowed
  Editors receive the whole repository.
  [Save access]

  SAVING: Updating access...
  READY: Share the app link. [Copy link]
  LOGIN PENDING: Permission update pending.
                 [Retry]
  FAILED: Could not save. [Retry]
  ```
- **Connect GitHub once as the owner.** The employer approves access to the existing repository. Employees assigned project editing can then clone it and save changes through their assistant using privately issued, short-lived access. GitHub records those operations as the connected GitHub App; the business app records who requested access. Existing review and publishing controls still apply.
  ```text
  ACCESS: CONNECTIONS
  ═════════════════════════════════════
  App login management: Connected
  GitHub project: Not connected
  [Connect GitHub project]

  OWNER APPROVAL
  ═════════════════════════════════════
  GitHub: approve the selected project.
  Return here when finished.

  CHECKING: Verifying project permissions.
  READY: Acme / business-project
  BLOCKED: Project protection needs setup.
           [View instructions]
  EXPIRED: Approval expired. [Try again]
  FAILED: Connection failed. [Try again]

  LOGIN CONNECTION MISSING
  ═════════════════════════════════════
  App login management needs owner setup.
  [Copy owner setup instructions]
  ```
- **Apply the same permissions to apps and APIs.** Employees see their allowed apps, and their assistant can discover and call the same approved business actions. A direct API call checks those permissions too. Removing an app permission blocks subsequent calls even when the employee is still signed in; new apps require an employer's assignment.
  ```text
  ALLOWED: ORDERS       DENIED: PAYROLL
  ══════════════       ════════════════
  App: Available       App: Denied
  API: Allowed         API: Denied
  Assistant: Listed    Assistant: Hidden

  DENIED APP LINK
  ═════════════════════════════════════
  You do not have access to this app.
  [Back to your apps]
  ```
- **Withdraw access from the same page.** The employer can remove an app, stop project editing, or remove a person. New access is blocked immediately by the business app, while any pending login or GitHub revocation is reported honestly. Other people's access is preserved. Revoking a credential cannot be undone; renewed access uses a new credential.
  ```text
  REMOVE PERSON
  ═════════════════════════════════════
  Remove Bo's access?
  [Remove access]                Cancel

  REMOVING
  ═════════════════════════════════════
  App and API: Blocked
  App login: Removal pending
  GitHub: Revocation pending
  [Retry pending removal]

  REMOVED
  ═════════════════════════════════════
  Access removed.
  Downloaded copies remain on the computer.
  [Back to Access]
  ```

**Non-goals:** new-project setup, moving the wongstack-cloud repository picker, Cloudflare OAuth changes, Artifacts support or delivery work, custom invitation-email delivery, native GitHub account membership, employee hosting administration or publication authority, per-record/read-write business roles, source-folder permissions, or a new memory enrollment system.

## Capabilities

### New Capabilities

- `employee-onboarding`: app-login-based assistant setup, owner-managed Access mini app, private GitHub App credentials and observable removal for an existing business app.

### Modified Capabilities

- `company-api`: enforce current selected-app permissions on both described and legacy business routes while preserving stricter checks.
- `agent-api-discovery`: filter summaries, selected contracts and OpenAPI by the same current permissions.
- `mini-apps`: show permitted apps and self-service setup, and keep connection-management credentials out of ordinary app bindings.

## Impact

Installed Source app: Access mini app, self-service setup/home action, core membership and connection modules, app-database migrations, Access policy/session reconciliation, owner-owned GitHub App registration, private standalone bootstrap/credential helper, company transport and repository workflow adapters. Update payload inventory, docs, tests and release notes when implemented. No Cloud companion or new sign-in service is required.

**Baseline:** retain the earlier assumption that [#259](https://github.com/matthewwong525/WongStack/pull/259) will merge. Recheck compatible install records against its merged result; this version consumes an already-running GitHub-backed app and does not implement its managed starter or Artifacts route.

**Memory:** existing installed memory remains separate and is preserved. Fresh memory enrollment is outside this first version; report pending until the installation's trusted operator has connected that computer. This change cannot substitute app login for the authority owned by [#242](https://github.com/matthewwong525/WongStack/pull/242) or its shipped successor.

## Decision log

- **2026-10-04** — Asked what selecting a repository should do → chose starting a new project or opening an existing WongStack project, with customized starters separate.
- **2026-10-04** — Asked where a new Cloudflare project belongs → chose the person's own Cloudflare account.
- **2026-10-04** — Asked how to handle the overlapping managed starter work → chose to keep going here, design around it and leave it unchanged.
- **2026-10-04** — Asked whether setup may use a shared sign-in helper → chose yes, for sign-in only, with projects and hosting still owned by the person.
- **2026-10-04** — Asked how much teammate access to include → chose existing GitHub invitations and separate Artifacts repository tokens, without a new invitation flow.
- **2026-10-04** — Asked whether to plan this flow → chose to plan, assuming #259 will merge.
- **2026-10-04** — Assumed: one coordinated Source/Cloud change, because replacing the picker depends on the same setup and sign-in handoff working end to end.
- **2026-10-04** — Assumed: deterministic helpers own repeatable sign-in, selection, resume and provisioning state; the assistant explains results and carries the ordinary workflow, because API identities and retries must be consistent.
- **2026-10-04** — Assumed: full personal installation for new own-account projects, because existing setup includes hosting and memory, whereas #259 deliberately defines a smaller managed starter.
- **2026-10-04** — Assumed: source retrieval can still read the public GitHub template without GitHub sign-in on the Artifacts route; removing all GitHub network access was not requested.
- **2026-10-04** — Asked whether to add invitations and an employee setup page to this plan → chose to add them here, superseding the earlier manual-sharing scope.
- **2026-10-04** — Asked whether all invited employees should receive project access → chose app access by default, with project editing selected per employee.
- **2026-10-04** — Assumed: the employer's own-account installation runs membership management, because the shared helper remains authorized for sign-in only.
- **2026-10-04** — Assumed: employee setup consumes the published trusted-machine memory contract without a Devices UI or separate browser approval, because the owning active change explicitly replaces that flow.
- **2026-10-04** — Assumed: invitation cancellation, editing removal and employee removal are in scope, because employers need to withdraw the access this flow grants.
- **2026-10-04** — Asked whether to include employee-specific app access controlling API and assistant calls → chose to include it in Team invitations and employee settings.
- **2026-10-04** — Assumed: per-app access is allowed or denied, with no apps preselected and new apps denied until assigned, because that implements the selected-app choice without inventing business-specific roles or automatic access.
- **2026-10-04** — Assumed: project editing and memory remain separate grants, because allowing a business app does not authorize its whole source repository or redefine the established machine-memory policy.

- **2026-10-04** — Asked to simplify setup around hosted-app login, a copyable prompt and an Access mini app → chose that entry point and a smaller setup experience, superseding the larger provider-first flow.
- **2026-10-04** — Asked whether the smaller first version should cover only an existing app and GitHub repository → chose existing app + GitHub first, leaving new-project setup, Cloudflare OAuth changes, Artifacts delivery and Cloud picker replacement for later.
- **2026-10-04** — Assumed: GitHub App installation credentials authorize employee assistant operations without a separate employee GitHub login, because app login should be their single identity; native GitHub website membership remains separate.
- **2026-10-04** — Assumed: add allowed emails and share the ordinary app link, with no custom invitation mail sender, because the app itself is now the starting point.
- **2026-10-04** — Assumed: the copied prompt contains routing and instructions only, with credentials handed to the helper privately after app authentication, because pasting reusable keys into assistant history is unnecessary.
- **2026-10-04** — Assumed: fresh memory enrollment stays out of this smaller version, because it needs the separate trusted operator contract and cannot be granted by ordinary app login.

- **2026-10-04** — Assumed: checkpoint the additive owner-activation slice for its required remote checks before continuing, because task 2.1 requires that gate and leaves employee policy/issuance disabled.

- **2026-10-04** — Assumed: distinguish completed source/provider-contract inventories from actual owner/provider acceptance, because the current target lacks verified owner setup and live confirmation remains in task 7.2. The activation slice passed remote app, build, payload and generated-starter checks at 8ba9ab9.

- **2026-10-04** — Grouped related provider, bootstrap, UI and distribution tasks into shared remote-check slices, preserving all named checks and the separate live acceptance gate. This changes checkpoint timing only; no feature or acceptance requirement was removed.
- **2026-10-04** — Task 2.2 adds current primary-snapshot membership checks and explicit route scopes. Source is ready for remote checks; runtime policy remains disabled pending reviewed owner rollout.

- **2026-10-04** — Integrated merged #263 memory-recall baseline without changing independent memory authority. Remote 2.2 checks caught a fixture foreign-key cleanup error; fixed its dependent-row removal order without weakening schema or checks.

- **2026-10-04** — Remote distribution checks found a wiki link to generated install-only Worker configuration. Generalized the reference to its installed path; all script and generated-starter checks passed before that documentation failure. Checks remain unchanged.

- **2026-10-04** — Task 2.2 passed remote app/build/payload checks at `37288ef`, with two fixture/documentation fixes and no loosened checks. Continued to current-grant discovery/readback; the production rollout latch stays disabled.

- **2026-10-04** — Task 2.3 source now filters every discovery representation with current route scopes, and reads frontend app assignments without granting a legacy caller an owner role. Kept the client-only-app test portable across payload installs rather than requiring the meta-only Tips app. Preparing its remote gate.

- **2026-10-04** — Task 2.3 passed remote app/build/distribution checks at `40a7a4c5`, with no gate fixes or loosened checks. Current verification baseline #261 is retained. Continued to the shared owner/provider connection slice 3.1–3.4; rollout and issuance remain disabled.

- **2026-10-04** — Primary GitHub documentation showed that publication inspection requires Secrets read and Environments read for name/metadata listings, which never expose secret values. Narrowed the earlier no-secrets wording to forbid secret modification/employee authority while allowing necessary owner-only inspection permissions in the new manifest, approved by the owner at connection. No existing live grant is expanded; unreadable or unproven publication boundaries remain blocked. Source: https://docs.github.com/en/rest/actions/secrets#list-repository-secrets.

- **2026-10-04** — The owner/provider source slice 3.1–3.4 is ready for its shared remote gate, including durable unknown-write/token outcomes and caller-only setup status. Runtime rollout/issuance remain disabled. Preserved the separate controlled provider acceptance and the production/staging secret-distribution follow-up.

- **2026-10-04** — Integrated merged #265 workflow baseline `1c5c65fe`, retaining current gate diagnosis and mid-build decision handling. Added the required plain consequence of credential revocation to the existing removal description; revocation behavior and scope are unchanged.
