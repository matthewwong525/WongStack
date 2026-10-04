# Design

## Context

See [proposal.md](proposal.md) for the smaller scope. This version starts with a protected, already-running business app and its existing GitHub repository. The installed Worker already verifies Cloudflare Access JWTs, dispatches described and bare business routes, publishes action discovery, and supplies a private company API helper. It has no installed employer roster or per-app policy. The home page currently lists build-time app cards. The helper currently imports installed memory modules and assumes a repository already exists, so it cannot bootstrap an employee from an empty folder.

The old plan's new/existing picker, shared OAuth service, personal Artifacts delivery and Cloud companion are removed. Keep the existing change slug so its review link stays stable. Assume #259 merges as requested and recheck compatible install records; do not treat the managed starter as a GitHub-backed personal installation or change its control plane.

## Goals / Non-Goals

The app's verified human identity is the employee authority for supported API and repository operations. Existing route/record guards, reviewed custom code and repository gates remain conjunctive. Connection setup happens once for the owner; employees receive no provider administration credentials.

The first version has no new sign-in provider, custom invitation mail service, cloud repository picker, native employee GitHub membership, new memory admission, or employee publish role. Repository editing exposes the whole repository and its tracked knowledge, regardless of the employee's runtime app grants.

## Decisions

### 1. Keep membership and authorization inside the existing installation

Use the main Worker's core authorization modules and app D1 database for a pinned installation/owner identity, normalized exact-email roster, stable app IDs, selected-app grants, optional project-editing grant, revisions, pending provider work and sealed token receipts. Do not build a separate membership Worker or shared sign-in service in this version. The existing app is both the starting point and the durable authority.

A trusted owner setup command pins the existing installation, production origin, Access issuer/audience/application IDs, repository numeric ID and verified employer identity. It may consume compatible private installer metadata. A public marker, git email, first visitor, service identity or supplied URL cannot establish an owner. Normalize roster emails, bind sessions to the expected Access issuer/audience and verified identity, and keep removed-member tombstones so stale work cannot restore access. Service tokens never become employee or owner identities.

Owner-only core operations manage connections and membership. The Access mini app is their UI under `app/src/apps/access/` and `app/worker/apps/access/`. Its handlers receive an identity-checked, finite management facade, never raw management secrets. Employer ownership remains separate from ordinary app assignment; prevent self-removal or implicit owner transfer. Employees can read only their own setup/status. No apps are preselected for a new employee; new app IDs remain unassigned until chosen.

### 2. Add people by email and share the normal app link

The owner adds an email, chooses apps and optional editing, then copies the ordinary production app link. No email sender, invitation-token ceremony or secondary account system is needed. Their existing app login proves the employee identity; an unlisted person remains denied even if a broad legacy edge policy permits them through.

Updating the roster queues an exact-email update for the recorded app Access policy. Reuse the established policy/session-reconciliation patterns without taking over unrelated policies or machine credentials. Keep a separate customer-owned Access-only management credential, explicitly scoped to the selected account and the permissions needed for policy updates and application-session revocation. Cloudflare may scope the credential account-wide rather than to one app; disclose that actual scope and constrain calls to pinned app resources. Do not retain or reuse a broad provisioning/deployment token for membership.

The owner configures missing login-management authority through the existing private credential/setup procedure; the UI supplies instructions and safe status, never a token input destined for chat. This initial owner connection is not part of the employee prompt. Missing authority leaves admission pending. Open-login or unverified-owner installs cannot activate private onboarding.

Desired changes and provider results are durable, generation guarded and retryable. No provider success envelope alone establishes readback readiness. Local business permission changes apply immediately once committed; admission and edge session propagation can remain pending and are reported separately. Serialize reconciliation for each installation, read the latest generation after external calls, and converge stale writes on current desired policy. Session revocation can affect remaining users of the app; disclose that they may need to sign in again.

### 3. Use an owner-owned GitHub App for repository operations

