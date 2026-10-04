# Sign in and connect your assistant

**Status:** in-progress
**Branch:** smooth-repo-selection
**Open questions:** no remaining scope choices; actual owner/login acceptance still needs controlled installation authority.

## Why

Employees should start from the business app they already use, copy one setup prompt and connect their assistant to the apps they are allowed to use. The employer should control those permissions in one small app.

## What Changes

- **Copy a setup prompt after signing in.** Employees paste it into their assistant, approve the same business login on that computer when needed, and connect to their allowed company API actions. The prompt contains no keys. A failed clipboard action leaves the text available to copy by hand.
  ```text
  HOME: BEFORE          HOME: AFTER
  ┌─────────────────┐   ┌──────────────────────┐
  │ Your workspace  │   │ Your workspace       │
  │ App list        │   │ Connect assistant    │
  └─────────────────┘   │ [Copy setup prompt]  │
                        │ Your allowed apps    │
                        └──────────────────────┘

  Sign in → Copy prompt → Paste → Approve
                                      ↓
                              Company API ready
  ```
- **Manage people and apps in Access.** The employer adds an email, chooses the apps that person can use and shares the ordinary business app link. No apps are selected automatically. Employees see their own setup status; the employer sees people, login setup and pending changes.
  ```text
  ACCESS: OWNER
  ┌──────────────────────────────────┐
  │ Access              [Add person] │
  │ Bo · Orders             [Edit]   │
  │ Login management: Ready          │
  └──────────────────────────────────┘

  ADD / EDIT PERSON
  ┌──────────────────────────────────┐
  │ Email  [bo@example.com       ]   │
  │ Apps   [x] Orders  [ ] Payroll   │
  │ [Save access]                    │
  │ Admission pending · [Retry]      │
  │ [Copy app link]                  │
  └──────────────────────────────────┘

  ACCESS: EMPLOYEE
  ┌──────────────────────────────────┐
  │ Connect your assistant           │
  │ API: Ready                       │
  │ Apps: Orders                     │
  │ [Copy setup prompt]              │
  │ Repository: Set up separately    │
  │ Memory: Separate setup           │
  └──────────────────────────────────┘
  ```
- **Apply the same app permissions everywhere.** App pages, direct API calls and assistant actions use the same current permissions. Removing an app permission blocks the next request, including during an existing login. Existing stricter record checks remain in force.
  ```text
  Orders allowed → page / API / assistant ✓
  Payroll denied → page / API / assistant ✕
  ```
- **Show pending login changes honestly.** The app updates its recorded Cloudflare email policy and reports policy changes and session removal separately. Removal blocks company API work immediately; provider failures stay visible and retryable. Session removal can require teammates to sign in again.
  ```text
  REMOVE PERSON
  ┌──────────────────────────────────┐
  │ Remove Bo's app access?          │
  │ [Remove access]     [Cancel]     │
  │ App/API: Blocked                 │
  │ Login policy: Removal pending    │
  │ Sessions: Removal pending        │
  │ [Retry]                          │
  └──────────────────────────────────┘
  ```
- **Keep repository access manual.** App login grants no GitHub or Cloudflare Artifacts repository access. The employer grants repository access through that provider, and employees authenticate there separately. Access does not manage or revoke those grants. Existing memory setup also stays separate.
- **Build first, verify at the end.** Complete the remaining implementation before running tests, then run the required checks and review the finished preview. Repairs repeat only the checks needed to resolve an actual failure.

**Non-goals:** repository invitations, GitHub App registration or token issuance, private Git/PR adapters, Artifacts automation, new-project setup, Cloudflare OAuth changes, hosting administration, custom invitation email, per-record business roles or fresh memory enrollment.

## Capabilities

### New Capabilities

None; the earlier source checkpoints already introduced employee onboarding in this branch.

### Modified Capabilities

- `employee-onboarding`: app-login-based API setup and Access permissions; remove automatic repository access and leave repository authentication manual.
- `company-api`: current selected-app permissions govern both described and legacy business routes while preserving stricter checks.
- `agent-api-discovery`: current permissions filter action summaries, details and OpenAPI.
- `cloudflare-provisioning`: private production Access bindings are omitted from staging, and both push targets are validated before the first provider write; ordinary secret/binding parity remains required.
- `mini-apps`: permitted app navigation, owner/employee Access views and private login-management binding exclusions.

## Impact