Use the GitHub App manifest registration flow on the customer's app origin, followed by installation on the selected existing repository. The owner approves through GitHub's own pages; no agent-browser or copied owner GitHub token. Bind registration/install callbacks to the current verified owner, a short-lived one-use attempt and anti-CSRF state. Privately exchange the manifest code and seal the resulting private key on the customer's installation. Verify App ID, installation, numeric repository ID and granted permissions through GitHub before readiness. An organization may require owner approval; show pending rather than request a larger grant.

Start with Contents write and Pull requests write, plus the read permissions actually needed to inspect checks, runs, statuses, previews and protection. Use Administration read only if the protection API requires it. Owner-side protection inspection may request Secrets read and Environments read only to list names/metadata; these endpoints cannot return secret values. Exclude those inspection permissions from employee tokens. Do not grant Administration write, secrets write, Workflows write, deployment write or ruleset bypass. Verify the exact Git/REST/GraphQL endpoints used by `/continue`, `/save` and preview/check inspection before finishing the adapter. No automatic permission expansion if an endpoint refuses.

An employee with current editing permission receives a distinct installation token restricted explicitly to the one recorded repository and the reviewed permission subset. Do not omit those restrictions and inherit the whole installation grant. GitHub tokens expire after one hour; the private helper renews only after a fresh app authorization check. Store a sealed issuance receipt with employee, private machine record, grant revision and expiry before delivering it. Record the human requester in the app's audit trail; do not imply GitHub attributes every operation to that human. GitHub records installation API work as the App. Git commit author metadata is attribution, not authentication.

GitHub's installation token is not branch scoped and can permit merges under Contents/Pull requests rights. Before issuing editing tokens, verify provider-enforced protection for the publishing/default branch and any deployment triggers so the App cannot bypass owner approval, merge protection or publish via another allowed ref. A UI-only prohibition is insufficient. If the installed provider plan/policies cannot establish that boundary, show project editing blocked until the owner configures an adequate boundary or the plan is revised. Do not silently grant publish authority or modify existing protections. The owner continues publishing through their existing owner workflow; `/ship` on the employee adapter reports owner publication required.

References: [manifest registration](https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest), [installation authentication and attribution](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation), [token creation and revocation](https://docs.github.com/en/rest/apps/apps). Native GitHub website membership remains an independent owner invitation outside this version.

### 4. Copy instructions, authenticate privately, and bootstrap without a clone

The home page and `/apps/access/` self-service view provide one Copy setup prompt action. The prompt names the canonical business origin, the reviewed public bootstrap release/guide and the requested connection. It contains no bearer code, browser cookie, repository token, owner grant or memory credential. Clipboard success is announced; on failure the full prompt remains selectable. Copying does not run a command or grant access.

Publish a small standalone bootstrap artifact with the normal reviewed payload/release machinery. The copied instructions pin its release and digest, fetch it from the documented public Source distribution location and validate those pins before execution. This works before a private repository exists and does not import repository memory modules. Do not execute an unpinned script fetched from a user-supplied app URL. Factor company transport from memory/repository discovery to reuse the existing cloudflared employee-login flow. The employee approves the same business app identity in their browser; an existing browser session often suffices, but a fresh computer or expired session can require another approval. A website cookie cannot simply appear on a remote machine.

The helper pins the HTTPS business origin, verifies current employee identity/readiness, and obtains only the authorized connections. Use the existing employee session for company calls and GitHub-token issuance. Company operations remain selective live discovery, not raw underlying provider API access. An app-only employee gets the small API client with no private repository clone. An editor additionally prepares the pinned existing repository and a private Git credential helper. Existing dirty folders, conflicting remotes or unpushed commits trigger safe resume/select-folder guidance; never reset or provision a replacement project.

All browser sessions, GitHub tokens and machine routing records stay in owner-only OS state outside any checkout. Use pipes/private files and credential callbacks, never token-bearing argv, clone URLs, git remotes, logs, prompt text or tracked configuration. The helper accepts no arbitrary URLs or redirect credential forwarding. GitHub credentials go only to the pinned GitHub repository/API destination; app sessions only to the pinned app origin. Do not inherit GH_TOKEN into builds, business commands, hooks or unrelated subprocesses. Private invocation wrappers provide it only to selected git/gh commands; ordinary personal gh login continues working without global replacement.

Each issuance checks current grants before and after the provider operation. A permission change during issuance denies delivery and queues revocation. Reuse the exact completed private receipt after a lost local response, rather than creating a second token blindly. A lost provider response can leave an unknown token valid until expiry; mark that uncertainty and bound it by provider expiry before declaring full removal. Setup status distinguishes API authenticated, project connected, interrupted and denied; an address alone is not readiness.

### 5. Apply current per-app policy to every business entry point

Once the owner activates the reviewed Access policy, each request loads authoritative current membership and app grants with consistency sufficient to observe acknowledged removals. Do not trust JWT role snapshots, client state, positive cross-request caches, stale replica reads or existing action descriptions. Missing policy or unavailable authority denies business work. A request admitted before removal may finish; subsequent requests and renewals are denied.

Associate mini-app routes with their stable app slug. Inventory existing main business routes and explicitly map each to stable app IDs; actions shared by several apps require all mapped permissions. In `app/worker/apps/index.ts`, `app/worker/api/router.ts` and the shared action dispatcher, authorize both described and bare routes before business work. Unmapped business routes deny employees until reviewed without replacing the implementation. Preserve existing action visibility predicates and record checks conjunctively. Distinguish owner administration, employee self-service, memory/verification protocols and harmless explicitly public routes, instead of assigning everything to a catch-all allowed app.

Use the same evaluated policy for summaries, selected details, OpenAPI, home cards and direct app navigation. Authorize before conditional/ETag responses; don't leak contracts via another caller's or old permitted cache entry. Shell/static bundles can be public to authenticated viewers; hiding a link does not protect data. Private business information stays behind server checks. The self-service Access view stays available to a current employee with zero selected apps; employer management operations remain owner-only and absent from employee action discovery.

Keep existing builds/routing untouched on installs that have not activated this policy. Activation requires reviewed route mapping and employee grants, with missing choices closed. Preserve custom manifest IDs and stricter checks across updates. Do not assign all apps to existing users automatically.

### 6. Withdraw grants and report provider limits

App deselection blocks subsequent app/API calls without logging the person out. Editing removal blocks new GitHub issuance and renewal while preserving assigned business apps. Full removal denies all ordinary/self-service company access immediately, withdraws the exact email from the managed policy and revokes app sessions. Revoke this flow's known distinct GitHub installation tokens using their sealed receipts, retaining retries and expiry deadlines. Token creation/removal races remain pending until every in-flight issuance resolves or its possible token expires. No failure or stale job may restore membership.

Show local denial, edge policy, edge sessions and GitHub token revocation independently. Do not claim instant provider revocation, removal of external native GitHub access or deletion of code already downloaded. Audit connection changes, membership edits and issuance/revocation without secrets. No provider writes in staging previews; test with synthetic connections/identities, then separately verify a controlled live production-like installation with authorization.

### 7. Keep existing memory and credentials separate

The bootstrap preserves an already installed machine-memory client and target. A new employee setup reports memory not connected until trusted operator setup establishes that separate grant. No new memory schema, Devices UI, browser enrollment or app-login-to-memory-authority conversion is in this version. Fresh memory enrollment/removal integration can later consume the published #242 contract as a separately planned change. Removing app membership does not revoke independently installed memory; report that residual scope rather than promise otherwise.

Core Access/GitHub connection credentials and the sealing key are excluded from ordinary mini-app bindings alongside memory. The Access UI calls finite core operations; it cannot export the private key. Mini apps still receive their business bindings. Sharing a Worker is a guard against mistakes, not malicious deployed code: the owner must review code publication, especially editor changes. A separate hardened service is deferred rather than quietly added to this smaller change.

## UX

### Use-case brief

An employee opens the business app to connect their assistant once per computer, usually at a desk; app use is ongoing. An employer changes access when someone joins, changes jobs or leaves, assumed a few times a month. Employer work and browser approvals must also work on a phone. Done means the employee can use their assigned apps and supported API actions, and an approved editor can open the existing repository. Model app/page forms on the existing narrow-column Home and Hello form, using the shared stylesheet and editable branding.

The common employee case is sign in, copy, paste, approve the same app, ready. The common owner case is add email, select apps, save, share link. First-time owner connections and provider failures are secondary states, not part of every employee's setup.

### Flow

Employee: home → Copy setup prompt → existing assistant → app approval if needed → private connection. Self-service setup shows per-surface status and resume instructions. Employer: Access → add/edit person → save → copy app link. Owner first connects login management/GitHub through the Connections section when needed; admission and editing remain unavailable until their independent prerequisites pass.

### Hierarchy

Home/self setup: Copy setup prompt. People: Add person. Add/edit: Save access. Ready admission: Copy link. Connection: Connect GitHub project or Copy owner setup instructions. Removal confirmation: Remove access. Pending/failure: Retry unresolved work. Denied page: Back to your apps. Supporting connection status and optional editing remain quieter than the next action.

### Review

[Review page](review.html). Proposal items Start with your existing app login and Let the assistant finish the connection sketch changed Home and self-service states. Manage people sketches Access list/form/admission states. Connect GitHub once sketches connection approval/readiness. Apply the same permissions sketches denial. Withdraw access sketches removal states. The designs begin at phone width; no additional admin dashboard is needed.

### Components

Reuse the shared brand header, neutral stylesheet, app cards, labeled form controls and announced result pattern. Add app-authorized Home cards, a selectable copy-prompt block, Access people/form/connection sections and concise status/retry rows. Keep owner and employee views within the one Access mini app with server-enforced role checks.

## Risks / Trade-offs

- GitHub installation rights do not encode an employee or a branch restriction → record issuance by person, require provider-enforced publication protection, and disclose App attribution and whole-repository access.
- A one-login experience still needs owner integration and sometimes a new-device browser approval → present them only where needed and avoid promising automatic cookie transfer.
- Provider revocation can fail or propagate slowly → current app policy immediately stops company work/new issuance, with separate truthful revocation and expiry tracking.
- Owner connection secrets share a deployed trust boundary with reviewed app code → exclude them from ordinary bindings and require reviewed publication; do not claim protection against malicious deployed Worker code.
- Custom legacy routes can bypass a guard added only to discovery → inventory and gate both described and bare routes, refusing unmapped employee business routes at activation.
- Existing memory grants survive app removal → state that clearly; fresh enrollment/removal is a later trusted-operator integration, not a login side effect.

## Migration Plan

1. Recheck the merged #259 installation/payload contracts and existing Access issuer/owner identity. Introduce additive app-database tables and a trusted owner activation/setup command without altering custom business data.
2. Ship Access and the standalone API/bootstrap artifact explicitly in the payload manifest/stack pack; other meta-repo mini apps remain unshipped. Plan reviewed updates with existing apps, routes, owners, policies and repository protections inventoried.
3. Activate app permissions only after the owner mapping/grants and core connections are verified. Report missing pieces; do not overwrite connections or broaden provider policies. Open or managed installs stay on their existing authorized control plane until supported separately.
4. Use synthetic preview bindings for UI and denial tests; `/save` runs the required remote checks and supplies deployed preview evidence. Perform explicit controlled acceptance for owner GitHub approval, actual employee login, empty-folder setup, renewal and removal before claiming ready.
5. Rollback disables new issuance and preserves current denial/tombstones and tracked revocation work. Deploy a compatible policy-enforcing version; reverting to pre-policy code would restore access and is not an acceptable automatic rollback. Revoke integration tokens and remove only this change's provider resources when retiring it.