Existing Source app: core authorization/login management, Access mini app, home setup action, standalone company API helper, additive migrations, payload inventory, owning documentation and tests. Remove withdrawn GitHub automation and its dependencies from this unshipped change; preserve existing personal GitHub workflows and customer data. No Cloud companion or new sign-in service is added.

Completed source-check evidence remains in [source-checks.md](source-checks.md). Those passes establish the earlier backend baseline, not completion of the reduced feature. Existing memory authority remains separate. Controlled live login/employee acceptance requires independently verified installation authority and must not be claimed from synthetic tests.

## Decision log

- **2026-10-04** — Asked to support Cloudflare only and require manual GitHub access → chose manual GitHub admission/authentication, superseding automatic GitHub App registration, employee credential issuance and the special GitHub repository adapter. Cloudflare Artifacts versus app/API-only scope remains pending clarification; preserve completed source evidence without treating withdrawn GitHub features as remaining work. Remaining work should use fewer shared verification checkpoints rather than a full remote gate after each small task.

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

- **2026-10-04** — The shared 3.4 gate found three oversized functions and an unescaped workflow-expression fixture. Split focused checks/owner dispatch and corrected the fixture without changing behavior or limits. Retain CI coverage metadata for precise diagnosis; all coverage requirements remain unchanged.

- **2026-10-04** — Check: `.github/workflows/test.yml` adds retained coverage-map diagnostics after the existing suite; no check, failure outcome or threshold is loosened. The workflow-setting detector requires this record because a diagnostic upload step changes the check configuration.

- **2026-10-04** — Asked: the person approved continuing after the stopped connection gate. Resume the same change, consolidate bounded decoding without changing wire errors or checks, then complete bootstrap, Access screens, distribution and reviewable verification.

- **2026-10-04** — The bootstrap/transport source slice uses one dependency-free Node artifact, distributed at an immutable checked public Source commit plus SHA-256 digest; no existing GitHub release asset is assumed. Private folder locators preserve the same connection after cloning. Finite owner identity supports closed-rollout resume without claiming employee readiness. The employee REST adapter keeps read-only Actions and refuses unsupported reruns/comment writes; missing log archives and thread-resolution counts require the owner path. Employee publication stops before archive/numbering. Tasks 4.1–4.3 await their shared remote gate, and live no-GitHub/provider acceptance remains 7.2.

- **2026-10-04** — Asked whether Cloudflare-only setup includes Artifacts repository automation → chose app/API access only; all repository grants and authentication stay manual. This supersedes the existing GitHub-only and automatic repository connection scope.
- **2026-10-04** — Asked to pass the findings to the other chat and to run tests only at the end → chose complete implementation followed by one final required source checkpoint and preview verification, with no per-task test or save checkpoints. Shared measured timings and this instruction with the verification and original implementation chats.

- **2026-10-04** — Check: remove dedicated unshipped GitHub registration/publication/token and private Git/PR adapter tests with the withdrawn implementations. Retained employee policy/discovery/login, personal GitHub delivery, app coverage, lint and distribution checks stay unchanged; author replacement API-only connection/UI/pin/staging-exclusion regression tests before the single final gate.

- **2026-10-04** — Assumed: at the single final source checkpoint, create a complete source ancestor, pin its bootstrap commit/digest in the final head and push once. Final distribution checks prove ancestor bytes/digest match the checked bootstrap; public raw readback follows the successful gate. Blank pins honestly leave setup unavailable until that checkpoint.

- **2026-10-04** — Completed all remaining app/API-only source, regression tests and owning documentation before any checks. Reconciled the reduced contracts, including production-only login authority in secret distribution. The single final source checkpoint will check the complete implementation; actual controlled human login/provider acceptance remains separate.

- **2026-10-04** — Integrated merged #268 drawing baseline (30.9.0) and preserved its release notes. Final source head pins the unchanged standalone bootstrap to ancestor `3e739ca8f82f7df90916ba0d31c078948682b5ba` and SHA-256 `2182ca2abac0e9b4163b60cedac38a830e1646a76dfa4fd717a6d45a1f4e35c4`; final checks and public readback must establish those exact bytes before calling distribution ready.

- **2026-10-04** — Check: `app/tsconfig.worker.json` enables typed JSON imports for the reviewed bootstrap release pins. No type strictness, test, lint, coverage or duplication requirement is lowered. Condensed this change's payload inventory wording after the combined instruction-byte check exceeded its unchanged limit.
